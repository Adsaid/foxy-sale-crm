import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teams = await prisma.team.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  return NextResponse.json({ items: teams });
}
