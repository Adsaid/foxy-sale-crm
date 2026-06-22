import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isCallAssigneeRole, isSalesLike } from "@/lib/roles";
import { teamGuardResponse } from "@/lib/team-scope";
import { notifyCallAssignedToDevAndAdmins } from "@/lib/call-assigned-notifications";
import {
  findCallerConflictWithOtherSales,
  formatCallerConflictMessageUk,
  findDevDailyCallConflict,
  formatDailyCallConflictMessageUk,
} from "@/lib/call-caller-conflict";
import {
  resolvePlannedEnd,
  validatePlannedEnd,
} from "@/lib/call-planned-end";
import { normalizeCallLinkForSave } from "@/lib/normalize-call-link";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const where = isSalesLike(user!.role)
    ? { teamId: tg.teamId }
    : { callerId: user!.id, teamId: tg.teamId };

  const calls = await prisma.callEvent.findMany({
    where,
    include: {
      account: true,
      caller: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          badgeBgColor: true,
          badgeTextColor: true,
        },
      },
    },
    orderBy: { callStartedAt: "desc" },
  });

  return NextResponse.json(calls);
}

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const body = await request.json();
  const { accountId, company, interviewerName, callType, callStartedAt, callEndedAt, callerId, salaryFrom, salaryTo, callLink, description, createdById: createdByIdFromBody } = body;

  if (!accountId || !company || !interviewerName || !callType || !callStartedAt || !callerId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (salaryFrom === undefined || salaryFrom === null || typeof salaryFrom !== "number") {
    return NextResponse.json({ error: "salaryFrom is required" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({ where: { id: accountId, teamId: tg.teamId } });
  if (
    !account ||
    (user!.role !== "ADMIN" && user!.role !== "SUPER_ADMIN" && account.ownerId !== user!.id)
  ) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (account.operationalStatus !== "ACTIVE") {
    return NextResponse.json(
      { error: "Для дзвінка можна обрати лише активний акаунт" },
      { status: 400 }
    );
  }

  const callerUser = await prisma.user.findUnique({
    where: { id: callerId },
    select: { id: true, role: true, teamId: true },
  });
  if (!callerUser || !isCallAssigneeRole(callerUser.role) || callerUser.teamId !== tg.teamId) {
    return NextResponse.json(
      { error: "Обраний виконавець не знайдений або має неприпустиму роль" },
      { status: 400 },
    );
  }

  const isAdmin = user!.role === "ADMIN" || user!.role === "SUPER_ADMIN";

  let createdById: string;
  if (isAdmin) {
    const requestedCreatedById =
      typeof createdByIdFromBody === "string" && createdByIdFromBody.trim()
        ? createdByIdFromBody.trim()
        : null;
    if (!requestedCreatedById) {
      return NextResponse.json({ error: "Оберіть сейла" }, { status: 400 });
    }
    const salesUser = await prisma.user.findUnique({
      where: { id: requestedCreatedById },
      select: { id: true, role: true, teamId: true },
    });
    if (!salesUser || salesUser.role !== "SALES" || salesUser.teamId !== tg.teamId) {
      return NextResponse.json(
        { error: "Обраний сейл не знайдений або має неприпустиму роль" },
        { status: 400 },
      );
    }
    if (account.ownerId !== requestedCreatedById) {
      return NextResponse.json(
        { error: "Обраний акаунт не належить цьому сейлу" },
        { status: 400 },
      );
    }
    createdById = requestedCreatedById;
  } else {
    createdById = user!.id;
  }

  const rangeStart = new Date(callStartedAt);
  const plannedEnd = resolvePlannedEnd(rangeStart, callEndedAt, callType);
  if (!validatePlannedEnd(rangeStart, plannedEnd)) {
    return NextResponse.json(
      { error: "Час завершення має бути пізніше за час початку" },
      { status: 400 },
    );
  }
  const rangeEnd = plannedEnd;
  const callerConflict = await findCallerConflictWithOtherSales(prisma, {
    callerId,
    teamId: tg.teamId!,
    rangeStart,
    rangeEnd,
    actingCreatedById: createdById,
  });
  if (callerConflict) {
    return NextResponse.json(
      { error: formatCallerConflictMessageUk(callerConflict) },
      { status: 409 },
    );
  }

  const dailyConflict = await findDevDailyCallConflict(prisma, {
    callerId,
    teamId: tg.teamId!,
    rangeStart,
    rangeEnd,
  });
  if (dailyConflict) {
    return NextResponse.json(
      { error: formatDailyCallConflictMessageUk(dailyConflict) },
      { status: 409 },
    );
  }

  const call = await prisma.callEvent.create({
    data: {
      teamId: tg.teamId,
      accountId,
      company,
      interviewerName,
      callType,
      callStartedAt: new Date(callStartedAt),
      callEndedAt: plannedEnd,
      callerId,
      createdById,
      salaryFrom,
      ...(salaryTo !== undefined && { salaryTo }),
      ...(callLink !== undefined && { callLink: normalizeCallLinkForSave(callLink) }),
      ...(description !== undefined && { description }),
    },
    include: {
      account: true,
      caller: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          badgeBgColor: true,
          badgeTextColor: true,
        },
      },
    },
  });

  await notifyCallAssignedToDevAndAdmins(call);

  return NextResponse.json(call, { status: 201 });
}
