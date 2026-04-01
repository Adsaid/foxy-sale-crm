import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { error } = await getApiUser(["SUPER_ADMIN"], { request });
  if (error) return error;

  const teams = await prisma.team.findMany({
    where: { status: "PENDING" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      createdByUserId: true,
      createdByName: true,
      createdByEmail: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(teams);
}
