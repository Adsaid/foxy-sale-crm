import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";
import {
  buildCallEventDetailFromSummary,
  callDetailInclude,
} from "@/lib/build-call-detail-for-sheet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await getApiUser(["SALES", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const summary = await prisma.callSummary.findUnique({
    where: { id },
  });

  if (!summary) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user!.role !== "ADMIN" && summary.createdById !== user!.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const call = summary.callEventId
    ? await prisma.callEvent.findUnique({
        where: { id: summary.callEventId },
        include: callDetailInclude,
      })
    : null;

  const payload = await buildCallEventDetailFromSummary(summary, call);

  return NextResponse.json(payload);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await getApiUser(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.callSummary.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.callSummary.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
