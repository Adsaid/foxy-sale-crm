import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import { teamGuardResponse } from "@/lib/team-scope";
import {
  buildCallEventDetailFromSummary,
  callDetailInclude,
} from "@/lib/build-call-detail-for-sheet";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { id } = await params;
  const summary = await prisma.callSummary.findFirst({
    where: { id, teamId: tg.teamId },
  });

  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user!.role !== "ADMIN" && user!.role !== "SUPER_ADMIN" && summary.createdById !== user!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const call = summary.callEventId
    ? await prisma.callEvent.findFirst({
        where: { id: summary.callEventId, teamId: tg.teamId },
        include: callDetailInclude,
      })
    : null;

  const payload = await buildCallEventDetailFromSummary(summary, call);

  return NextResponse.json(payload);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["ADMIN", "SUPER_ADMIN"], { request });
  if (error) return error;
  const tg = teamGuardResponse(user!);
  if (tg.error) return tg.error;

  const { id } = await params;

  const existing = await prisma.callSummary.findFirst({ where: { id, teamId: tg.teamId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.callSummary.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
