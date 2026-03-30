import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.invitation.findUnique({ where: { id } });
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

