import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  sendTelegramNotification,
  sendTelegramPlainMessage,
  sendTelegramToAllAdmins,
} from "@/lib/telegram";
import { chunkTelegramPlainParts } from "@/lib/sales-account-report";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  payload?: Prisma.InputJsonValue;
  dedupeKey?: string;
  /** Якщо true — лише запис у БД; Telegram окремо (наприклад довгі звіти). */
  skipTelegram?: boolean;
}

export async function createNotification(input: CreateNotificationInput) {
  const { skipTelegram, ...data } = input;
  const result = await prisma.notification.create({ data: { ...data, readAt: null } });
  if (!skipTelegram) {
    sendTelegramNotification(data.userId, data.title, data.message).catch((err) =>
      console.error("[telegram] notify", err)
    );
  }
  return result;
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  const rows = inputs.map((input) => {
    const { skipTelegram: _skip, ...rest } = input;
    void _skip;
    return { ...rest, readAt: null as Date | null };
  });
  const result = await prisma.notification.createMany({ data: rows });
  for (const input of inputs) {
    if (input.skipTelegram) continue;
    sendTelegramNotification(input.userId, input.title, input.message).catch((err) =>
      console.error("[telegram] notify", err)
    );
  }
  return result;
}

/** Усім користувачам з роллю ADMIN (без dedupeKey — для кожного окремий запис). */
export async function notifyAllAdmins(
  input: Omit<CreateNotificationInput, "userId" | "dedupeKey">
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await createNotifications(
    admins.map((a) => ({
      ...input,
      userId: a.id,
    }))
  );
  sendTelegramToAllAdmins(input.title, input.message).catch(
    (err) => console.error("[telegram] notifyAdmins", err)
  );
}

export const NOTIFICATION_TYPE_ACCOUNTS_REPORT_SUBMITTED = "ACCOUNTS_REPORT_SUBMITTED";

/** CRM: коротке повідомлення; Telegram: plain, кілька частин за потреби. */
export async function notifyAdminsSalesAccountReport(opts: {
  reportId: string;
  salesFirstName: string;
  salesLastName: string;
  telegramBody: string;
}): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;

  const name = `${opts.salesFirstName} ${opts.salesLastName}`.trim();
  const title = "Звіт по акаунтах";
  const message = `${name} надіслав(ла) звіт по акаунтах.`;

  await createNotifications(
    admins.map((a) => ({
      userId: a.id,
      type: NOTIFICATION_TYPE_ACCOUNTS_REPORT_SUBMITTED,
      title,
      message,
      payload: { reportId: opts.reportId },
      skipTelegram: true,
    }))
  );

  const intro = `📋 ${title}\n${message}`;
  const parts = chunkTelegramPlainParts(intro, opts.telegramBody);

  const tgAdmins = await prisma.user.findMany({
    where: { role: "ADMIN", telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });

  for (const { telegramChatId } of tgAdmins) {
    if (!telegramChatId) continue;
    for (const part of parts) {
      await sendTelegramPlainMessage(telegramChatId, part);
    }
  }
}
