import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
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

  const { accountWhere } = resolved;
  const scopedWhere = { ...accountWhere, teamId: tg.teamId };

  const [
    totalAccounts,
    upwork,
    linkedin,
    active,
    paused,
    setup,
    warming,
    noOperationalStatus,
  ] = await Promise.all([
    prisma.account.count({ where: scopedWhere }),
    prisma.account.count({ where: { ...scopedWhere, type: "UPWORK" } }),
    prisma.account.count({ where: { ...scopedWhere, type: "LINKEDIN" } }),
    prisma.account.count({ where: { ...scopedWhere, operationalStatus: "ACTIVE" } }),
    prisma.account.count({ where: { ...scopedWhere, operationalStatus: "PAUSED" } }),
    prisma.account.count({ where: { ...scopedWhere, operationalStatus: "SETUP" } }),
    prisma.account.count({ where: { ...scopedWhere, operationalStatus: "WARMING" } }),
    prisma.account.count({ where: { ...scopedWhere, operationalStatus: null } }),
  ]);

  return NextResponse.json({
    totalAccounts,
    upwork,
    linkedin,
    active,
    paused,
    setup,
    warming,
    noOperationalStatus,
  });
}
