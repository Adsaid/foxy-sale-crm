import { addDays, differenceInCalendarDays, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { uk } from "date-fns/locale";
import {
  calendarDateKeyInTz,
  listCalendarDaysInRange,
  listHourBucketsInRange,
  hourKeyInTz,
  yearMonthKeyInTz,
} from "@/lib/stats-buckets-tz";

export interface CallTimeseriesRow {
  callStartedAt: Date;
  outcome: string;
}

export interface CallTimeseriesPoint {
  key: string;
  label: string;
  total: number;
  success: number;
  unsuccessful: number;
}

export interface CallTimeseriesBuildOptions {
  timeZone: string;
  granularity?: "hour" | "day";
}

function buildBuckets(keys: string[]): Map<string, { total: number; success: number; unsuccessful: number }> {
  const map = new Map<string, { total: number; success: number; unsuccessful: number }>();
  for (const k of keys) {
    map.set(k, { total: 0, success: 0, unsuccessful: 0 });
  }
  return map;
}

function ingest(
  map: Map<string, { total: number; success: number; unsuccessful: number }>,
  row: CallTimeseriesRow,
  bucketKey: string
) {
  const b = map.get(bucketKey);
  if (!b) return;
  b.total += 1;
  if (row.outcome === "SUCCESS") b.success += 1;
  else if (row.outcome === "UNSUCCESSFUL") b.unsuccessful += 1;
}

function toSortedPoints(
  keys: string[],
  map: Map<string, { total: number; success: number; unsuccessful: number }>,
  labelForKey: (key: string) => string
): CallTimeseriesPoint[] {
  return keys.map((key) => {
    const v = map.get(key)!;
    return {
      key,
      label: labelForKey(key),
      total: v.total,
      success: v.success,
      unsuccessful: v.unsuccessful,
    };
  });
}

function isoWeekKey(d: Date): string {
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
}

function buildDaily(
  rows: CallTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): CallTimeseriesPoint[] {
  const keys = listCalendarDaysInRange(rangeFrom, rangeTo, timeZone);
  const map = buildBuckets(keys);
  for (const row of rows) {
    ingest(map, row, calendarDateKeyInTz(row.callStartedAt, timeZone));
  }
  return toSortedPoints(keys, map, (key) =>
    format(new Date(`${key}T12:00:00.000Z`), "d MMM", { locale: uk })
  );
}

function buildHourly(
  rows: CallTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): CallTimeseriesPoint[] {
  const buckets = listHourBucketsInRange(rangeFrom, rangeTo, timeZone);
  const map = buildBuckets(buckets.map((b) => b.key));
  for (const row of rows) {
    ingest(map, row, hourKeyInTz(row.callStartedAt, timeZone));
  }
  return buckets.map(({ key, label }) => {
    const v = map.get(key)!;
    return { key, label, total: v.total, success: v.success, unsuccessful: v.unsuccessful };
  });
}

function buildWeekly(
  rows: CallTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): CallTimeseriesPoint[] {
  const days = listCalendarDaysInRange(rangeFrom, rangeTo, timeZone);
  const meta: { key: string; label: string }[] = [];
  const seenW = new Set<string>();
  for (const dayKey of days) {
    const [Y, M, D] = dayKey.split("-").map(Number);
    const ref = new Date(Date.UTC(Y, M - 1, D, 12, 0, 0));
    const wk = isoWeekKey(ref);
    if (seenW.has(wk)) continue;
    seenW.add(wk);
    const weekStart = startOfISOWeek(ref);
    const label = `${format(weekStart, "d MMM", { locale: uk })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: uk })}`;
    meta.push({ key: wk, label });
  }
  const keys = meta.map((m) => m.key);
  const map = buildBuckets(keys);
  for (const row of rows) {
    const cal = calendarDateKeyInTz(row.callStartedAt, timeZone);
    const [y, mo, d] = cal.split("-").map(Number);
    const ref = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
    ingest(map, row, isoWeekKey(ref));
  }
  return meta.map(({ key, label }) => {
    const v = map.get(key)!;
    return { key, label, total: v.total, success: v.success, unsuccessful: v.unsuccessful };
  });
}

function buildMonthly(
  rows: CallTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): CallTimeseriesPoint[] {
  const days = listCalendarDaysInRange(rangeFrom, rangeTo, timeZone);
  const monthKeys: string[] = [];
  const seen = new Set<string>();
  for (const dayKey of days) {
    const mk = dayKey.slice(0, 7);
    if (!seen.has(mk)) {
      seen.add(mk);
      monthKeys.push(mk);
    }
  }
  const map = buildBuckets(monthKeys);
  for (const row of rows) {
    ingest(map, row, yearMonthKeyInTz(row.callStartedAt, timeZone));
  }
  return toSortedPoints(monthKeys, map, (key) =>
    format(new Date(`${key}-01T12:00:00.000Z`), "LLL yyyy", { locale: uk })
  );
}

function fallbackPoint(rangeFrom: Date, timeZone: string): CallTimeseriesPoint[] {
  const key = calendarDateKeyInTz(rangeFrom, timeZone);
  return [
    {
      key,
      label: format(new Date(`${key}T12:00:00.000Z`), "d MMM yyyy", { locale: uk }),
      total: 0,
      success: 0,
      unsuccessful: 0,
    },
  ];
}

/**
 * Розбивка: `granularity=hour` — по годинах (пресет «Сьогодні» або один день у «Свій період»).
 * Інакше: явний діапазон ≤120 днів — по днях; >120 — по тижнях.
 * «Увесь час» без явних дат: >120 днів охоплення — по місяцях.
 * Бакети рахуються в `timeZone` (IANA з клієнта).
 */
export function buildCallTimeseriesPoints(
  rows: CallTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  explicitDateFilter: boolean,
  options: CallTimeseriesBuildOptions
): CallTimeseriesPoint[] {
  const { timeZone, granularity } = options;

  if (granularity === "hour") {
    const points = buildHourly(rows, rangeFrom, rangeTo, timeZone);
    return points.length > 0 ? points : fallbackPoint(rangeFrom, timeZone);
  }

  const daySpan = Math.max(1, differenceInCalendarDays(rangeTo, rangeFrom) + 1);

  let points: CallTimeseriesPoint[];
  if (!explicitDateFilter && daySpan > 120) {
    points = buildMonthly(rows, rangeFrom, rangeTo, timeZone);
  } else if (explicitDateFilter && daySpan > 120) {
    points = buildWeekly(rows, rangeFrom, rangeTo, timeZone);
  } else {
    points = buildDaily(rows, rangeFrom, rangeTo, timeZone);
  }

  if (points.length === 0) {
    return fallbackPoint(rangeFrom, timeZone);
  }
  return points;
}
