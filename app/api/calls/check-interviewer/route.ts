import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { isSalesLike } from "@/lib/roles";
import { normalizeInterviewerName } from "@/lib/interviewer-name";
import type { CallType, CallStatus, CallOutcome } from "@prisma/client";
import { teamGuardResponse } from "@/lib/team-scope";

export async function GET(request: Request) {
  const { error, user } = await getApiUser(["SALES", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { searchParams } = new URL(request.url);
  const rawName = searchParams.get("name") ?? "";
  const target = normalizeInterviewerName(rawName);

  if (!target) {
    return NextResponse.json({ matches: [] });
  }

  const scopeWhere = isSalesLike(user!.role)
    ? { teamId: tg.teamId }
    : { createdById: user!.id, teamId: tg.teamId };

  const [events, summaries] = await Promise.all([
    prisma.callEvent.findMany({
      where: scopeWhere,
      select: {
        id: true,
        company: true,
        interviewerName: true,
        callType: true,
        callStartedAt: true,
        status: true,
        outcome: true,
        caller: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.callSummary.findMany({
      where: scopeWhere,
      select: {
        id: true,
        company: true,
        interviewerName: true,
        callType: true,
        callStartedAt: true,
        outcome: true,
        callerFirstName: true,
        callerLastName: true,
      },
    }),
  ]);

  type Match = {
    source: "active" | "history";
    id: string;
    company: string;
    interviewerName: string;
    callType: CallType;
    callStartedAt: string;
    devName: string;
    status?: CallStatus;
    outcome?: CallOutcome;
  };

  const matches: Match[] = [];

  for (const e of events) {
    if (normalizeInterviewerName(e.interviewerName) !== target) continue;
    const devName = `${e.caller.firstName} ${e.caller.lastName}`.trim();
    matches.push({
      source: "active",
      id: e.id,
      company: e.company,
      interviewerName: e.interviewerName,
      callType: e.callType,
      callStartedAt: e.callStartedAt.toISOString(),
      devName,
      status: e.status,
      outcome: e.outcome,
    });
  }

  for (const s of summaries) {
    if (normalizeInterviewerName(s.interviewerName) !== target) continue;
    const devName = `${s.callerFirstName} ${s.callerLastName}`.trim();
    matches.push({
      source: "history",
      id: s.id,
      company: s.company,
      interviewerName: s.interviewerName,
      callType: s.callType,
      callStartedAt: s.callStartedAt.toISOString(),
      devName,
      outcome: s.outcome,
    });
  }

  matches.sort(
    (a, b) => new Date(b.callStartedAt).getTime() - new Date(a.callStartedAt).getTime()
  );

  return NextResponse.json({ matches });
}
