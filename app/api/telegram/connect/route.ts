import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { randomBytes } from "crypto";

export async function POST() {
  const { error, user } = await getApiUser();
  if (error) return error;

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 хвилин

  await prisma.telegramLinkToken.deleteMany({ where: { userId: user!.id } });

  await prisma.telegramLinkToken.create({
    data: {
      userId: user!.id,
      token,
      expiresAt,
    },
  });

  const botUsername = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ?? "")
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/\/$/, "");

  const deepLink = botUsername
    ? `https://t.me/${botUsername}?start=${token}`
    : null;

  return NextResponse.json({ deepLink, token });
}

export async function GET() {
  const { error, user } = await getApiUser();
  if (error) return error;

  const u = await prisma.user.findUnique({
    where: { id: user!.id },
    select: { telegramChatId: true },
  });

  return NextResponse.json({ connected: !!u?.telegramChatId });
}

export async function DELETE() {
  const { error, user } = await getApiUser();
  if (error) return error;

  await prisma.user.update({
    where: { id: user!.id },
    data: { telegramChatId: null },
  });

  return NextResponse.json({ disconnected: true });
}
