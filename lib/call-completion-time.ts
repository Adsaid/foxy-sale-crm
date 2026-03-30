import { CRM_TIMEZONE } from "@/lib/date-kyiv";

/**
 * Дзвінок «заднім числом»: дата початку в календарі Києва раніше за сьогодні.
 * Тоді час завершення не беремо як «зараз», а як початок + 1 год, щоб не було
 * штучної тривалості в кілька днів.
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

export function callEndedAtOneHourAfterStart(start: Date): Date {
  return new Date(start.getTime() + 60 * 60 * 1000);
}
