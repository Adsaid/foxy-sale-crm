import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { resolveCallStatsFilters } from "@/lib/stats-calls-request";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "DEV", "ADMIN"]);
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resolved = await resolveCallStatsFilters(searchParams, user);
  if (!resolved.ok) return resolved.response;

  const { callWhere } = resolved;

  const [totalCalls, completedCalls, successCalls, unsuccessfulCalls] = await Promise.all([
    prisma.callEvent.count({ where: callWhere }),
    prisma.callEvent.count({ where: { ...callWhere, status: "COMPLETED" } }),
    prisma.callEvent.count({ where: { ...callWhere, outcome: "SUCCESS" } }),
    prisma.callEvent.count({ where: { ...callWhere, outcome: "UNSUCCESSFUL" } }),
  ]);

  return NextResponse.json({
    totalCalls,
    completedCalls,
    successCalls,
    unsuccessfulCalls,
    pendingCalls: totalCalls - completedCalls,
  });
}
