import type { CallType } from "@/types/crm";

export const DEFAULT_PLANNED_DURATION_MS = 30 * 60 * 1000;

const PLANNED_DURATION_BY_CALL_TYPE_MS: Record<CallType, number> = {
  HR: 30 * 60 * 1000,
  CLIENT: 45 * 60 * 1000,
  PM: 45 * 60 * 1000,
  TECH: 60 * 60 * 1000,
  CLIENT_TECH: 60 * 60 * 1000,
};

export function plannedDurationMsForCallType(callType: CallType | null | undefined): number {
  if (!callType) return DEFAULT_PLANNED_DURATION_MS;
  return PLANNED_DURATION_BY_CALL_TYPE_MS[callType] ?? DEFAULT_PLANNED_DURATION_MS;
}

export function defaultPlannedEnd(
  start: Date,
  callType: CallType | null | undefined = "HR",
): Date {
  return new Date(start.getTime() + plannedDurationMsForCallType(callType));
}

export function defaultPlannedEndIso(startIso: string, callType: CallType): string {
  return defaultPlannedEnd(new Date(startIso), callType).toISOString();
}

export function defaultPlannedDurationLabelUk(callType: CallType): string {
  const durationMs = plannedDurationMsForCallType(callType);
  if (durationMs === 60 * 60 * 1000) return "+1 год";
  return `+${Math.round(durationMs / (60 * 1000))} хв`;
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
  callType: CallType | null | undefined = "HR",
): Date {
  if (callEndedAt) {
    const end = callEndedAt instanceof Date ? callEndedAt : new Date(callEndedAt);
    if (!Number.isNaN(end.getTime())) return end;
  }
  return defaultPlannedEnd(start, callType);
}

export function shiftPlannedEndByStartChange(
  oldStart: Date,
  newStart: Date,
  oldEnd: Date | null,
  callType: CallType | null | undefined = "HR",
): Date {
  if (oldEnd) {
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    if (durationMs > 0) {
      return new Date(newStart.getTime() + durationMs);
    }
  }
  return defaultPlannedEnd(newStart, callType);
}

export function resolveFormPlannedEndIso(
  startIso: string,
  endIso: string | null | undefined,
  callType: CallType,
  endManuallySet: boolean,
): string {
  if (endManuallySet && endIso) {
    return endIso;
  }
  return defaultPlannedEndIso(startIso, callType);
}

export function validatePlannedEnd(start: Date, end: Date): boolean {
  return end.getTime() > start.getTime();
}
