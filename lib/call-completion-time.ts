import { CRM_TIMEZONE } from "@/lib/date-kyiv";
import { defaultPlannedEnd } from "@/lib/call-planned-end";

/**
 * Дзвінок «заднім числом»: дата початку в календарі Києва раніше за сьогодні.
 * Тоді час завершення не беремо як «зараз», а як орієнтовний кінець (або дефолт +30 хв).
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
): Date {
  if (plannedEnd && plannedEnd.getTime() > start.getTime()) {
    return plannedEnd;
  }
  return defaultPlannedEnd(start);
}
