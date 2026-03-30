import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    where: { accountStatus: "PENDING" },
    include: { technologies: true },
    orderBy: { createdAt: "desc" },
  });

  const safe = users.map(({ password: _, ...u }) => u);
  return NextResponse.json(safe);
}
