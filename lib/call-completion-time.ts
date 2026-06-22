import { CRM_TIMEZONE } from "@/lib/date-kyiv";
import { defaultPlannedEnd } from "@/lib/call-planned-end";
import type { CallType } from "@/types/crm";

/**
 * Дзвінок «заднім числом»: дата початку в календарі Києва раніше за сьогодні.
 * Тоді час завершення не беремо як «зараз», а як орієнтовний кінець
 * (або дефолт за типом дзвінка).
 */
export function isCallStartedBeforeTodayKyiv(start: Date): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CRM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(start) < fmt.format(new Date());
}

export function resolveBackdatedCallEndedAt(
  start: Date,
  plannedEnd: Date | null,
  callType: CallType | null | undefined = "HR",
): Date {
  if (plannedEnd && plannedEnd.getTime() > start.getTime()) {
    return plannedEnd;
  }
  return defaultPlannedEnd(start, callType);
}
