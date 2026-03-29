import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { getReportWeekFields } from "@/lib/report-week";
import {
  accountToSnapshot,
  accountReportPrismaInclude,
  buildSalesAccountReportTelegramText,
} from "@/lib/sales-account-report";
import { notifyAdminsSalesAccountReport } from "@/lib/notifications";
import type { Account, SalesAccountReportListItem } from "@/types/crm";

function serializeReport(r: {
  id: string;
  createdAt: Date;
  weekYear: number;
  weekNumber: number;
  weekStart: Date;
  accountsSnapshot: Prisma.JsonValue;
  telegramText: string | null;
  submittedBy: { id: string; firstName: string; lastName: string; email: string };
}): SalesAccountReportListItem {
  return {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    weekYear: r.weekYear,
    weekNumber: r.weekNumber,
    weekStart: r.weekStart.toISOString(),
    accountsSnapshot: r.accountsSnapshot as unknown as Account[],
    telegramText: r.telegramText,
    submittedBy: r.submittedBy,
  };
}

export async function POST() {
  const { error, user } = await getApiUser(["SALES"]);
  if (error) return error;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    where: { ownerId: user.id },
    include: accountReportPrismaInclude,
    orderBy: { createdAt: "desc" },
  });

  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "Немає акаунтів для звіту. Додайте хоча б один акаунт." },
      { status: 400 }
    );
  }

  const snapshots = accounts.map(accountToSnapshot);
  const now = new Date();
  const { weekYear, weekNumber, weekStart } = getReportWeekFields(now);
  const salesName = `${user.firstName} ${user.lastName}`.trim();
  const telegramText = buildSalesAccountReportTelegramText(snapshots, salesName);

  const report = await prisma.salesAccountReport.create({
    data: {
      submittedById: user.id,
      weekYear,
      weekNumber,
      weekStart,
      accountsSnapshot: snapshots as unknown as Prisma.InputJsonValue,
      telegramText,
    },
  });

  await notifyAdminsSalesAccountReport({
    reportId: report.id,
    salesFirstName: user.firstName,
    salesLastName: user.lastName,
    telegramBody: telegramText,
  });

  return NextResponse.json({
    id: report.id,
    createdAt: report.createdAt.toISOString(),
  });
}

export async function GET(request: Request) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const salesUserId = searchParams.get("salesUserId")?.trim() || undefined;
  const weekYearRaw = searchParams.get("weekYear");
  const weekNumberRaw = searchParams.get("weekNumber");
  const weekStartMinRaw = searchParams.get("weekStartMin")?.trim();
  const weekStartMaxRaw = searchParams.get("weekStartMax")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "30") || 30));

  const where: Prisma.SalesAccountReportWhereInput = {};
  if (salesUserId) where.submittedById = salesUserId;

  let weekRangeApplied = false;
  if (weekStartMinRaw && weekStartMaxRaw) {
    const minD = new Date(weekStartMinRaw);
    const maxD = new Date(weekStartMaxRaw);
    if (!Number.isNaN(minD.getTime()) && !Number.isNaN(maxD.getTime())) {
      where.weekStart = { gte: minD, lte: maxD };
      weekRangeApplied = true;
    }
  }
  if (!weekRangeApplied && weekYearRaw != null && weekNumberRaw != null) {
    const wy = Number(weekYearRaw);
    const wn = Number(weekNumberRaw);
    if (Number.isFinite(wy) && Number.isFinite(wn)) {
      where.weekYear = wy;
      where.weekNumber = wn;
    }
  }

  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    prisma.salesAccountReport.findMany({
      where,
      include: {
        submittedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ weekYear: "desc" }, { weekNumber: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.salesAccountReport.count({ where }),
  ]);

  return NextResponse.json({
    items: rows.map(serializeReport),
    total,
    page,
    limit,
  });
}
