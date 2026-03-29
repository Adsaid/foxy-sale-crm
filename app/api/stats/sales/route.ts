import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike } from "@/lib/roles";

export async function GET() {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const callWhere = isSalesLike(user!.role) ? {} : { createdById: user!.id };
  const accountWhere =
    user!.role === "ADMIN" ? {} : { ownerId: user!.id };

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
