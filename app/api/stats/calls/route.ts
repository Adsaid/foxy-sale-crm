import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import type { Role } from "@prisma/client";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

function callWhereForRole(role: Role, userId: string): Prisma.CallEventWhereInput {
  switch (role) {
    case "ADMIN":
      return {};
    case "SALES":
      return { createdById: userId };
    case "DEV":
      return { callerId: userId };
  }
}

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "DEV", "ADMIN"]);
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const salesIdParam = searchParams.get("salesId");

  let callWhere: Prisma.CallEventWhereInput = callWhereForRole(user.role, user.id);

  if (fromParam && toParam) {
    const fromD = new Date(fromParam);
    const toD = new Date(toParam);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      return NextResponse.json({ error: "Некоректні дати" }, { status: 400 });
    }
    if (fromD.getTime() > toD.getTime()) {
      return NextResponse.json({ error: "Дата «від» пізніша за «до»" }, { status: 400 });
    }
    callWhere = {
      ...callWhere,
      callStartedAt: { gte: fromD, lte: toD },
    };
  } else if (fromParam || toParam) {
    return NextResponse.json(
      { error: "Потрібні обидва параметри from та to" },
      { status: 400 }
    );
  }

  if (salesIdParam) {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!OBJECT_ID_RE.test(salesIdParam)) {
      return NextResponse.json({ error: "Некоректний ідентифікатор" }, { status: 400 });
    }
    const salesExists = await prisma.user.findFirst({
      where: { id: salesIdParam, role: "SALES" },
      select: { id: true },
    });
    if (!salesExists) {
      return NextResponse.json({ error: "Сейл не знайдено" }, { status: 404 });
    }
    callWhere = { ...callWhere, createdById: salesIdParam };
  }

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
