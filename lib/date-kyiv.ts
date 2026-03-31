/** Продукт лише для України — усі дати/час у UI та сповіщеннях у київському часі. */
export const CRM_TIMEZONE = "Europe/Kyiv" as const;

function asDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/** Як у сповіщеннях / Telegram (місяць коротко). */
export function formatNotificationDateTime(d: Date | string): string {
  return asDate(d).toLocaleString("uk-UA", {
    timeZone: CRM_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Таблиця дзвінків, прев’ю, конфлікти виконавців. */
export function formatCallTableDateTime(d: Date | string): string {
  return asDate(d).toLocaleString("uk-UA", {
    timeZone: CRM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Лише год:хв (картки «сьогодні»). */
export function formatCallTimeKyiv(d: Date | string): string {
  return asDate(d).toLocaleTimeString("uk-UA", {
    timeZone: CRM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Дата без часу (акаунти, користувачі). */
export function formatDateKyiv(d: Date | string): string {
  return asDate(d).toLocaleDateString("uk-UA", {
    timeZone: CRM_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Дата текстом з повною назвою місяця. */
export function formatDateLongKyiv(d: Date | string): string {
  return asDate(d).toLocaleDateString("uk-UA", {
    timeZone: CRM_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Ключ календарного дня YYYY-MM-DD у Києві (для порівнянь). */
export function kyivCalendarDateKey(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CRM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(asDate(d));
}

/** Чи дві мітки часу — один календарний день у Києві. */
export function isSameKyivCalendarDay(a: Date | string, b: Date | string): boolean {
  return kyivCalendarDateKey(a) === kyivCalendarDateKey(b);
}

/** Чи дата дзвінка — «сьогодні» за календарем Києва (карусель, фільтри). */
export function isKyivCalendarToday(dateStr: string, nowMs: number = Date.now()): boolean {
  return kyivCalendarDateKey(dateStr) === kyivCalendarDateKey(new Date(nowMs));
}

function kyivCalendarDaysBetween(earlier: Date, later: Date): number {
  const a = kyivCalendarDateKey(earlier);
  const b = kyivCalendarDateKey(later);
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  const t0 = Date.UTC(ya, ma - 1, da);
  const t1 = Date.UTC(yb, mb - 1, db);
  return Math.round((t1 - t0) / (24 * 60 * 60 * 1000));
}

/**
 * Відносний час для сповіщень: межі «вчора / N дн» за календарем Києва,
 * не за сирими 24 год; після тижня — абсолютний час як у Telegram.
 */
export function formatNotificationRelativeTimeKyiv(
  createdAt: Date | string,
  nowMs: number = Date.now()
): string {
  const created = asDate(createdAt);
  const now = new Date(nowMs);
  const diff = nowMs - created.getTime();
  if (diff < 0) return formatNotificationDateTime(created);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "щойно";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} хв тому`;

  const daysBetween = kyivCalendarDaysBetween(created, now);

  if (daysBetween === 0) {
    const hrs = Math.floor(min / 60);
    return `${hrs} год тому`;
  }

  if (daysBetween === 1) {
    return `Вчора, ${formatCallTimeKyiv(created)}`;
  }

  if (daysBetween < 7) {
    return `${daysBetween} дн тому`;
  }

  return formatNotificationDateTime(created);
}

/** Коротка дата для підписів періоду (як «d MMM yyyy») у київському часі. */
export function formatStatsPeriodShortKyiv(d: Date | string): string {
  return asDate(d).toLocaleDateString("uk-UA", {
    timeZone: CRM_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Тултіп дельти на картках статистики: період порівняння за календарем Києва. */
export function formatComparePeriodTooltipKyiv(isoFrom: string, isoTo: string): string {
  const from = new Date(isoFrom);
  const to = new Date(isoTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return "Порівняння з попереднім періодом такого ж типу";
  }
  if (kyivCalendarDateKey(from) === kyivCalendarDateKey(to)) {
    return `Порівняння з ${formatDateLongKyiv(from)}`;
  }
  return `Порівняння з періодом ${formatStatsPeriodShortKyiv(from)} — ${formatStatsPeriodShortKyiv(to)}`;
}
