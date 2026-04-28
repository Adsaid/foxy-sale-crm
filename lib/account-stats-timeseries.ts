import { addDays, differenceInCalendarDays, format, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";
import { uk } from "date-fns/locale";
import type { AccountOperationalStatus, AccountType } from "@prisma/client";
import {
  calendarDateKeyInTz,
  listCalendarDaysInRange,
  listHourBucketsInRange,
  hourKeyInTz,
  yearMonthKeyInTz,
} from "@/lib/stats-buckets-tz";

export interface AccountTimeseriesRow {
  createdAt: Date;
  type: AccountType;
  operationalStatus: AccountOperationalStatus | null;
}

export interface AccountTimeseriesPoint {
  key: string;
  label: string;
  total: number;
  upwork: number;
  linkedin: number;
  active: number;
  paused: number;
  setup: number;
  warming: number;
  limited: number;
  noOperationalStatus: number;
}

export interface AccountTimeseriesBuildOptions {
  timeZone: string;
  granularity?: "hour" | "day";
}

type Bucket = {
  total: number;
  upwork: number;
  linkedin: number;
  active: number;
  paused: number;
  setup: number;
  warming: number;
  limited: number;
  noStatus: number;
};

function emptyBucket(): Bucket {
  return {
    total: 0,
    upwork: 0,
    linkedin: 0,
    active: 0,
    paused: 0,
    setup: 0,
    warming: 0,
    limited: 0,
    noStatus: 0,
  };
}

function buildBuckets(keys: string[]): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const k of keys) {
    map.set(k, emptyBucket());
  }
  return map;
}

function ingestStatus(b: Bucket, status: AccountOperationalStatus | null) {
  if (status === "ACTIVE") b.active += 1;
  else if (status === "PAUSED") b.paused += 1;
  else if (status === "SETUP") b.setup += 1;
  else if (status === "WARMING") b.warming += 1;
  else if (status === "LIMITED") b.limited += 1;
  else b.noStatus += 1;
}

function ingest(map: Map<string, Bucket>, row: AccountTimeseriesRow, bucketKey: string) {
  const b = map.get(bucketKey);
  if (!b) return;
  b.total += 1;
  if (row.type === "UPWORK") b.upwork += 1;
  else if (row.type === "LINKEDIN") b.linkedin += 1;
  ingestStatus(b, row.operationalStatus);
}

function bucketToPoint(key: string, label: string, v: Bucket): AccountTimeseriesPoint {
  return {
    key,
    label,
    total: v.total,
    upwork: v.upwork,
    linkedin: v.linkedin,
    active: v.active,
    paused: v.paused,
    setup: v.setup,
    warming: v.warming,
    limited: v.limited,
    noOperationalStatus: v.noStatus,
  };
}

function toSortedPoints(
  keys: string[],
  map: Map<string, Bucket>,
  labelForKey: (key: string) => string
): AccountTimeseriesPoint[] {
  return keys.map((key) => bucketToPoint(key, labelForKey(key), map.get(key)!));
}

function isoWeekKey(d: Date): string {
  return `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
}

function buildDaily(
  rows: AccountTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): AccountTimeseriesPoint[] {
  const keys = listCalendarDaysInRange(rangeFrom, rangeTo, timeZone);
  const map = buildBuckets(keys);
  for (const row of rows) {
    ingest(map, row, calendarDateKeyInTz(row.createdAt, timeZone));
  }
  return toSortedPoints(keys, map, (key) =>
    format(new Date(`${key}T12:00:00.000Z`), "d MMM", { locale: uk })
  );
}

function buildHourly(
  rows: AccountTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): AccountTimeseriesPoint[] {
  const buckets = listHourBucketsInRange(rangeFrom, rangeTo, timeZone);
  const map = buildBuckets(buckets.map((b) => b.key));
  for (const row of rows) {
    ingest(map, row, hourKeyInTz(row.createdAt, timeZone));
  }
  return buckets.map(({ key, label }) =>
    bucketToPoint(key, label, map.get(key)!)
  );
}

function buildWeekly(
  rows: AccountTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): AccountTimeseriesPoint[] {
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
    const cal = calendarDateKeyInTz(row.createdAt, timeZone);
    const [y, mo, d] = cal.split("-").map(Number);
    const ref = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
    ingest(map, row, isoWeekKey(ref));
  }
  return meta.map(({ key, label }) => bucketToPoint(key, label, map.get(key)!));
}

function buildMonthly(
  rows: AccountTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  timeZone: string
): AccountTimeseriesPoint[] {
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
    ingest(map, row, yearMonthKeyInTz(row.createdAt, timeZone));
  }
  return toSortedPoints(monthKeys, map, (key) =>
    format(new Date(`${key}-01T12:00:00.000Z`), "LLL yyyy", { locale: uk })
  );
}

function fallbackPoint(rangeFrom: Date, timeZone: string): AccountTimeseriesPoint[] {
  const key = calendarDateKeyInTz(rangeFrom, timeZone);
  const empty = emptyBucket();
  return [
    bucketToPoint(
      key,
      format(new Date(`${key}T12:00:00.000Z`), "d MMM yyyy", { locale: uk }),
      empty
    ),
  ];
}

export function buildAccountTimeseriesPoints(
  rows: AccountTimeseriesRow[],
  rangeFrom: Date,
  rangeTo: Date,
  explicitDateFilter: boolean,
  options: AccountTimeseriesBuildOptions
): AccountTimeseriesPoint[] {
  const { timeZone, granularity } = options;

  if (granularity === "hour") {
    const points = buildHourly(rows, rangeFrom, rangeTo, timeZone);
    return points.length > 0 ? points : fallbackPoint(rangeFrom, timeZone);
  }

  const daySpan = Math.max(1, differenceInCalendarDays(rangeTo, rangeFrom) + 1);

  let points: AccountTimeseriesPoint[];
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
