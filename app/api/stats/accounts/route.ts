import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function GET() {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

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
    prisma.account.count(),
    prisma.account.count({ where: { type: "UPWORK" } }),
    prisma.account.count({ where: { type: "LINKEDIN" } }),
    prisma.account.count({ where: { operationalStatus: "ACTIVE" } }),
    prisma.account.count({ where: { operationalStatus: "PAUSED" } }),
    prisma.account.count({ where: { operationalStatus: "SETUP" } }),
    prisma.account.count({ where: { operationalStatus: "WARMING" } }),
    prisma.account.count({ where: { operationalStatus: null } }),
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
