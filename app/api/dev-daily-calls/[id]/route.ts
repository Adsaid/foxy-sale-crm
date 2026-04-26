import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike } from "@/lib/roles";
import { teamGuardResponse } from "@/lib/team-scope";
import { normalizeCallLinkForSave } from "@/lib/normalize-call-link";
import { updateDevDailyCallSchema } from "@/lib/validations/dev-daily-calls";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await getApiUser(
    ["DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"],
    { request },
  );
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateDevDailyCallSchema.safeParse(body);
  if (!parsed.success) {
    const firstMessage = parsed.error.issues[0]?.message ?? "Некоректні дані";
    return NextResponse.json({ error: firstMessage }, { status: 400 });
  }
  const payload = parsed.data;

  const existing = await prisma.devDailyCall.findFirst({
    where: { id, teamId: tg.teamId },
  });
  const isAdmin = user!.role === "ADMIN" || user!.role === "SUPER_ADMIN";
  const isOwner = existing?.callerId === user!.id;
  if (!existing || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const effectiveStartedAt =
    payload.callStartedAt !== undefined
      ? new Date(payload.callStartedAt)
      : existing.callStartedAt;
  if (Number.isNaN(effectiveStartedAt.getTime())) {
    return NextResponse.json({ error: "Некоректний час початку" }, { status: 400 });
  }
  const effectiveEndedAt =
    payload.callEndedAt !== undefined
      ? payload.callEndedAt
        ? new Date(payload.callEndedAt)
        : null
      : existing.callEndedAt;
  if (
    effectiveEndedAt &&
    (Number.isNaN(effectiveEndedAt.getTime()) || effectiveEndedAt <= effectiveStartedAt)
  ) {
    return NextResponse.json(
      { error: "Час завершення має бути пізніше за час початку" },
      { status: 400 },
    );
  }
  const effectiveRecurrenceEndDate =
    payload.recurrenceEndDate !== undefined
      ? payload.recurrenceEndDate
        ? new Date(payload.recurrenceEndDate)
        : null
      : existing.recurrenceEndDate;
  if (
    effectiveRecurrenceEndDate &&
    (Number.isNaN(effectiveRecurrenceEndDate.getTime()) ||
      effectiveRecurrenceEndDate < effectiveStartedAt)
  ) {
    return NextResponse.json(
      { error: "Кінець повторюваності не може бути раніше початку" },
      { status: 400 },
    );
  }

  if (payload.title !== undefined) data.title = payload.title;
  if (payload.description !== undefined)
    data.description = payload.description ?? null;
  if (payload.callStartedAt !== undefined) data.callStartedAt = effectiveStartedAt;
  if (payload.callEndedAt !== undefined) data.callEndedAt = effectiveEndedAt;
  if (payload.callLink !== undefined)
    data.callLink = payload.callLink
      ? normalizeCallLinkForSave(payload.callLink)
      : null;
  if (payload.recurrenceType !== undefined)
    data.recurrenceType = payload.recurrenceType;
  if (payload.recurrenceEndDate !== undefined)
    data.recurrenceEndDate = effectiveRecurrenceEndDate;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;

  const updated = await prisma.devDailyCall.update({
    where: { id },
    data,
    include: {
      caller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, user } = await getApiUser(
    ["DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"],
    { request },
  );
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { id } = await params;

  const existing = await prisma.devDailyCall.findFirst({
    where: { id, teamId: tg.teamId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = existing.callerId === user!.id;
  const isAdmin = isSalesLike(user!.role);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.devDailyCall.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
