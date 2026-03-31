import type { PrismaClient } from "@prisma/client";
import { formatCallTableDateTime } from "@/lib/date-kyiv";

/** Тривалість «слоту» дзвінка для перевірки зайнятості (як у календарі). */
export const CALL_SLOT_MS = 60 * 60 * 1000;

export function getCallOccupiedEnd(start: Date, callEndedAt: Date | null): Date {
  if (callEndedAt) return callEndedAt;
  return new Date(start.getTime() + CALL_SLOT_MS);
}

function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type CallerConflictInfo = {
  id: string;
  company: string;
  callStartedAt: Date;
  salesName: string;
};

/**
 * Чи є в іншого сейла перетин часу з цим виконавцем (той самий callerId, інший createdById).
 */
export async function findCallerConflictWithOtherSales(
  prisma: PrismaClient,
  params: {
    callerId: string;
    rangeStart: Date;
    rangeEnd: Date;
    actingCreatedById: string;
    excludeCallId?: string | null;
  },
): Promise<CallerConflictInfo | null> {
  const { callerId, rangeStart, rangeEnd, actingCreatedById, excludeCallId } = params;

  const others = await prisma.callEvent.findMany({
    where: {
      callerId,
      status: { not: "CANCELLED" },
      createdById: { not: actingCreatedById },
      ...(excludeCallId ? { id: { not: excludeCallId } } : {}),
    },
    select: {
      id: true,
      company: true,
      callStartedAt: true,
      callEndedAt: true,
      createdBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  for (const o of others) {
    const oStart = o.callStartedAt;
    const oEnd = getCallOccupiedEnd(o.callStartedAt, o.callEndedAt);
    if (intervalsOverlap(rangeStart, rangeEnd, oStart, oEnd)) {
      const salesName = `${o.createdBy?.firstName ?? ""} ${o.createdBy?.lastName ?? ""}`.trim();
      return {
        id: o.id,
        company: o.company,
        callStartedAt: o.callStartedAt,
        salesName: salesName || "—",
      };
    }
  }

  return null;
}

export function formatCallerConflictMessageUk(c: CallerConflictInfo): string {
  const when = formatCallTableDateTime(c.callStartedAt);
  return `Цей виконавець уже зайнятий у цей час дзвінком іншого сейла (${c.salesName}): «${c.company}», ${when}.`;
}
