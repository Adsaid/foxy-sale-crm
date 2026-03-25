import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { technologies: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }

  const { password: _, ...safeUser } = user;

  return NextResponse.json({ user: safeUser });
}
