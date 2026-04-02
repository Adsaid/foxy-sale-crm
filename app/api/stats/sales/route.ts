import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike } from "@/lib/roles";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const callWhere = isSalesLike(user!.role)
    ? { teamId: tg.teamId }
    : { createdById: user!.id, teamId: tg.teamId };
  const accountWhere =
    user!.role === "ADMIN" || user!.role === "SUPER_ADMIN"
      ? { teamId: tg.teamId }
      : { ownerId: user!.id, teamId: tg.teamId };

  const [totalCalls, completedCalls, successCalls, unsuccessfulCalls, totalAccounts] =
    await Promise.all([
      prisma.callEvent.count({ where: callWhere }),
      prisma.callEvent.count({ where: { ...callWhere, status: "COMPLETED" } }),
      prisma.callEvent.count({ where: { ...callWhere, outcome: "SUCCESS" } }),
      prisma.callEvent.count({ where: { ...callWhere, outcome: "UNSUCCESSFUL" } }),
      prisma.account.count({ where: accountWhere }),
    ]);

  return NextResponse.json({
    totalCalls,
    completedCalls,
    successCalls,
    unsuccessfulCalls,
    pendingCalls: totalCalls - completedCalls,
    totalAccounts,
  });
}
