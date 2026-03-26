import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const markTransferred = body.transferred === true;
  const transferredReason =
    typeof body.transferredReason === "string" ? body.transferredReason.trim() : null;

  const existing = await prisma.callEvent.findUnique({ where: { id } });
  if (
    !existing ||
    (user!.role !== "ADMIN" && existing.createdById !== user!.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const statusAfter = (body.status ?? existing.status) as typeof existing.status;

  if (
    body.outcome !== undefined &&
    (body.outcome === "SUCCESS" || body.outcome === "UNSUCCESSFUL") &&
    statusAfter !== "COMPLETED"
  ) {
    return NextResponse.json(
      { error: "Успіх / неуспіх можна виставити лише для завершеного дзвінка" },
      { status: 400 }
    );
  }

  const updated = await prisma.callEvent.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.outcome !== undefined && { outcome: body.outcome }),
      ...(body.callStartedAt !== undefined && { callStartedAt: new Date(body.callStartedAt) }),
      ...(body.movingToNextStage !== undefined && { movingToNextStage: body.movingToNextStage }),
      ...(body.nextStep !== undefined && { nextStep: body.nextStep }),
      ...(body.nextStepDate !== undefined && { nextStepDate: body.nextStepDate ? new Date(body.nextStepDate) : null }),
      ...(body.expectedFeedbackDate !== undefined && { expectedFeedbackDate: body.expectedFeedbackDate ? new Date(body.expectedFeedbackDate) : null }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: {
      account: true,
      caller: { select: { id: true, firstName: true, lastName: true, email: true } },
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

  const existingSummary = await prisma.callSummary.findUnique({
    where: { callEventId: updated.id },
    select: { id: true },
  });

  const shouldUpsertSummary = updated.status === "COMPLETED" || markTransferred || !!existingSummary;

  if (shouldUpsertSummary) {
    const summaryData = {
      company: updated.company,
      accountName: updated.account?.account ?? "",
      accountType: updated.account?.type ?? "UPWORK",
      callType: updated.callType,
      callerFirstName: updated.caller?.firstName ?? "",
      callerLastName: updated.caller?.lastName ?? "",
      interviewerName: updated.interviewerName,
      callStartedAt: updated.callStartedAt,
      callEndedAt: updated.callEndedAt,
      outcome: updated.outcome,
      devFeedback: updated.devFeedback,
      movingToNextStage: updated.movingToNextStage,
      nextStep: updated.nextStep,
      nextStepDate: updated.nextStepDate,
      notes: updated.notes,
      createdById: updated.createdById,
      isTransferred: markTransferred,
      transferredById: markTransferred ? user!.id : null,
      transferredAt: markTransferred ? new Date() : null,
      transferredFromAt: markTransferred ? existing.callStartedAt : null,
      transferredToAt: markTransferred ? updated.callStartedAt : null,
      transferredReason: markTransferred ? transferredReason : null,
    };

    await prisma.callSummary.upsert({
      where: { callEventId: updated.id },
      update: summaryData,
      create: { callEventId: updated.id, ...summaryData },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.callEvent.findUnique({ where: { id } });
  if (
    !existing ||
    (user!.role !== "ADMIN" && existing.createdById !== user!.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.callEvent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
