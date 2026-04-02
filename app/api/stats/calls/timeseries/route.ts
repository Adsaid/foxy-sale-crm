import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { buildCallTimeseriesPoints } from "@/lib/call-stats-timeseries";
import { sanitizeTimeZone } from "@/lib/stats-buckets-tz";
import { resolveCallStatsFilters } from "@/lib/stats-calls-request";
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

  const rows = await prisma.callEvent.findMany({
    where: scopedCallWhere,
    select: { callStartedAt: true, outcome: true },
  });

  const timeZone = sanitizeTimeZone(searchParams.get("timeZone"));
  const granularity = searchParams.get("granularity") === "hour" ? "hour" : "day";

  const points = buildCallTimeseriesPoints(rows, rangeFrom, rangeTo, explicitDateFilter, {
    timeZone,
    granularity,
  });
  return NextResponse.json({ points });
}