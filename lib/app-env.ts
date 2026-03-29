/**
 * APP_ENV у .env: "DEVELOP" | "PROD" (регістр неважливий).
 * У DEVELOP у формі реєстрації доступна роль Admin; у PROD — ні.
 * Якщо змінну не задано — трактуємо як PROD.
 */
export type AppEnv = "DEVELOP" | "PROD";

export function getAppEnv(): AppEnv {
  const raw = process.env.APP_ENV?.trim().toUpperCase();
  return raw === "DEVELOP" ? "DEVELOP" : "PROD";
}

export function isDevelopEnv(): boolean {
  return getAppEnv() === "DEVELOP";
}
