import { NextResponse } from "next/server";
import type { Prisma, Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export function callWhereForRole(role: Role, userId: string): Prisma.CallEventWhereInput {
  switch (role) {
    case "ADMIN":
      return {};
    case "SALES":
      return { createdById: userId };
    case "DEV":
      return { callerId: userId };
  }
}

export type ResolvedCallStatsFilters =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      callWhere: Prisma.CallEventWhereInput;
      explicitDateFilter: boolean;
      rangeFrom: Date;
      rangeTo: Date;
    };

export async function resolveCallStatsFilters(
  searchParams: URLSearchParams,
  user: Pick<User, "id" | "role">
): Promise<ResolvedCallStatsFilters> {
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const salesIdParam = searchParams.get("salesId");
  const callerIdParam = searchParams.get("callerId");

  let callWhere: Prisma.CallEventWhereInput = callWhereForRole(user.role, user.id);
  let explicitDateFilter = false;
  let rangeFrom: Date | null = null;
  let rangeTo: Date | null = null;

  if (fromParam && toParam) {
    const fromD = new Date(fromParam);
    const toD = new Date(toParam);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Некоректні дати" }, { status: 400 }),
      };
    }
    if (fromD.getTime() > toD.getTime()) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Дата «від» пізніша за «до»" },
          { status: 400 }
        ),
      };
    }
    callWhere = {
      ...callWhere,
      callStartedAt: { gte: fromD, lte: toD },
    };
    explicitDateFilter = true;
    rangeFrom = fromD;
    rangeTo = toD;
  } else if (fromParam || toParam) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Потрібні обидва параметри from та to" },
        { status: 400 }
      ),
    };
  }

  if (salesIdParam) {
    if (user.role !== "ADMIN") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    if (!OBJECT_ID_RE.test(salesIdParam)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Некоректний ідентифікатор" }, { status: 400 }),
      };
    }
    const salesExists = await prisma.user.findFirst({
      where: { id: salesIdParam, role: "SALES" },
      select: { id: true },
    });
    if (!salesExists) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Сейл не знайдено" }, { status: 404 }),
      };
    }
    callWhere = { ...callWhere, createdById: salesIdParam };
  }

  if (callerIdParam) {
    if (user.role !== "ADMIN" && user.role !== "SALES") {
      return {
        ok: false,
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    if (!OBJECT_ID_RE.test(callerIdParam)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Некоректний ідентифікатор" }, { status: 400 }),
      };
    }
    const devExists = await prisma.user.findFirst({
      where: { id: callerIdParam, role: "DEV" },
      select: { id: true },
    });
    if (!devExists) {
      return {
        ok: false,
        response: NextResponse.json({ error: "DEV не знайдено" }, { status: 404 }),
      };
    }
    callWhere = { ...callWhere, callerId: callerIdParam };
  }

  if (explicitDateFilter && rangeFrom && rangeTo) {
    return { ok: true, callWhere, explicitDateFilter, rangeFrom, rangeTo };
  }

  const [minRow, maxRow] = await Promise.all([
    prisma.callEvent.findFirst({
      where: callWhere,
      orderBy: { callStartedAt: "asc" },
      select: { callStartedAt: true },
    }),
    prisma.callEvent.findFirst({
      where: callWhere,
      orderBy: { callStartedAt: "desc" },
      select: { callStartedAt: true },
    }),
  ]);

  if (!minRow?.callStartedAt || !maxRow?.callStartedAt) {
    const now = new Date();
    return {
      ok: true,
      callWhere,
      explicitDateFilter: false,
      rangeFrom: now,
      rangeTo: now,
    };
  }

  return {
    ok: true,
    callWhere,
    explicitDateFilter: false,
    rangeFrom: minRow.callStartedAt,
    rangeTo: maxRow.callStartedAt,
  };
}
