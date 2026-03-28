import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike } from "@/lib/roles";
import { createNotification } from "@/lib/notifications";
import { callTypeLabelUk, formatNotificationDateTime } from "@/lib/notification-copy";
import { appendTransferEntry, buildCallTransferInfo } from "@/lib/transfer-history";

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

  const canAccess =
    user!.role === "ADMIN" ||
    (isSalesLike(user!.role) && call.createdById === user!.id) ||
    call.callerId === user!.id;

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
      ...(body.salaryFrom !== undefined && { salaryFrom: body.salaryFrom }),
      ...(body.salaryTo !== undefined && { salaryTo: body.salaryTo }),
      ...(body.callLink !== undefined && { callLink: body.callLink || null }),
      ...(body.description !== undefined && { description: body.description || null }),
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
      `${salesName} переніс дзвінок.`,
      `Компанія: ${updated.company}`,
      `Тип: ${typeLabel}`,
      `Було: ${fromStr}`,
      `Стало: ${toStr}`,
    ];
    if (transferredReason) lines.push(`Причина: ${transferredReason}`);
    await createNotification({
      userId: updated.callerId,
      type: "CALL_RESCHEDULED",
      title: `Дзвінок перенесено — ${updated.company}`,
      message: lines.join("\n"),
      payload: {
        callId: updated.id,
        company: updated.company,
        from: existing.callStartedAt.toISOString(),
        to: updated.callStartedAt.toISOString(),
        reason: transferredReason,
        callType: updated.callType,
        interviewerName: updated.interviewerName,
      },
    }).catch((err) => console.error("[notification] CALL_RESCHEDULED", err));
  }

  if (shouldNotifyCancelled) {
    const salesName = `${updated.createdBy?.firstName ?? ""} ${updated.createdBy?.lastName ?? ""}`.trim();
    const was = formatNotificationDateTime(existing.callStartedAt);
    const typeLabel = callTypeLabelUk(updated.callType);
    await createNotification({
      userId: updated.callerId,
      type: "CALL_CANCELLED",
      title: `Дзвінок скасовано — ${updated.company}`,
      message: [
        `${salesName} скасував дзвінок.`,
        `Компанія: ${updated.company}`,
        `Тип: ${typeLabel}`,
        `Інтерв'юер: ${updated.interviewerName}`,
        `Заплановано було на: ${was}`,
      ].join("\n"),
      payload: {
        callId: updated.id,
        company: updated.company,
        callType: updated.callType,
        interviewerName: updated.interviewerName,
        cancelledCallStartedAt: existing.callStartedAt.toISOString(),
      },
    }).catch((err) => console.error("[notification] CALL_CANCELLED", err));
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
      message: [
        `${salesName} оновив посилання на дзвінок.`,
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
  if (
    !existing ||
    (user!.role !== "ADMIN" && existing.createdById !== user!.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.callSummary.updateMany({
    where: { callEventId: id },
    data: { callEventId: null },
  });

  await prisma.callEvent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
