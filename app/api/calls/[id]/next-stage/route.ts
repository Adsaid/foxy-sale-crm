import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { canMutateCall } from "@/lib/roles";
import type { CallStage, CallType } from "@prisma/client";
import {
  findCallerConflictWithOtherSales,
  formatCallerConflictMessageUk,
} from "@/lib/call-caller-conflict";
import {
  defaultPlannedEnd,
  validatePlannedEnd,
} from "@/lib/call-planned-end";
import { teamGuardResponse } from "@/lib/team-scope";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { id } = await params;
  const body = await request.json();
  const { callType, callStartedAt } = body as {
    callType?: CallType;
    callStartedAt?: string;
  };

  if (!callType || !callStartedAt) {
    return NextResponse.json({ error: "callType and callStartedAt required" }, { status: 400 });
  }

  const existing = await prisma.callEvent.findFirst({ where: { id, teamId: tg.teamId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canMutateCall(user!, existing.createdById)) {
    return NextResponse.json(
      { error: "Немає прав на зміну цього дзвінка" },
      { status: 403 },
    );
  }

  if (existing.status !== "COMPLETED" || existing.outcome !== "SUCCESS") {
    return NextResponse.json(
      { error: "Only completed calls with success outcome can advance" },
      { status: 400 }
    );
  }

  const rangeStart = new Date(callStartedAt);
  const previousDurationMs =
    existing.callEndedAt && existing.callEndedAt.getTime() > existing.callStartedAt.getTime()
      ? existing.callEndedAt.getTime() - existing.callStartedAt.getTime()
      : null;
  const plannedEnd = previousDurationMs
    ? new Date(rangeStart.getTime() + previousDurationMs)
    : defaultPlannedEnd(rangeStart, callType);
  if (!validatePlannedEnd(rangeStart, plannedEnd)) {
    return NextResponse.json(
      { error: "Час завершення має бути пізніше за час початку" },
      { status: 400 },
    );
  }
  const rangeEnd = plannedEnd;
  const callerConflict = await findCallerConflictWithOtherSales(prisma, {
    callerId: existing.callerId,
    teamId: tg.teamId!,
    rangeStart,
    rangeEnd,
    actingCreatedById: existing.createdById,
    excludeCallId: existing.id,
  });
  if (callerConflict) {
    return NextResponse.json(
      { error: formatCallerConflictMessageUk(callerConflict) },
      { status: 409 },
    );
  }

  const now = new Date();

  const newCall = await prisma.callEvent.create({
    data: {
      teamId: tg.teamId,
      accountId: existing.accountId,
      company: existing.company,
      interviewerName: existing.interviewerName,
      callerId: existing.callerId,
      createdById: existing.createdById,
      callType,
      callStartedAt: new Date(callStartedAt),
      callEndedAt: plannedEnd,
      status: "SCHEDULED",
      outcome: "PENDING",
      notes: existing.notes,
      expectedFeedbackDate: existing.expectedFeedbackDate,
      salaryFrom: existing.salaryFrom,
      salaryTo: existing.salaryTo,
      description: existing.description,
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

  /** Лише `callEventId`: у старих підсумків `teamId` міг бути null — умова `teamId: tg.teamId` тоді не знаходила рядок. */
  await prisma.callSummary.updateMany({
    where: { callEventId: id },
    data: {
      teamId: tg.teamId,
      callEventId: newCall.id,
      movingToNextStage: true,
      nextStep: callType as CallStage,
      nextStepDate: new Date(callStartedAt),
      callerId: existing.callerId,
    },
  });

  await prisma.callNextStageEvent.create({
    data: {
      teamId: tg.teamId,
      occurredAt: now,
      createdById: existing.createdById,
      callerId: existing.callerId,
      fromCallId: id,
      toCallId: newCall.id,
      nextCallType: callType,
    },
  });

  await prisma.callEvent.delete({ where: { id } });

  return NextResponse.json(newCall, { status: 201 });
}
