import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import {
  buildCallTimeseriesPoints,
  expandRangeWithAdvanceOccurredAt,
  mergeAdvancesIntoPoints,
} from "@/lib/call-stats-timeseries";
import { sanitizeTimeZone } from "@/lib/stats-buckets-tz";
import { resolveCallStatsFilters, buildAdvanceWhere } from "@/lib/stats-calls-request";
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

  const { callWhere, explicitDateFilter, rangeFrom, rangeTo } = resolved;
  const scopedCallWhere = { ...callWhere, teamId: tg.teamId };
  const advanceWhere = { ...buildAdvanceWhere(callWhere), teamId: tg.teamId };

  const [rows, advances] = await Promise.all([
    prisma.callEvent.findMany({
      where: scopedCallWhere,
      select: { callStartedAt: true, outcome: true },
    }),
    prisma.callNextStageEvent.findMany({
      where: advanceWhere,
      select: { occurredAt: true },
    }),
  ]);

  const timeZone = sanitizeTimeZone(searchParams.get("timeZone"));
  const granularity = searchParams.get("granularity") === "hour" ? "hour" : "day";

  const { rangeFrom: axisFrom, rangeTo: axisTo } = expandRangeWithAdvanceOccurredAt(
    rangeFrom,
    rangeTo,
    advances,
    explicitDateFilter
  );

  const points = buildCallTimeseriesPoints(rows, axisFrom, axisTo, explicitDateFilter, {
    timeZone,
    granularity,
  });

  mergeAdvancesIntoPoints(
    points,
    advances,
    timeZone,
    granularity,
    explicitDateFilter,
    axisFrom,
    axisTo
  );

  return NextResponse.json({ points });
}