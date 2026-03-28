import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { callTypeLabelUk, formatNotificationDateTime } from "@/lib/notification-copy";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const target = new Date(now.getTime() + 20 * 60 * 1000);

  // Find calls that start within the next 20 minutes.
  // This endpoint is intended to be invoked frequently (e.g. every 1 minute).
  const calls = await prisma.callEvent.findMany({
    where: {
      status: "SCHEDULED",
      callStartedAt: {
        gt: now,
        lte: target,
      },
    },
    select: {
      id: true,
      company: true,
      callType: true,
      callStartedAt: true,
      interviewerName: true,
      callerId: true,
      createdById: true,
    },
    take: 200,
  });

  let created = 0;
  let skipped = 0;

  const adminIds = (
    await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })
  ).map((u) => u.id);

  for (const call of calls) {
    const whenFull = formatNotificationDateTime(call.callStartedAt);
    const typeLabel = callTypeLabelUk(call.callType);

    const receivers = [...new Set([call.callerId, call.createdById, ...adminIds])];
    for (const userId of receivers) {
      const dedupeKey = `CALL_STARTING_SOON:${userId}:${call.id}`;
      const already = await prisma.notification.findFirst({
        where: { dedupeKey },
        select: { id: true },
      });
      if (already) {
        skipped += 1;
        continue;
      }
      await createNotification({
        userId,
        type: "CALL_STARTING_SOON",
        title: `Через 20 хв — ${call.company}`,
        message: [
          `Дзвінок о ${whenFull} (за ~20 хв).`,
          `Компанія: ${call.company}`,
          `Тип: ${typeLabel}`,
          `Інтерв'юер: ${call.interviewerName}`,
        ].join("\n"),
        payload: {
          callId: call.id,
          company: call.company,
          callType: call.callType,
          callStartedAt: call.callStartedAt.toISOString(),
          interviewerName: call.interviewerName,
          minutes: 20,
        },
        dedupeKey,
      });
      created += 1;
    }
  }

  return NextResponse.json({ ok: true, created, skipped, checked: calls.length });
}

