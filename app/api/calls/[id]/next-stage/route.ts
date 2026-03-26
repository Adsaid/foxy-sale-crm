import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import type { CallStage, CallType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES"]);
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
  if (!existing || existing.createdById !== user!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "COMPLETED" || existing.outcome !== "SUCCESS") {
    return NextResponse.json(
      { error: "Only completed calls with success outcome can advance" },
      { status: 400 }
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
    },
    include: {
      account: true,
      caller: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  await prisma.callSummary.updateMany({
    where: { callEventId: id },
    data: {
      movingToNextStage: true,
      nextStep: callType as CallStage,
      nextStepDate: new Date(callStartedAt),
    },
  });

  await prisma.callEvent.delete({ where: { id } });

  return NextResponse.json(newCall, { status: 201 });
}
