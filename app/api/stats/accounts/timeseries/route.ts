import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { buildAccountTimeseriesPoints } from "@/lib/account-stats-timeseries";
import { sanitizeTimeZone } from "@/lib/stats-buckets-tz";
import { resolveAccountStatsFilters } from "@/lib/stats-accounts-request";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["ADMIN", "SUPER_ADMIN", "SALES"], { request });
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tg = teamGuardResponse(user);
  if (tg.error) return tg.error;

  const { searchParams } = new URL(request.url);
  const resolved = await resolveAccountStatsFilters(searchParams, user);
  if (!resolved.ok) return resolved.response;

  const { accountWhere, explicitDateFilter, rangeFrom, rangeTo } = resolved;
  const scopedWhere = { ...accountWhere, teamId: tg.teamId };

  const rows = await prisma.account.findMany({
    where: scopedWhere,
    select: { createdAt: true, type: true, operationalStatus: true },
  });

  const timeZone = sanitizeTimeZone(searchParams.get("timeZone"));
  const granularity = searchParams.get("granularity") === "hour" ? "hour" : "day";

  const points = buildAccountTimeseriesPoints(rows, rangeFrom, rangeTo, explicitDateFilter, {
    timeZone,
    granularity,
  });
  return NextResponse.json({ points });
}
