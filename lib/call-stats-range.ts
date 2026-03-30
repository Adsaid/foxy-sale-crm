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
import { TZDate } from "@date-fns/tz";
import { CRM_TIMEZONE } from "@/lib/date-kyiv";

function asKyiv(now: Date): TZDate {
  return TZDate.tz(CRM_TIMEZONE, now.getTime());
}

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
  const z = asKyiv(now);
  switch (preset) {
    case "all":
      return { from: null, to: null };
    case "today":
      return {
        from: startOfDay(z).toISOString(),
        to: endOfDay(z).toISOString(),
      };
    case "this_week": {
      const start = startOfDay(startOfISOWeek(z));
      const end = endOfDay(endOfISOWeek(z));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "last_week": {
      const ref = subWeeks(z, 1);
      const start = startOfDay(startOfISOWeek(ref));
      const end = endOfDay(endOfISOWeek(ref));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "this_month":
      return {
        from: startOfDay(startOfMonth(z)).toISOString(),
        to: endOfDay(endOfMonth(z)).toISOString(),
      };
    case "last_month": {
      const ref = subMonths(z, 1);
      return {
        from: startOfDay(startOfMonth(ref)).toISOString(),
        to: endOfDay(endOfMonth(ref)).toISOString(),
      };
    }
    case "custom": {
      if (!custom) return { from: null, to: null };
      const lo = minDate([custom.from, custom.to]);
      const hi = maxDate([custom.from, custom.to]);
      const loZ = asKyiv(lo);
      const hiZ = asKyiv(hi);
      return {
        from: startOfDay(loZ).toISOString(),
        to: endOfDay(hiZ).toISOString(),
      };
    }
  }
}

/** Попередній період того ж типу для порівняння на картках (не для `all` і `custom`). */
export function callStatsComparisonRangeFromPreset(
  preset: CallStatsPreset,
  now: Date
): CallStatsRangeIso | null {
  const z = asKyiv(now);
  switch (preset) {
    case "all":
    case "custom":
      return null;
    case "today": {
      const y = subDays(z, 1);
      return {
        from: startOfDay(y).toISOString(),
        to: endOfDay(y).toISOString(),
      };
    }
    case "this_week": {
      const ref = subWeeks(z, 1);
      const start = startOfDay(startOfISOWeek(ref));
      const end = endOfDay(endOfISOWeek(ref));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "last_week": {
      const ref = subWeeks(z, 2);
      const start = startOfDay(startOfISOWeek(ref));
      const end = endOfDay(endOfISOWeek(ref));
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "this_month": {
      const ref = subMonths(z, 1);
      return {
        from: startOfDay(startOfMonth(ref)).toISOString(),
        to: endOfDay(endOfMonth(ref)).toISOString(),
      };
    }
    case "last_month": {
      const ref = subMonths(z, 2);
      return {
        from: startOfDay(startOfMonth(ref)).toISOString(),
        to: endOfDay(endOfMonth(ref)).toISOString(),
      };
    }
    default:
      return null;
  }
}
