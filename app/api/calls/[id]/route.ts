import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike, canMutateCall } from "@/lib/roles";
import { createNotification, notifyAllAdmins } from "@/lib/notifications";
import { notifyCallAssignedToDevAndAdmins } from "@/lib/call-assigned-notifications";
import {
  callTypeLabelUk,
  formatNotificationDateTime,
  notifVerbPast,
} from "@/lib/notification-copy";
import {
  callEndedAtOneHourAfterStart,
  isCallStartedBeforeTodayKyiv,
} from "@/lib/call-completion-time";
import { appendTransferEntry, buildCallTransferInfo } from "@/lib/transfer-history";
import {
  CALL_SLOT_MS,
  findCallerConflictWithOtherSales,
  formatCallerConflictMessageUk,
} from "@/lib/call-caller-conflict";

const callInclude = {
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
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "DEV", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const call = await prisma.callEvent.findUnique({
    where: { id },
    include: callInclude,
  });

  if (!call) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canAccess = isSalesLike(user!.role) || call.callerId === user!.id;

  if (!canAccess) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const summary = await prisma.callSummary.findUnique({
    where: { callEventId: id },
    select: {
      isTransferred: true,
      transferredFromAt: true,
      transferredToAt: true,
      transferredReason: true,
      transferredById: true,
      transferHistory: true,
    },
  });

  const transferInfo = summary ? await buildCallTransferInfo(summary) : null;

  return NextResponse.json({ ...call, transferInfo });
}

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
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canMutateCall(user!, existing.createdById)) {
    return NextResponse.json(
      { error: "Немає прав на зміну цього дзвінка" },
      { status: 403 },
    );
  }

  const statusAfter = (body.status ?? existing.status) as typeof existing.status;

  let effectiveCallerId = existing.callerId;
  if (Object.prototype.hasOwnProperty.call(body, "callerId")) {
    if (body.callerId === null || body.callerId === undefined) {
      return NextResponse.json(
        { error: "Некоректний callerId" },
        { status: 400 },
      );
    }
    if (existing.status !== "SCHEDULED") {
      return NextResponse.json(
        {
          error:
            "Змінити відповідального DEV можна лише для дзвінка зі статусом «Заплановано».",
        },
        { status: 400 },
      );
    }
    if (typeof body.callerId !== "string" || !body.callerId.trim()) {
      return NextResponse.json({ error: "Некоректний callerId" }, { status: 400 });
    }
    effectiveCallerId = body.callerId.trim();
    if (effectiveCallerId !== existing.callerId) {
      const devUser = await prisma.user.findUnique({
        where: { id: effectiveCallerId },
        select: { id: true, role: true },
      });
      if (!devUser || devUser.role !== "DEV") {
        return NextResponse.json(
          { error: "Обраний користувач не знайдений або не є DEV" },
          { status: 400 },
        );
      }
    }
  }

  const effectiveStart =
    body.callStartedAt !== undefined
      ? new Date(body.callStartedAt)
      : existing.callStartedAt;
  const callerChanged = effectiveCallerId !== existing.callerId;
  const startChanged =
    body.callStartedAt !== undefined &&
    effectiveStart.getTime() !== existing.callStartedAt.getTime();

  if (callerChanged || startChanged) {
    const rangeEnd = new Date(effectiveStart.getTime() + CALL_SLOT_MS);
    const callerConflict = await findCallerConflictWithOtherSales(prisma, {
      callerId: effectiveCallerId,
      rangeStart: effectiveStart,
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
  }

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

  const transitioningToCompleted =
    statusAfter === "COMPLETED" && existing.status !== "COMPLETED";
  const callEndedAtForBackdatedCompletion =
    transitioningToCompleted && isCallStartedBeforeTodayKyiv(effectiveStart)
      ? callEndedAtOneHourAfterStart(effectiveStart)
      : undefined;

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
      ...(body.salaryFrom !== undefined && { salaryFrom: body.salaryFrom }),
      ...(body.salaryTo !== undefined && { salaryTo: body.salaryTo }),
      ...(body.callLink !== undefined && { callLink: body.callLink || null }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(callerChanged && { callerId: effectiveCallerId }),
      ...(callEndedAtForBackdatedCompletion !== undefined && {
        callEndedAt: callEndedAtForBackdatedCompletion,
      }),
    },
    include: callInclude,
  });

  const shouldNotifyCancelled =
    body.status === "CANCELLED" && existing.status !== "CANCELLED";

  const existingSummary = await prisma.callSummary.findUnique({
    where: { callEventId: updated.id },
    select: { id: true, transferHistory: true },
  });

  const shouldUpsertSummary = updated.status === "COMPLETED" || markTransferred || !!existingSummary;

  if (shouldUpsertSummary) {
    const baseSummaryData = {
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
    };

    /** Лише при новому переносі дати/часу; інакше не чіпаємо поля — інакше затирається історія переносу в підсумках. */
    const transferFieldsOnMark = markTransferred
      ? {
          isTransferred: true,
          transferredById: user!.id,
          transferredAt: new Date(),
          transferredFromAt: existing.callStartedAt,
          transferredToAt: updated.callStartedAt,
          transferredReason: transferredReason,
          transferHistory: appendTransferEntry(existingSummary?.transferHistory, {
            fromAt: existing.callStartedAt,
            toAt: updated.callStartedAt,
            byId: user!.id,
            reason: transferredReason,
          }),
        }
      : {};

    await prisma.callSummary.upsert({
      where: { callEventId: updated.id },
      update: {
        ...baseSummaryData,
        ...transferFieldsOnMark,
      },
      create: {
        callEventId: updated.id,
        ...baseSummaryData,
        ...(markTransferred
          ? {
              isTransferred: true,
              transferredById: user!.id,
              transferredAt: new Date(),
              transferredFromAt: existing.callStartedAt,
              transferredToAt: updated.callStartedAt,
              transferredReason: transferredReason,
              transferHistory: appendTransferEntry(null, {
                fromAt: existing.callStartedAt,
                toAt: updated.callStartedAt,
                byId: user!.id,
                reason: transferredReason,
              }),
            }
          : {
              isTransferred: false,
              transferredById: null,
              transferredAt: null,
              transferredFromAt: null,
              transferredToAt: null,
              transferredReason: null,
            }),
      },
    });
  }

  if (markTransferred) {
    const salesName = `${updated.createdBy?.firstName ?? ""} ${updated.createdBy?.lastName ?? ""}`.trim();
    const fromStr = formatNotificationDateTime(existing.callStartedAt);
    const toStr = formatNotificationDateTime(updated.callStartedAt);
    const typeLabel = callTypeLabelUk(updated.callType);
    const lines = [
      `${salesName} ${notifVerbPast.movedCall} дзвінок.`,
      `Компанія: ${updated.company}`,
      `Тип: ${typeLabel}`,
      `Було: ${fromStr}`,
      `Стало: ${toStr}`,
    ];
    if (transferredReason) lines.push(`Причина: ${transferredReason}`);
    const rescheduleMsg = lines.join("\n");
    const reschedulePayload = {
      callId: updated.id,
      company: updated.company,
      from: existing.callStartedAt.toISOString(),
      to: updated.callStartedAt.toISOString(),
      reason: transferredReason,
      callType: updated.callType,
      interviewerName: updated.interviewerName,
    };
    await createNotification({
      userId: updated.callerId,
      type: "CALL_RESCHEDULED",
      title: `Дзвінок перенесено — ${updated.company}`,
      message: rescheduleMsg,
      telegramActorName: salesName || undefined,
      telegramActorBadgeBgColor: updated.createdBy?.badgeBgColor,
      telegramActorBadgeTextColor: updated.createdBy?.badgeTextColor,
      payload: reschedulePayload,
    }).catch((err) => console.error("[notification] CALL_RESCHEDULED", err));
    await notifyAllAdmins({
      type: "CALL_RESCHEDULED",
      title: `Дзвінок перенесено — ${updated.company}`,
      message: rescheduleMsg,
      telegramActorName: salesName || undefined,
      telegramActorBadgeBgColor: updated.createdBy?.badgeBgColor,
      telegramActorBadgeTextColor: updated.createdBy?.badgeTextColor,
      payload: reschedulePayload,
    }).catch((err) => console.error("[notification] CALL_RESCHEDULED admin", err));
  }

  if (shouldNotifyCancelled) {
    const salesName = `${updated.createdBy?.firstName ?? ""} ${updated.createdBy?.lastName ?? ""}`.trim();
    const was = formatNotificationDateTime(existing.callStartedAt);
    const typeLabel = callTypeLabelUk(updated.callType);
    const cancelledMsg = [
      `${salesName} ${notifVerbPast.cancelledCall} дзвінок.`,
      `Компанія: ${updated.company}`,
      `Тип: ${typeLabel}`,
      `Інтерв'юер: ${updated.interviewerName}`,
      `Заплановано було на: ${was}`,
    ].join("\n");
    const cancelledPayload = {
      callId: updated.id,
      company: updated.company,
      callType: updated.callType,
      interviewerName: updated.interviewerName,
      cancelledCallStartedAt: existing.callStartedAt.toISOString(),
    };
    await createNotification({
      userId: updated.callerId,
      type: "CALL_CANCELLED",
      title: `Дзвінок скасовано — ${updated.company}`,
      message: cancelledMsg,
      telegramActorName: salesName || undefined,
      telegramActorBadgeBgColor: updated.createdBy?.badgeBgColor,
      telegramActorBadgeTextColor: updated.createdBy?.badgeTextColor,
      payload: cancelledPayload,
    }).catch((err) => console.error("[notification] CALL_CANCELLED", err));
    await notifyAllAdmins({
      type: "CALL_CANCELLED",
      title: `Дзвінок скасовано — ${updated.company}`,
      message: cancelledMsg,
      telegramActorName: salesName || undefined,
      telegramActorBadgeBgColor: updated.createdBy?.badgeBgColor,
      telegramActorBadgeTextColor: updated.createdBy?.badgeTextColor,
      payload: cancelledPayload,
    }).catch((err) => console.error("[notification] CALL_CANCELLED admin", err));
  }

  if (callerChanged) {
    const salesName = `${updated.createdBy?.firstName ?? ""} ${updated.createdBy?.lastName ?? ""}`.trim();
    const newDevName = `${updated.caller?.firstName ?? ""} ${updated.caller?.lastName ?? ""}`.trim();
    const when = formatNotificationDateTime(updated.callStartedAt);
    const typeLabel = callTypeLabelUk(updated.callType);
    const awayLines = [
      `${salesName} ${notifVerbPast.reassignedCallFromYou} дзвінок іншому DEV.`,
      `Компанія: ${updated.company}`,
      `Тип: ${typeLabel}`,
      `Час: ${when}`,
      `Інтерв'юер: ${updated.interviewerName}`,
    ];
    if (newDevName) awayLines.push(`Новий DEV: ${newDevName}`);
    const awayMessage = awayLines.join("\n");
    const awayPayload = {
      callId: updated.id,
      company: updated.company,
      callType: updated.callType,
      callStartedAt: updated.callStartedAt.toISOString(),
      interviewerName: updated.interviewerName,
      newCallerId: updated.callerId,
      ...(newDevName ? { newDevName } : {}),
    };
    await createNotification({
      userId: existing.callerId,
      type: "CALL_DEV_REASSIGNED_AWAY",
      title: `Дзвінок перепризначено — ${updated.company}`,
      message: awayMessage,
      telegramActorName: salesName || undefined,
      telegramActorBadgeBgColor: updated.createdBy?.badgeBgColor,
      telegramActorBadgeTextColor: updated.createdBy?.badgeTextColor,
      payload: awayPayload,
    }).catch((err) =>
      console.error("[notification] CALL_DEV_REASSIGNED_AWAY", err),
    );
    await notifyCallAssignedToDevAndAdmins(updated);
  }

  const linkChanged =
    body.callLink !== undefined &&
    existing.status === "SCHEDULED" &&
    (existing.callLink ?? "") !== (body.callLink ?? "");

  if (linkChanged) {
    const salesName = `${updated.createdBy?.firstName ?? ""} ${updated.createdBy?.lastName ?? ""}`.trim();
    const when = formatNotificationDateTime(updated.callStartedAt);
    const typeLabel = callTypeLabelUk(updated.callType);
    await createNotification({
      userId: updated.callerId,
      type: "CALL_LINK_UPDATED",
      title: `Посилання оновлено — ${updated.company}`,
      telegramActorName: salesName || undefined,
      telegramActorBadgeBgColor: updated.createdBy?.badgeBgColor,
      telegramActorBadgeTextColor: updated.createdBy?.badgeTextColor,
      message: [
        `${salesName} ${notifVerbPast.updatedCallLink} посилання на дзвінок.`,
        `Компанія: ${updated.company}`,
        `Тип: ${typeLabel}`,
        `Час: ${when}`,
        `Нове посилання: ${updated.callLink ?? "—"}`,
      ].join("\n"),
      payload: {
        callId: updated.id,
        company: updated.company,
        oldLink: existing.callLink,
        newLink: updated.callLink,
      },
    }).catch((err) => console.error("[notification] CALL_LINK_UPDATED", err));
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
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canMutateCall(user!, existing.createdById)) {
    return NextResponse.json(
      { error: "Немає прав на видалення цього дзвінка" },
      { status: 403 },
    );
  }

  await prisma.callSummary.updateMany({
    where: { callEventId: id },
    data: { callEventId: null },
  });

  await prisma.callEvent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
