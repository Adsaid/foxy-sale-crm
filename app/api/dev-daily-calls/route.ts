import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike } from "@/lib/roles";
import { teamGuardResponse } from "@/lib/team-scope";
import { normalizeCallLinkForSave } from "@/lib/normalize-call-link";
import { createDevDailyCallSchema } from "@/lib/validations/dev-daily-calls";

const callerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
} as const;

export async function GET(request: Request) {
  const { error, user } = await getApiUser(
    ["SALES", "DEV", "DESIGNER", "ADMIN", "SUPER_ADMIN"],
    { request },
  );
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const where = isSalesLike(user!.role)
    ? { teamId: tg.teamId, isActive: true }
    : { callerId: user!.id, teamId: tg.teamId };

  const dailyCalls = await prisma.devDailyCall.findMany({
    where,
    include: { caller: { select: callerSelect } },
    orderBy: { callStartedAt: "asc" },
  });

  return NextResponse.json(dailyCalls);
}

export async function POST(request: Request) {
  const { error, user } = await getApiUser(["DEV", "DESIGNER"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const body = await request.json();
  const parsed = createDevDailyCallSchema.safeParse(body);
  if (!parsed.success) {
    const firstMessage = parsed.error.issues[0]?.message ?? "Некоректні дані";
    return NextResponse.json({ error: firstMessage }, { status: 400 });
  }
  const {
    title,
    description,
    callStartedAt,
    callEndedAt,
    callLink,
    recurrenceType,
    recurrenceEndDate,
  } = parsed.data;

  const startedAt = new Date(callStartedAt);
  const endedAt = callEndedAt ? new Date(callEndedAt) : null;

  const dailyCall = await prisma.devDailyCall.create({
    data: {
      teamId: tg.teamId,
      callerId: user!.id,
      title,
      description: description ?? null,
      callStartedAt: startedAt,
      callEndedAt: endedAt,
      callLink: callLink ? normalizeCallLinkForSave(callLink) : null,
      recurrenceType,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
    },
    include: { caller: { select: callerSelect } },
  });

  return NextResponse.json(dailyCall, { status: 201 });
}
