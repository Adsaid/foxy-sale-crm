import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { buildCallTimeseriesPoints } from "@/lib/call-stats-timeseries";
import { sanitizeTimeZone } from "@/lib/stats-buckets-tz";
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

  const { callWhere, explicitDateFilter, rangeFrom, rangeTo } = resolved;

  const rows = await prisma.callEvent.findMany({
    where: callWhere,
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