export const ACCOUNT_OPERATIONAL_STATUS_VALUES = [
  "ACTIVE",
  "PAUSED",
  "SETUP",
  "WARMING",
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
