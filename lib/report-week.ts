import { addDays, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { uk } from "date-fns/locale";

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
