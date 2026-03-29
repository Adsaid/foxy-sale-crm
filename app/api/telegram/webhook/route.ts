import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendTelegramCrmLinkFooter, escapeHtml, sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== secret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = body.message as
    | { chat?: { id?: number }; text?: string }
    | undefined;

  if (!message?.chat?.id || !message.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    const token = parts[1] ?? "";

    if (!token) {
      await sendTelegramMessage(
        chatId,
        appendTelegramCrmLinkFooter(
          escapeHtml(
            "Вітаю! Щоб підключити сповіщення, натисніть кнопку «TelegramBot» у CRM — вона містить унікальне посилання для прив'язки."
          )
        )
      );
      return NextResponse.json({ ok: true });
    }

    const pending = await prisma.telegramLinkToken.findUnique({
      where: { token },
    });

    if (!pending || pending.expiresAt < new Date()) {
      await sendTelegramMessage(
        chatId,
        appendTelegramCrmLinkFooter(
          escapeHtml(
            "Посилання недійсне або прострочене. Спробуйте згенерувати нове у CRM."
          )
        )
      );
      return NextResponse.json({ ok: true });
    }

    await prisma.user.update({
      where: { id: pending.userId },
      data: { telegramChatId: chatId },
    });

    await prisma.telegramLinkToken.delete({ where: { id: pending.id } });

    await sendTelegramMessage(
      chatId,
      appendTelegramCrmLinkFooter(
        escapeHtml(
          "Telegram успішно підключено до CRM! Тепер ви будете отримувати сповіщення тут."
        )
      )
    );

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
