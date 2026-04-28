import { countries } from "country-data-list";

export const ACCOUNT_OPERATIONAL_STATUS_VALUES = [
  "ACTIVE",
  "PAUSED",
  "SETUP",
  "WARMING",
  "LIMITED",
] as const;

export const ACCOUNT_WARM_UP_STAGE_VALUES = [
  "PROFILE_FILLING",
  "EMAIL_WARMING",
  "DOCS_EMAIL_WARMING",
  "STABLE",
] as const;

export const ACCOUNT_DESKTOP_TYPE_VALUES = [
  "ADS_POWER",
  "ANY_DESK",
  "RIVNE_IP",
  "LUTSK_IP",
  "LVIV_IP",
  "DOLPHIN",
  "MODEM",
] as const;

export type AccountOperationalStatus = (typeof ACCOUNT_OPERATIONAL_STATUS_VALUES)[number];
export type AccountWarmUpStage = (typeof ACCOUNT_WARM_UP_STAGE_VALUES)[number];
export type AccountDesktopType = (typeof ACCOUNT_DESKTOP_TYPE_VALUES)[number];

export const accountOperationalStatusLabelUk: Record<AccountOperationalStatus, string> = {
  ACTIVE: "Активний",
  PAUSED: "На паузі",
  SETUP: "Налаштування",
  WARMING: "Прогрів",
  LIMITED: "Обмежений",
};

export const accountWarmUpStageLabelUk: Record<AccountWarmUpStage, string> = {
  PROFILE_FILLING: "Заповнюється",
  EMAIL_WARMING: "Прогрів пошти",
  DOCS_EMAIL_WARMING: "Доки отримано, прогрів пошти",
  STABLE: "Стабільна робота",
};

export const accountDesktopTypeLabelUk: Record<AccountDesktopType, string> = {
  ADS_POWER: "ADS Power",
  ANY_DESK: "Any Desk",
  RIVNE_IP: "Рівне IP",
  LUTSK_IP: "Луцьк IP",
  LVIV_IP: "Львів IP",
  DOLPHIN: "Dolphin",
  MODEM: "Модем",
};

export type ParsedEnumField<T extends string> =
  | "omit"
  | "invalid"
  | { value: T | null };

export function parseAccountEnumField<T extends string>(
  val: unknown,
  allowed: readonly T[]
): ParsedEnumField<T> {
  if (val === undefined) return "omit";
  if (val === null) return { value: null };
  if (typeof val === "string" && (allowed as readonly string[]).includes(val)) {
    return { value: val as T };
  }
  return "invalid";
}

export type ParsedCountField = "omit" | "invalid" | { value: number | null };

export function parseAccountCountField(val: unknown): ParsedCountField {
  if (val === undefined) return "omit";
  if (val === null) return { value: null };
  if (typeof val === "number" && Number.isFinite(val) && val >= 0) {
    return { value: Math.floor(val) };
  }
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val.trim());
    if (Number.isFinite(n) && n >= 0) return { value: Math.floor(n) };
    return "invalid";
  }
  if (typeof val === "string" && val.trim() === "") return { value: null };
  return "invalid";
}

export type ParsedLocationField = "omit" | "invalid" | { value: string | null };

export function parseAccountLocationField(val: unknown): ParsedLocationField {
  if (val === undefined) return "omit";
  if (val === null) return { value: null };
  if (typeof val === "string") return { value: val.trim() || null };
  return "invalid";
}

const COUNTRY_LIST = countries.all as {
  alpha2: string;
  alpha3: string;
  name: string;
  status?: string;
  ioc?: string;
  emoji?: string;
}[];

function countryRowUsable(c: (typeof COUNTRY_LIST)[number]): boolean {
  return Boolean(c.emoji) && c.status !== "deleted" && c.ioc !== "PRK";
}

/** Для дефолту CountryDropdown (alpha3) або порожньо, якщо не розпізнано. */
export function resolveAccountLocationToAlpha3(
  stored: string | null | undefined
): string | undefined {
  if (stored == null || typeof stored !== "string") return undefined;
  const t = stored.trim();
  if (!t) return undefined;
  if (/^[A-Za-z]{2}$/.test(t)) {
    const a2 = t.toUpperCase();
    const c = COUNTRY_LIST.find(
      (x) => x.alpha2.toUpperCase() === a2 && countryRowUsable(x)
    );
    if (c) return c.alpha3;
  }
  if (/^[A-Za-z]{3}$/.test(t)) {
    const a3 = t.toUpperCase();
    const c = COUNTRY_LIST.find((x) => x.alpha3 === a3 && countryRowUsable(x));
    if (c) return c.alpha3;
  }
  const c = COUNTRY_LIST.find(
    (x) => x.name.toLowerCase() === t.toLowerCase() && countryRowUsable(x)
  );
  return c?.alpha3;
}

/** Показ у UI / звітах: ISO alpha-2 (UA), якщо відомо з alpha-3 або назви; інакше як збережено. */
export function formatAccountLocationLabel(stored: string | null | undefined): string {
  if (stored == null || typeof stored !== "string") return "";
  const t = stored.trim();
  if (!t) return "";
  if (/^[A-Za-z]{2}$/.test(t)) {
    const a2 = t.toUpperCase();
    const c = COUNTRY_LIST.find(
      (x) => x.alpha2.toUpperCase() === a2 && countryRowUsable(x)
    );
    if (c) return c.alpha2.toUpperCase();
  }
  if (/^[A-Za-z]{3}$/.test(t)) {
    const a3 = t.toUpperCase();
    const c = COUNTRY_LIST.find((x) => x.alpha3 === a3 && countryRowUsable(x));
    if (c?.alpha2) return c.alpha2.toUpperCase();
  }
  const c = COUNTRY_LIST.find(
    (x) => x.name.toLowerCase() === t.toLowerCase() && countryRowUsable(x)
  );
  if (c?.alpha2) return c.alpha2.toUpperCase();
  return t;
}

/** Lowercase alpha2 для `CircleFlag`; `null`, якщо країну не вдалося однозначно визначити. */
export function resolveAccountLocationToAlpha2(
  stored: string | null | undefined
): string | null {
  const a3 = resolveAccountLocationToAlpha3(stored);
  if (!a3) return null;
  const c = COUNTRY_LIST.find((x) => x.alpha3 === a3 && countryRowUsable(x));
  return c ? c.alpha2.toLowerCase() : null;
}

/** Прапор-emoji з ISO alpha-2 (Telegram / plain text). Порожній рядок, якщо невідомо. */
export function accountLocationRegionalEmoji(
  stored: string | null | undefined
): string {
  const a2low = resolveAccountLocationToAlpha2(stored);
  if (!a2low || a2low.length !== 2) return "";
  const u = a2low.toUpperCase();
  const base = 0x1f1e6;
  const c0 = u.charCodeAt(0);
  const c1 = u.charCodeAt(1);
  if (c0 < 0x41 || c0 > 0x5a || c1 < 0x41 || c1 > 0x5a) return "";
  return String.fromCodePoint(base + (c0 - 0x41), base + (c1 - 0x41));
}

/** Дата (календарний день) у форматі yyyy-MM-dd, зберігається як UTC midnight. */
export type ParsedAccountOptionalDate = "omit" | "invalid" | { value: Date | null };

export function parseAccountOptionalDate(val: unknown): ParsedAccountOptionalDate {
  if (val === undefined) return "omit";
  if (val === null || val === "") return { value: null };
  if (typeof val !== "string") return "invalid";
  const t = val.trim();
  if (t === "") return { value: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return "invalid";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(Date.UTC(y, mo - 1, day));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== day) {
    return "invalid";
  }
  return { value: d };
}
