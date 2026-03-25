import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error, user } = await getApiUser(["DEV"]);
  if (error) return error;

  const [totalAssigned, completed, successCalls] = await Promise.all([
    prisma.callEvent.count({ where: { callerId: user!.id } }),
    prisma.callEvent.count({ where: { callerId: user!.id, status: "COMPLETED" } }),
    prisma.callEvent.count({ where: { callerId: user!.id, outcome: "SUCCESS" } }),
  ]);

  return NextResponse.json({
    totalAssigned,
    completed,
    successRate: completed > 0 ? Math.round((successCalls / completed) * 100) : 0,
    pending: totalAssigned - completed,
  });
}
