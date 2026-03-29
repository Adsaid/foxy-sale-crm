import { prisma } from "@/lib/prisma";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const CRM_FRAME_SEPARATOR = "-----------------";

function tgApi(method: string) {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

function getCrmBaseUrlTrimmed(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, "");
}

/** Рамка для HTML-повідомлень бота (розділювач + тіло + посилання на CRM). */
function wrapTelegramCrmFrameHtml(innerHtml: string): string {
  const base = getCrmBaseUrlTrimmed();
  const sep = escapeHtml(CRM_FRAME_SEPARATOR);
  let out = `${sep}<br><br>${innerHtml}`;
  if (base) {
    const href = escapeHtml(base);
    const label = escapeHtml("Foxy Sale CRM");
    out += `<br><br><a href="${href}">${label}</a>`;
  }
  return out;
}

function wrapTelegramCrmFramePlain(inner: string): string {
  const base = getCrmBaseUrlTrimmed();
  let out = `${CRM_FRAME_SEPARATOR}\n\n${inner}`;
  if (base) {
    out += `\n\n${base}`;
  }
  return out;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
  options?: { parseMode: "HTML" | null; skipCrmFrame?: boolean }
): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  const parseMode = options?.parseMode === null ? undefined : "HTML";
  const isPlain = options?.parseMode === null;
  const framed =
    options?.skipCrmFrame === true
      ? text
      : isPlain
        ? wrapTelegramCrmFramePlain(text)
        : wrapTelegramCrmFrameHtml(text);
  try {
    const res = await fetch(tgApi("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: framed,
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
  const text = `<b>${escapeHtml(title)}</b>\n\n${formatTelegramNotificationBodyHtml(message, options?.actorName)}`;
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
  const text = `<b>${escapeHtml(title)}</b>\n\n${formatTelegramNotificationBodyHtml(message, options?.actorName)}`;
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
  options?: { actorName?: string | null }
): Promise<void> {
  if (!BOT_TOKEN) return;
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  if (admins.length === 0) return;
  const text = `<b>${escapeHtml(title)}</b>\n\n${formatTelegramNotificationBodyHtml(message, options?.actorName)}`;
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
