export const DEFAULT_PLANNED_DURATION_MS = 30 * 60 * 1000;

export function defaultPlannedEnd(start: Date): Date {
  return new Date(start.getTime() + DEFAULT_PLANNED_DURATION_MS);
}

/** If picker gave time on another day, keep the picked HH:mm but align date to start day. */
export function normalizeEndByStart(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return endIso;

  if (start.toDateString() !== end.toDateString()) {
    const aligned = new Date(start);
    aligned.setHours(end.getHours(), end.getMinutes(), 0, 0);
    return aligned.toISOString();
  }

  return endIso;
}

export function resolvePlannedEnd(
  start: Date,
  callEndedAt: string | Date | null | undefined,
): Date {
  if (callEndedAt) {
    const end = callEndedAt instanceof Date ? callEndedAt : new Date(callEndedAt);
    if (!Number.isNaN(end.getTime())) return end;
  }
  return defaultPlannedEnd(start);
}

export function shiftPlannedEndByStartChange(
  oldStart: Date,
  newStart: Date,
  oldEnd: Date | null,
): Date {
  if (oldEnd) {
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    if (durationMs > 0) {
      return new Date(newStart.getTime() + durationMs);
    }
  }
  return defaultPlannedEnd(newStart);
}

export function validatePlannedEnd(start: Date, end: Date): boolean {
  return end.getTime() > start.getTime();
}
