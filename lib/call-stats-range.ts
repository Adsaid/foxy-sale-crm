import {
  endOfDay,
  endOfISOWeek,
  endOfMonth,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfISOWeek,
  startOfMonth,
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
      const start = startOfISOWeek(now);
      const end = endOfISOWeek(now);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "last_week": {
      const ref = subWeeks(now, 1);
      const start = startOfISOWeek(ref);
      const end = endOfISOWeek(ref);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "this_month":
      return {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
      };
    case "last_month": {
      const ref = subMonths(now, 1);
      return {
        from: startOfMonth(ref).toISOString(),
        to: endOfMonth(ref).toISOString(),
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
