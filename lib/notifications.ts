import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  sendTelegramNotification,
  sendTelegramToAllAdmins,
} from "@/lib/telegram";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  payload?: Prisma.InputJsonValue;
  dedupeKey?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const result = await prisma.notification.create({ data: { ...input, readAt: null } });
  sendTelegramNotification(input.userId, input.title, input.message).catch(
    (err) => console.error("[telegram] notify", err)
  );
  return result;
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  const result = await prisma.notification.createMany({ data: inputs.map((i) => ({ ...i, readAt: null })) });
  for (const input of inputs) {
    sendTelegramNotification(input.userId, input.title, input.message).catch(
      (err) => console.error("[telegram] notify", err)
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
