import {
  endOfDay,
  endOfISOWeek,
  endOfMonth,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfISOWeek,
  startOfMonth,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type CallStatsPreset =
  | "all"
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

export interface CallStatsRangeIso {
  from: string | null;
  to: string | null;
}

/** Діапазон для API (ISO). Для `custom` передайте обидві дати; інакше поверне null-дати — клієнт не має викликати API. */
export function callStatsRangeFromPreset(
  preset: CallStatsPreset,
  now: Date,
  custom: { from: Date; to: Date } | null
): CallStatsRangeIso {
  switch (preset) {
    case "all":
      return { from: null, to: null };
    case "today":
      return {
        from: startOfDay(now).toISOString(),
        to: endOfDay(now).toISOString(),
      };
    case "this_week": {
      const start = startOfDay(startOfISOWeek(now));
      const end = endOfDay(endOfISOWeek(now));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "last_week": {
      const ref = subWeeks(now, 1);
      const start = startOfDay(startOfISOWeek(ref));
      const end = endOfDay(endOfISOWeek(ref));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "this_month":
      return {
        from: startOfDay(startOfMonth(now)).toISOString(),
        to: endOfDay(endOfMonth(now)).toISOString(),
      };
    case "last_month": {
      const ref = subMonths(now, 1);
      return {
        from: startOfDay(startOfMonth(ref)).toISOString(),
        to: endOfDay(endOfMonth(ref)).toISOString(),
      };
    }
    case "custom": {
      if (!custom) return { from: null, to: null };
      const lo = minDate([custom.from, custom.to]);
      const hi = maxDate([custom.from, custom.to]);
      return {
        from: startOfDay(lo).toISOString(),
        to: endOfDay(hi).toISOString(),
      };
    }
  }
}

/** Попередній період того ж типу для порівняння на картках (не для `all` і `custom`). */
export function callStatsComparisonRangeFromPreset(
  preset: CallStatsPreset,
  now: Date
): CallStatsRangeIso | null {
  switch (preset) {
    case "all":
    case "custom":
      return null;
    case "today": {
      const y = subDays(now, 1);
      return {
        from: startOfDay(y).toISOString(),
        to: endOfDay(y).toISOString(),
      };
    }
    case "this_week": {
      const ref = subWeeks(now, 1);
      const start = startOfDay(startOfISOWeek(ref));
      const end = endOfDay(endOfISOWeek(ref));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "last_week": {
      const ref = subWeeks(now, 2);
      const start = startOfDay(startOfISOWeek(ref));
      const end = endOfDay(endOfISOWeek(ref));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "this_month": {
      const ref = subMonths(now, 1);
      return {
        from: startOfDay(startOfMonth(ref)).toISOString(),
        to: endOfDay(endOfMonth(ref)).toISOString(),
      };
    }
    case "last_month": {
      const ref = subMonths(now, 2);
      return {
        from: startOfDay(startOfMonth(ref)).toISOString(),
        to: endOfDay(endOfMonth(ref)).toISOString(),
      };
    }
    default:
      return null;
  }
}
