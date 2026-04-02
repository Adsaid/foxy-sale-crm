/**
 * APP_ENV у .env: "DEVELOP" | "PROD" (регістр неважливий).
 * DEVELOP — у реєстрації доступна роль Super Admin.
 * PROD — у реєстрації доступні лише DEV / SALES / DESIGNER / Admin (без Super Admin).
 * Якщо змінну не задано — трактуємо як PROD.
 */
export type AppEnv = "DEVELOP" | "PROD";

export function getAppEnv(): AppEnv {
  const raw = process.env.APP_ENV?.trim().toUpperCase();
  return raw === "DEVELOP" ? "DEVELOP" : "PROD";
}

/** Локальна розробка: дозволити реєстрацію Super Admin. */
export function isDevelopEnv(): boolean {
  return getAppEnv() === "DEVELOP";
}
