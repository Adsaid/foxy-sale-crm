import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Публічна перевірка коду запрошення перед показом форми реєстрації. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Код не вказано" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { code },
    select: {
      email: true,
      role: true,
      usedAt: true,
    },
  });

  if (!invitation || invitation.usedAt) {
    return NextResponse.json(
      { error: "Недійсне або вже використане запрошення" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
  });
}
