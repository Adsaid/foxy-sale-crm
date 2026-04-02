import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const users = await prisma.user.findMany({
    where: { accountStatus: "PENDING", teamId: tg.teamId },
    include: { technologies: true },
    orderBy: { createdAt: "desc" },
  });

  const safe = users.map(({ password: _, ...u }) => u);
  return NextResponse.json(safe);
}
