/** Допоміжні функції для бакетів графіка в календарному часовому поясі користувача (IANA), через Intl. */

const SAFE_TZ_RE = /^[A-Za-z0-9_\/+-]+$/;

export function sanitizeTimeZone(tz: string | null | undefined): string {
  const t = (tz ?? "UTC").trim();
  if (t.length > 80 || !SAFE_TZ_RE.test(t)) return "UTC";
  try {
    Intl.DateTimeFormat(undefined, { timeZone: t });
    return t;
  } catch {
    return "UTC";
  }
}

export function calendarDateKeyInTz(iso: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(iso);
}

/** Унікальні календарні дні (YYYY-MM-DD) у TZ між from та to включно. */
export function listCalendarDaysInRange(from: Date, to: Date, timeZone: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  /** Крок 1 год: достатньо, щоб перетнути будь-який календарний день у TZ; менше ітерацій, ніж 15 хв на довгих діапазонах. */
  const step = 60 * 60 * 1000;
  for (let t = from.getTime(); t <= to.getTime(); t += step) {
    const k = calendarDateKeyInTz(new Date(t), timeZone);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  const last = calendarDateKeyInTz(to, timeZone);
  if (!seen.has(last)) {
    keys.push(last);
  }
  keys.sort();
  return keys;
}

/** Стабільний ключ години в TZ: YYYY-MM-DD-HH (24h, з ведучими нулями). */
export function hourKeyInTz(iso: Date, timeZone: string): string {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const p = f.formatToParts(iso);
  const g = (type: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === type)?.value ?? "";
  const h = g("hour").padStart(2, "0");
  return `${g("year")}-${g("month")}-${g("day")}-${h}`;
}

export function hourLabelInTz(iso: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(iso);
}

/** Погодинні бакети між from і to (крок 1 год, унікальні ключі TZ). */
export function listHourBucketsInRange(
  from: Date,
  to: Date,
  timeZone: string
): { key: string; label: string; at: Date }[] {
  const HOUR_MS = 3600000;
  const out: { key: string; label: string; at: Date }[] = [];
  const seen = new Set<string>();
  for (let t = from.getTime(); t <= to.getTime(); t += HOUR_MS) {
    const d = new Date(t);
    const key = hourKeyInTz(d, timeZone);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: hourLabelInTz(d, timeZone), at: d });
  }
  const endD = new Date(to);
  const endKey = hourKeyInTz(endD, timeZone);
  if (!seen.has(endKey)) {
    seen.add(endKey);
    out.push({ key: endKey, label: hourLabelInTz(endD, timeZone), at: endD });
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

export function yearMonthKeyInTz(iso: Date, timeZone: string): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  });
  const p = f.formatToParts(iso);
  const y = p.find((x) => x.type === "year")?.value ?? "";
  const m = p.find((x) => x.type === "month")?.value ?? "";
  return `${y}-${m}`;
}
