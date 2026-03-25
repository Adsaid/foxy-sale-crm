import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiUser } from "@/lib/api-auth";

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
      caller: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
