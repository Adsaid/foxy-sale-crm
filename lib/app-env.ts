/**
 * APP_ENV у .env: "SUPER" | "PROD" (регістр неважливий).
 * У SUPER у формі реєстрації доступні ролі Admin і Super Admin; у PROD — ні.
 * Якщо змінну не задано — трактуємо як PROD.
 */
export type AppEnv = "SUPER" | "PROD";

export function getAppEnv(): AppEnv {
  const raw = process.env.APP_ENV?.trim().toUpperCase();
  return raw === "SUPER" ? "SUPER" : "PROD";
}

export function isSuperEnv(): boolean {
  return getAppEnv() === "SUPER";
}
