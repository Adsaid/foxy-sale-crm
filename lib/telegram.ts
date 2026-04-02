import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/** Якщо `NEXT_PUBLIC_BASE_URL` не задано — збіг з продакшен-деплоєм. */
const DEFAULT_CRM_PUBLIC_ORIGIN = "https://sale-crm-nine.vercel.app";

function tgApi(method: string) {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getCrmPublicOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return DEFAULT_CRM_PUBLIC_ORIGIN;
}

/** HTML-футер: клікабельне посилання на CRM (для parse_mode HTML). */
export function telegramCrmLinkFooterHtml(): string {
  const origin = getCrmPublicOrigin();
  const href = escapeHtml(origin);
  return `\n\n<a href="${href}">${escapeHtml("Відкрити Foxy Sale CRM")}</a>`;
}

export function appendTelegramCrmLinkFooter(htmlBody: string): string {
  return `${htmlBody}${telegramCrmLinkFooterHtml()}`;
}

/**
 * Тіло сповіщення в HTML: якщо перший рядок починається з ПІБ сейла/дева — виділяємо його <b>.
 * Кастомні кольори бейджа в Telegram Bot API (HTML) не підтримуються — лише жирний/курсив/код тощо.
 */
export function formatTelegramNotificationBodyHtml(
  message: string,
  actorName?: string | null
): string {
  const actor = actorName?.trim();
  if (actor && message.startsWith(actor)) {
    return `<b>${escapeHtml(actor)}</b>${escapeHtml(message.slice(actor.length))}`;
  }
  return escapeHtml(message);
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parseMode: "HTML" | null }
): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  const parseMode = options?.parseMode === null ? undefined : "HTML";
  try {
    const res = await fetch(tgApi("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(parseMode ? { parse_mode: parseMode } : {}),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[telegram] sendMessage error", err);
    return false;
  }
}

/** Plain text (без parse_mode), для довгих звітів. */
export async function sendTelegramPlainMessage(
  chatId: string,
  text: string
): Promise<boolean> {
  return sendTelegramMessage(chatId, text, { parseMode: null });
}

/**
 * Надіслати сповіщення у Telegram конкретному користувачу CRM (за userId).
 * Якщо у нього немає telegramChatId — нічого не робить.
 */
export async function sendTelegramNotification(
  userId: string,
  title: string,
  message: string,
  options?: { actorName?: string | null }
): Promise<void> {
  if (!BOT_TOKEN) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });
  if (!user?.telegramChatId) return;
  const text = appendTelegramCrmLinkFooter(
    `<b>${escapeHtml(title)}</b>\n\n${formatTelegramNotificationBodyHtml(message, options?.actorName)}`
  );
  await sendTelegramMessage(user.telegramChatId, text);
}

/**
 * Надіслати сповіщення в Telegram кільком користувачам одразу.
 */
export async function sendTelegramNotifications(
  userIds: string[],
  title: string,
  message: string,
  options?: { actorName?: string | null }
): Promise<void> {
  if (!BOT_TOKEN || userIds.length === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  const text = appendTelegramCrmLinkFooter(
    `<b>${escapeHtml(title)}</b>\n\n${formatTelegramNotificationBodyHtml(message, options?.actorName)}`
  );
  await Promise.allSettled(
    users
      .filter((u) => u.telegramChatId)
      .map((u) => sendTelegramMessage(u.telegramChatId!, text))
  );
}

/**
 * Надіслати сповіщення усім адмінам у Telegram.
 */
export async function sendTelegramToAllAdmins(
  title: string,
  message: string,
  options?: { actorName?: string | null; teamId?: string | null }
): Promise<void> {
  if (!BOT_TOKEN) return;
  const teamId = options?.teamId ?? null;
  const where =
    teamId != null
      ? {
          telegramChatId: { not: null as string | null },
          OR: [{ role: "ADMIN" as const, teamId }, { role: "SUPER_ADMIN" as const }],
        }
      : {
          telegramChatId: { not: null as string | null },
          OR: [{ role: "ADMIN" as const }, { role: "SUPER_ADMIN" as const }],
        };
  const admins = await prisma.user.findMany({
    where,
    select: { telegramChatId: true },
  });
  if (admins.length === 0) return;
  const text = appendTelegramCrmLinkFooter(
    `<b>${escapeHtml(title)}</b>\n\n${formatTelegramNotificationBodyHtml(message, options?.actorName)}`
  );
  await Promise.allSettled(
    admins.map((a) => sendTelegramMessage(a.telegramChatId!, text))
  );
}

export async function setTelegramWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
  if (!BOT_TOKEN) return { ok: false, description: "No TELEGRAM_BOT_TOKEN" };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const res = await fetch(tgApi("setWebhook"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      ...(secret ? { secret_token: secret } : {}),
    }),
  });
  return res.json();
}
