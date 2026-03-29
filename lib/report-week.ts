import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  max as maxDate,
  min as minDate,
  startOfISOWeek,
} from "date-fns";
import { uk } from "date-fns/locale";

/** Для фільтра API: усі ISO-тижні, які перетинають обраний календарний діапазон (без toISOString / зсувів TZ). */
export function isoWeeksCsvFromDateRange(
  range: { from?: Date | undefined; to?: Date | undefined } | undefined
): string | undefined {
  if (!range?.from) return undefined;
  const end = range.to ?? range.from;
  const startMonday = startOfISOWeek(minDate([range.from, end]));
  const endMonday = startOfISOWeek(maxDate([range.from, end]));
  const keys = new Set<string>();
  let d = startMonday;
  const endTime = endMonday.getTime();
  while (d.getTime() <= endTime) {
    keys.add(`${getISOWeekYear(d)}-${getISOWeek(d)}`);
    d = addWeeks(d, 1);
  }
  if (keys.size === 0) return undefined;
  return [...keys].sort().join(",");
}

export function getReportWeekFields(d: Date) {
  const weekStart = startOfISOWeek(d);
  return {
    weekYear: getISOWeekYear(d),
    weekNumber: getISOWeek(d),
    weekStart,
  };
}

export function formatWeekRangeLabelFromStart(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${format(weekStart, "d MMM", { locale: uk })} – ${format(end, "d MMM yyyy", { locale: uk })}`;
}
