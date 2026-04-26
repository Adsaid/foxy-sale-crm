export type RecurrenceTypeLike = "NONE" | "WEEKLY";

export interface DevDailyCallRecord {
  id: string;
  callStartedAt: Date;
  callEndedAt: Date | null;
  recurrenceType: RecurrenceTypeLike;
  recurrenceEndDate: Date | null;
  isActive: boolean;
  title: string;
}

export interface ExpandedOccurrence {
  dailyCallId: string;
  title: string;
  start: Date;
  end: Date;
}

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

function getDuration(record: DevDailyCallRecord): number {
  if (record.callEndedAt) {
    return record.callEndedAt.getTime() - record.callStartedAt.getTime();
  }
  return DEFAULT_DURATION_MS;
}

/**
 * Expand a recurring DevDailyCall into individual occurrences
 * within [viewStart, viewEnd].
 */
export function expandOccurrences(
  record: DevDailyCallRecord,
  viewStart: Date,
  viewEnd: Date,
): ExpandedOccurrence[] {
  if (!record.isActive) return [];

  const duration = getDuration(record);
  const baseStart = record.callStartedAt;

  if (record.recurrenceType === "NONE") {
    const end = new Date(baseStart.getTime() + duration);
    if (end <= viewStart || baseStart >= viewEnd) return [];
    return [{ dailyCallId: record.id, title: record.title, start: baseStart, end }];
  }

  if (record.recurrenceType === "WEEKLY") {
    return expandWeekly(record, duration, viewStart, viewEnd);
  }

  return [];
}

function expandWeekly(
  record: DevDailyCallRecord,
  duration: number,
  viewStart: Date,
  viewEnd: Date,
): ExpandedOccurrence[] {
  const baseStart = record.callStartedAt;
  const dayOfWeek = baseStart.getUTCDay();
  const timeOfDayMs =
    baseStart.getUTCHours() * 3600000 +
    baseStart.getUTCMinutes() * 60000 +
    baseStart.getUTCSeconds() * 1000;

  const results: ExpandedOccurrence[] = [];
  const WEEK_MS = 7 * 24 * 3600000;

  const effectiveEnd = record.recurrenceEndDate
    ? new Date(Math.min(record.recurrenceEndDate.getTime(), viewEnd.getTime()))
    : viewEnd;

  const candidate = new Date(viewStart);
  candidate.setUTCHours(0, 0, 0, 0);
  const diff = ((dayOfWeek - candidate.getUTCDay()) % 7 + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + diff);
  const startMs = candidate.getTime() + timeOfDayMs;
  let current = startMs;

  while (current < baseStart.getTime()) {
    current += WEEK_MS;
  }

  const MAX_OCCURRENCES = 200;
  let count = 0;

  while (count < MAX_OCCURRENCES) {
    const occStart = new Date(current);
    const occEnd = new Date(current + duration);

    if (occStart > effectiveEnd) break;

    if (occEnd > viewStart && occStart < viewEnd) {
      results.push({
        dailyCallId: record.id,
        title: record.title,
        start: occStart,
        end: occEnd,
      });
    }

    current += WEEK_MS;
    count++;
  }

  return results;
}

/**
 * Check if a given time range [rangeStart, rangeEnd) overlaps
 * with any occurrence of a DevDailyCall.
 */
export function hasOccurrenceOverlap(
  record: DevDailyCallRecord,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const searchStart = new Date(rangeStart.getTime() - 7 * 24 * 3600000);
  const searchEnd = new Date(rangeEnd.getTime() + 7 * 24 * 3600000);
  const occurrences = expandOccurrences(record, searchStart, searchEnd);

  return occurrences.some(
    (occ) => occ.start < rangeEnd && rangeStart < occ.end,
  );
}

export function findFirstOverlappingOccurrence(
  record: DevDailyCallRecord,
  rangeStart: Date,
  rangeEnd: Date,
): ExpandedOccurrence | null {
  const searchStart = new Date(rangeStart.getTime() - 7 * 24 * 3600000);
  const searchEnd = new Date(rangeEnd.getTime() + 7 * 24 * 3600000);
  const occurrences = expandOccurrences(record, searchStart, searchEnd);
  return (
    occurrences.find((occ) => occ.start < rangeEnd && rangeStart < occ.end) ??
    null
  );
}
