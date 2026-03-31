import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isCallAssigneeRole, isSalesLike } from "@/lib/roles";
import { notifyCallAssignedToDevAndAdmins } from "@/lib/call-assigned-notifications";
import {
  CALL_SLOT_MS,
  findCallerConflictWithOtherSales,
  formatCallerConflictMessageUk,
} from "@/lib/call-caller-conflict";
import { normalizeCallLinkForSave } from "@/lib/normalize-call-link";

export async function GET() {
  const { error, user } = await getApiUser(["SALES", "DEV", "DESIGNER", "ADMIN"]);
  if (error) return error;

  const where = isSalesLike(user!.role) ? {} : { callerId: user!.id };

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
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const body = await request.json();
  const { accountId, company, interviewerName, callType, callStartedAt, callerId, salaryFrom, salaryTo, callLink, description } = body;

  if (!accountId || !company || !interviewerName || !callType || !callStartedAt || !callerId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (salaryFrom === undefined || salaryFrom === null || typeof salaryFrom !== "number") {
    return NextResponse.json({ error: "salaryFrom is required" }, { status: 400 });
  }

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (
    !account ||
    (user!.role !== "ADMIN" && account.ownerId !== user!.id)
  ) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const callerUser = await prisma.user.findUnique({
    where: { id: callerId },
    select: { id: true, role: true },
  });
  if (!callerUser || !isCallAssigneeRole(callerUser.role)) {
    return NextResponse.json(
      { error: "Обраний виконавець не знайдений або має неприпустиму роль" },
      { status: 400 },
    );
  }

  const createdById = user!.role === "ADMIN" ? account.ownerId : user!.id;

  const rangeStart = new Date(callStartedAt);
  const rangeEnd = new Date(rangeStart.getTime() + CALL_SLOT_MS);
  const callerConflict = await findCallerConflictWithOtherSales(prisma, {
    callerId,
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

  const call = await prisma.callEvent.create({
    data: {
      accountId,
      company,
      interviewerName,
      callType,
      callStartedAt: new Date(callStartedAt),
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
