import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { canMutateCall } from "@/lib/roles";
import type { CallStage, CallType } from "@prisma/client";
import {
  CALL_SLOT_MS,
  findCallerConflictWithOtherSales,
  formatCallerConflictMessageUk,
} from "@/lib/call-caller-conflict";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { callType, callStartedAt } = body as {
    callType?: CallType;
    callStartedAt?: string;
  };

  if (!callType || !callStartedAt) {
    return NextResponse.json({ error: "callType and callStartedAt required" }, { status: 400 });
  }

  const existing = await prisma.callEvent.findUnique({ where: { id } });
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
  const rangeEnd = new Date(rangeStart.getTime() + CALL_SLOT_MS);
  const callerConflict = await findCallerConflictWithOtherSales(prisma, {
    callerId: existing.callerId,
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

  const newCall = await prisma.callEvent.create({
    data: {
      accountId: existing.accountId,
      company: existing.company,
      interviewerName: existing.interviewerName,
      callerId: existing.callerId,
      createdById: existing.createdById,
      callType,
      callStartedAt: new Date(callStartedAt),
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

  await prisma.callSummary.updateMany({
    where: { callEventId: id },
    data: {
      callEventId: newCall.id,
      movingToNextStage: true,
      nextStep: callType as CallStage,
      nextStepDate: new Date(callStartedAt),
      callerId: existing.callerId,
    },
  });

  await prisma.callEvent.delete({ where: { id } });

  return NextResponse.json(newCall, { status: 201 });
}
