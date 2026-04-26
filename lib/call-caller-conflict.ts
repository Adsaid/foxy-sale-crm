import type { PrismaClient } from "@prisma/client";
import { formatCallTableDateTime } from "@/lib/date-kyiv";
import {
  hasOccurrenceOverlap,
  findFirstOverlappingOccurrence,
  type DevDailyCallRecord,
} from "@/lib/dev-daily-call-recurrence";

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

export type DailyCallConflictInfo = {
  id: string;
  title: string;
  occurrenceStart: Date;
};

/**
 * Чи є в іншого сейла перетин часу з цим виконавцем (той самий callerId, інший createdById).
 */
export async function findCallerConflictWithOtherSales(
  prisma: PrismaClient,
  params: {
    callerId: string;
    teamId: string;
    rangeStart: Date;
    rangeEnd: Date;
    actingCreatedById: string;
    excludeCallId?: string | null;
  },
): Promise<CallerConflictInfo | null> {
  const { callerId, teamId, rangeStart, rangeEnd, actingCreatedById, excludeCallId } = params;

  const others = await prisma.callEvent.findMany({
    where: {
      teamId,
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

/**
 * Check if the given time range overlaps with a dev's daily/recurring call.
 */
export async function findDevDailyCallConflict(
  prisma: PrismaClient,
  params: {
    callerId: string;
    teamId: string;
    rangeStart: Date;
    rangeEnd: Date;
  },
): Promise<DailyCallConflictInfo | null> {
  const { callerId, teamId, rangeStart, rangeEnd } = params;

  const dailyCalls = await prisma.devDailyCall.findMany({
    where: {
      teamId,
      callerId,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      callStartedAt: true,
      callEndedAt: true,
      recurrenceType: true,
      recurrenceEndDate: true,
      isActive: true,
    },
  });

  for (const dc of dailyCalls) {
    const record: DevDailyCallRecord = {
      id: dc.id,
      title: dc.title,
      callStartedAt: dc.callStartedAt,
      callEndedAt: dc.callEndedAt,
      recurrenceType: dc.recurrenceType,
      recurrenceEndDate: dc.recurrenceEndDate,
      isActive: dc.isActive,
    };

    if (hasOccurrenceOverlap(record, rangeStart, rangeEnd)) {
      const overlap = findFirstOverlappingOccurrence(record, rangeStart, rangeEnd);
      return {
        id: dc.id,
        title: dc.title,
        occurrenceStart: overlap?.start ?? rangeStart,
      };
    }
  }

  return null;
}

export function formatCallerConflictMessageUk(c: CallerConflictInfo): string {
  const when = formatCallTableDateTime(c.callStartedAt);
  return `Цей виконавець уже зайнятий у цей час дзвінком іншого сейла (${c.salesName}): «${c.company}», ${when}.`;
}

export function formatDailyCallConflictMessageUk(c: DailyCallConflictInfo): string {
  const when = formatCallTableDateTime(c.occurrenceStart);
  return `Цей виконавець має дейлік «${c.title}» у цей час: ${when}. Оберіть інший час.`;
}
