import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { callTypeLabelUk, formatNotificationDateTime } from "@/lib/notification-copy";

/**
 * Виклик ззовні (cron-job.org, GitHub Actions тощо).
 * Якщо задано CRON_SECRET — обов’язкова перевірка одним із способів:
 * - Authorization: Bearer <CRON_SECRET>
 * - X-Cron-Secret: <CRON_SECRET> (зручно в cron-job.org → Headers)
 */
function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const xCron = request.headers.get("x-cron-secret");
  if (xCron === secret) return true;
  return false;
}

export async function GET(request: Request) {
  if (process.env.CRON_SECRET && !isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const target = new Date(now.getTime() + 20 * 60 * 1000);

  // Find calls that start within the next 20 minutes.
  // Краще викликати часто (кожні 1–5 хв); рідше — ризик пізнішого нагадування в межах 20 хв до дзвінка.
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

  for (const call of calls) {
    const whenFull = formatNotificationDateTime(call.callStartedAt);
    const typeLabel = callTypeLabelUk(call.callType);

    const receivers = [...new Set([call.callerId, call.createdById])];
    const startIso = call.callStartedAt.toISOString();
    for (const userId of receivers) {
      // Час у ключі: після переносу дзвінка — нове нагадування; без дублікатів у межах одного слоту.
      const dedupeKey = `CALL_STARTING_SOON:${userId}:${call.id}:${startIso}`;
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

