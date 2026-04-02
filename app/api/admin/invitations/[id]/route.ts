import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await getApiUser(["ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  if (!user?.activeTeamId) {
    return NextResponse.json({ error: "Оберіть команду" }, { status: 400 });
  }

  const { id } = await params;

  const existing = await prisma.invitation.findFirst({ where: { id, teamId: user.activeTeamId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.usedAt) {
    return NextResponse.json(
      { error: "Неможливо видалити вже використане запрошення" },
      { status: 400 },
    );
  }

  await prisma.invitation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

