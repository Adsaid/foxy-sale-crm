import { NextResponse } from "next/server";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export type ResolvedAccountStatsFilters =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      accountWhere: Prisma.AccountWhereInput;
      explicitDateFilter: boolean;
      rangeFrom: Date;
      rangeTo: Date;
    };

/**
 * Фільтри для статистики акаунтів: ADMIN — усі / за сейлом; SALES — лише `ownerId = поточний користувач`.
 */
export async function resolveAccountStatsFilters(
  searchParams: URLSearchParams,
  user: Pick<User, "id" | "role">
): Promise<ResolvedAccountStatsFilters> {
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "SALES") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const isSales = user.role === "SALES";

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const salesIdParam = searchParams.get("salesId");

  let accountWhere: Prisma.AccountWhereInput = isSales ? { ownerId: user.id } : {};
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
    accountWhere = {
      ...accountWhere,
      createdAt: { gte: fromD, lte: toD },
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
    if (isSales) {
      if (salesIdParam !== user.id) {
        return {
          ok: false,
          response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
      }
    } else {
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
      accountWhere = { ...accountWhere, ownerId: salesIdParam };
    }
  }

  if (explicitDateFilter && rangeFrom && rangeTo) {
    return { ok: true, accountWhere, explicitDateFilter, rangeFrom, rangeTo };
  }

  const [minRow, maxRow] = await Promise.all([
    prisma.account.findFirst({
      where: accountWhere,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.account.findFirst({
      where: accountWhere,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (!minRow?.createdAt || !maxRow?.createdAt) {
    const now = new Date();
    return {
      ok: true,
      accountWhere,
      explicitDateFilter: false,
      rangeFrom: now,
      rangeTo: now,
    };
  }

  return {
    ok: true,
    accountWhere,
    explicitDateFilter: false,
    rangeFrom: minRow.createdAt,
    rangeTo: maxRow.createdAt,
  };
}
