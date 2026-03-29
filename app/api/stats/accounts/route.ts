import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { resolveAccountStatsFilters } from "@/lib/stats-accounts-request";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["ADMIN"]);
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resolved = await resolveAccountStatsFilters(searchParams, user);
  if (!resolved.ok) return resolved.response;

  const { accountWhere } = resolved;

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
    prisma.account.count({ where: accountWhere }),
    prisma.account.count({ where: { ...accountWhere, type: "UPWORK" } }),
    prisma.account.count({ where: { ...accountWhere, type: "LINKEDIN" } }),
    prisma.account.count({ where: { ...accountWhere, operationalStatus: "ACTIVE" } }),
    prisma.account.count({ where: { ...accountWhere, operationalStatus: "PAUSED" } }),
    prisma.account.count({ where: { ...accountWhere, operationalStatus: "SETUP" } }),
    prisma.account.count({ where: { ...accountWhere, operationalStatus: "WARMING" } }),
    prisma.account.count({ where: { ...accountWhere, operationalStatus: null } }),
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
