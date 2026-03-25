import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error, user } = await getApiUser(["SALES"]);
  if (error) return error;

  const [totalCalls, completedCalls, successCalls, unsuccessfulCalls, totalAccounts] =
    await Promise.all([
      prisma.callEvent.count({ where: { createdById: user!.id } }),
      prisma.callEvent.count({ where: { createdById: user!.id, status: "COMPLETED" } }),
      prisma.callEvent.count({ where: { createdById: user!.id, outcome: "SUCCESS" } }),
      prisma.callEvent.count({ where: { createdById: user!.id, outcome: "UNSUCCESSFUL" } }),
      prisma.account.count({ where: { ownerId: user!.id } }),
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
