import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import type { Role } from "@prisma/client";

function callWhereForRole(role: Role, userId: string) {
  switch (role) {
    case "ADMIN":
      return {};
    case "SALES":
      return { createdById: userId };
    case "DEV":
      return { callerId: userId };
  }
}

export async function GET() {
  const { error, user } = await getApiUser(["SALES", "DEV", "ADMIN"]);
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callWhere = callWhereForRole(user.role, user.id);

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
