import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { callTypeLabelUk, formatNotificationDateTime } from "@/lib/notification-copy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["DEV"]);
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const call = await prisma.callEvent.findUnique({ where: { id } });
  if (!call || call.callerId !== user!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (call.callEndedAt) {
    return NextResponse.json({ error: "Already completed" }, { status: 400 });
  }

  const now = new Date();
  if (now < call.callStartedAt) {
    return NextResponse.json({ error: "Call has not started yet" }, { status: 400 });
  }

  const updated = await prisma.callEvent.update({
    where: { id },
    data: {
      callEndedAt: now,
      status: "COMPLETED",
      devFeedback: body.devFeedback || null,
    },
    include: {
      account: true,
      caller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          badgeBgColor: true,
          badgeTextColor: true,
        },
      },
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

  await prisma.callSummary.create({
    data: {
      callEventId: updated.id,
      company: updated.company,
      accountName: updated.account?.account ?? "",
      accountType: updated.account?.type ?? "UPWORK",
      callType: updated.callType,
      callerFirstName: updated.caller?.firstName ?? "",
      callerLastName: updated.caller?.lastName ?? "",
      interviewerName: updated.interviewerName,
      callStartedAt: updated.callStartedAt,
      callEndedAt: now,
      outcome: updated.outcome,
      devFeedback: body.devFeedback || null,
      movingToNextStage: updated.movingToNextStage,
      nextStep: updated.nextStep,
      nextStepDate: updated.nextStepDate,
      notes: updated.notes,
      createdById: updated.createdById,
      isTransferred: false,
      transferredById: null,
      transferredAt: null,
      transferredFromAt: null,
      transferredToAt: null,
      transferredReason: null,
      transferHistory: [],
    },
  });

  const devName = `${updated.caller?.firstName ?? ""} ${updated.caller?.lastName ?? ""}`.trim();
  const startStr = formatNotificationDateTime(updated.callStartedAt);
  const endStr = formatNotificationDateTime(now);
  const typeLabel = callTypeLabelUk(updated.callType);
  await createNotification({
    userId: updated.createdById,
    type: "CALL_COMPLETED",
    title: `Дзвінок завершено — ${updated.company}`,
    telegramActorName: devName || undefined,
    telegramActorBadgeBgColor: updated.caller?.badgeBgColor,
    telegramActorBadgeTextColor: updated.caller?.badgeTextColor,
    message: [
      `${devName} завершив дзвінок.`,
      `Компанія: ${updated.company}`,
      `Тип: ${typeLabel}`,
      `Інтерв'юер: ${updated.interviewerName}`,
      `Початок: ${startStr}`,
      `Завершено: ${endStr}`,
    ].join("\n"),
    payload: {
      callId: updated.id,
      company: updated.company,
      callType: updated.callType,
      callStartedAt: updated.callStartedAt.toISOString(),
      callEndedAt: now.toISOString(),
      interviewerName: updated.interviewerName,
    },
  }).catch((err) => console.error("[notification] CALL_COMPLETED", err));

  return NextResponse.json(updated);
}
