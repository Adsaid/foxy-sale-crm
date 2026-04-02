import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await getApiUser(["SUPER_ADMIN"], { request });
  if (error) return error;

  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id } });
  if (!team) {
    return NextResponse.json({ error: "Команду не знайдено" }, { status: 404 });
  }
  if (team.status === "APPROVED") {
    return NextResponse.json({ success: true });
  }

  await prisma.team.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
