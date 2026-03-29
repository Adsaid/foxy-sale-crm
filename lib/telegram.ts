import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function tgApi(method: string) {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
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
  message: string
): Promise<void> {
  if (!BOT_TOKEN) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true },
  });
  if (!user?.telegramChatId) return;
  const text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;
  await sendTelegramMessage(user.telegramChatId, text);
}

/**
 * Надіслати сповіщення в Telegram кільком користувачам одразу.
 */
export async function sendTelegramNotifications(
  userIds: string[],
  title: string,
  message: string
): Promise<void> {
  if (!BOT_TOKEN || userIds.length === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  const text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;
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
  message: string
): Promise<void> {
  if (!BOT_TOKEN) return;
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  if (admins.length === 0) return;
  const text = `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(message)}`;
  await Promise.allSettled(
    admins.map((a) => sendTelegramMessage(a.telegramChatId!, text))
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
