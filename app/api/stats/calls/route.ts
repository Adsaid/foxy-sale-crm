import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import {
  resolveCallStatsFilters,
  buildSummaryWhereForStats,
  buildAdvanceWhere,
} from "@/lib/stats-calls-request";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tg = teamGuardResponse(user);
  if (tg.error) return tg.error;

  const { searchParams } = new URL(request.url);
  const resolved = await resolveCallStatsFilters(searchParams, user);
  if (!resolved.ok) return resolved.response;

  const { callWhere } = resolved;
  const scopedCallWhere = { ...callWhere, teamId: tg.teamId };
  const summaryWhere = { ...buildSummaryWhereForStats(callWhere), teamId: tg.teamId };
  const advanceWhere = { ...buildAdvanceWhere(callWhere), teamId: tg.teamId };

  const [
    totalEventCalls,
    completedEventCalls,
    successEventCalls,
    unsuccessfulEventCalls,
    pendingEventCalls,
    cancelledEventCalls,
    summaryRows,
    nextStageAdvances,
  ] = await Promise.all([
    prisma.callEvent.count({ where: { ...scopedCallWhere, status: { in: ["COMPLETED", "SCHEDULED", "CANCELLED"] } } }),
    prisma.callEvent.count({ where: { ...scopedCallWhere, status: "COMPLETED" } }),
    prisma.callEvent.count({ where: { ...scopedCallWhere, outcome: "SUCCESS" } }),
    prisma.callEvent.count({ where: { ...scopedCallWhere, outcome: "UNSUCCESSFUL" } }),
    prisma.callEvent.count({ where: { ...scopedCallWhere, outcome: "PENDING" } }),
    prisma.callEvent.count({ where: { ...scopedCallWhere, outcome: "CANCELLED" } }),
    prisma.callSummary.findMany({
      where: summaryWhere,
      select: {
        callEventId: true,
        status: true,
        outcome: true,
      },
    }),
    prisma.callNextStageEvent.count({ where: advanceWhere }),
  ]);

  const linkedSummaryCallEventIds = Array.from(
    new Set(summaryRows.map((row) => row.callEventId).filter((id): id is string => Boolean(id)))
  );
  const existingLinkedCalls = linkedSummaryCallEventIds.length
    ? await prisma.callEvent.findMany({
        where: { id: { in: linkedSummaryCallEventIds }, teamId: tg.teamId },
        select: { id: true },
      })
    : [];
  const existingLinkedCallIds = new Set(existingLinkedCalls.map((row) => row.id));

  const dedupedSummaryRows = summaryRows.filter(
    (row) => !row.callEventId || !existingLinkedCallIds.has(row.callEventId)
  );

  let totalDedupedSummaryCalls = 0;
  let completedDedupedSummaryCalls = 0;
  let successDedupedSummaryCalls = 0;
  let unsuccessfulDedupedSummaryCalls = 0;
  let pendingDedupedSummaryCalls = 0;
  let cancelledDedupedSummaryCalls = 0;

  for (const row of dedupedSummaryRows) {
    if (row.status === "COMPLETED" || row.status === "SCHEDULED" || row.status === "CANCELLED") {
      totalDedupedSummaryCalls += 1;
    }
    if (row.status === "COMPLETED") {
      completedDedupedSummaryCalls += 1;
    }
    if (row.outcome === "SUCCESS") {
      successDedupedSummaryCalls += 1;
    } else if (row.outcome === "UNSUCCESSFUL") {
      unsuccessfulDedupedSummaryCalls += 1;
    } else if (row.outcome === "PENDING") {
      pendingDedupedSummaryCalls += 1;
    } else if (row.outcome === "CANCELLED") {
      cancelledDedupedSummaryCalls += 1;
    }
  }

  const totalCalls = totalEventCalls + totalDedupedSummaryCalls + nextStageAdvances;
  const completedCalls = completedEventCalls + completedDedupedSummaryCalls + nextStageAdvances;
  const successCalls = successEventCalls + successDedupedSummaryCalls + nextStageAdvances;
  const unsuccessfulCalls = unsuccessfulEventCalls + unsuccessfulDedupedSummaryCalls;
  const pendingCalls = pendingEventCalls + pendingDedupedSummaryCalls;
  const cancelledCalls = cancelledEventCalls + cancelledDedupedSummaryCalls;

  return NextResponse.json({
    totalCalls,
    completedCalls,
    successCalls,
    unsuccessfulCalls,
    pendingCalls,
    cancelledCalls,
    nextStageAdvances,
  });
}
