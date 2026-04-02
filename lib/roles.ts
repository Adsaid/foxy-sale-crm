import type { Role, Specialization } from "@prisma/client";

export function isSalesLike(role: Role): boolean {
  return role === "SALES" || role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Ролі, яких можна призначити виконавцем дзвінка (DEV або DESIGNER). */
export function isCallAssigneeRole(role: string): role is "DEV" | "DESIGNER" {
  return role === "DEV" || role === "DESIGNER";
}

/** ADMIN може мутувати будь-який дзвінок; SALES — лише створений ним. */
export function canMutateCall(
  user: { id: string; role: string },
  callCreatedById: string,
): boolean {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  return user.role === "SALES" && callCreatedById === user.id;
}

/** Коротка роль для UI (колонки, бейджі). */
export function callerRoleLabelUk(role: string): string {
  if (role === "DESIGNER") return "Дизайнер";
  return "Розробник";
}

/** Коротка EN-мітка ролі: "Dev" | "Design". */
export function callerRoleShortEn(role?: string | null): string {
  if (role === "DESIGNER") return "Design";
  return "Dev";
}

/** Динамічний підпис поля виконавця: "Dev" | "Design" | "Dev/Design" (fallback коли роль невідома). */
export function assigneeFieldLabelEn(role?: string | null): string {
  if (role === "DEV") return "Dev";
  if (role === "DESIGNER") return "Design";
  return "Dev/Design";
}

/** Підписи спеціалізацій виконавця дзвінка (розробник і дизайнер) — фільтри, таблиці, селекти. */
export const assigneeSpecLabelsUk: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  UX_UI: "UX/UI",
  UI: "UI",
  UX: "UX",
};

/** Підпис спеціалізації для UI. */
export function specializationLabelUk(spec: Specialization | string | null | undefined): string {
  return spec ? assigneeSpecLabelsUk[spec] ?? String(spec) : "";
}

/** Іменник у давальному для текстів сповіщень: «розробнику» / «дизайнеру». */
export function callerRoleDativeUk(role: string): string {
  if (role === "DESIGNER") return "дизайнеру";
  return "розробнику";
}

/** Заголовок колонки DEV/Design. */
export const CALLER_COLUMN_LABEL = "Dev/Design";

/** Підписи ролі для адмін-таблиці / фільтрів. */
export const roleLabelUk: Record<string, string> = {
  SUPER_ADMIN: "Супер адмін",
  ADMIN: "Адмін",
  DEV: "Розробник",
  DESIGNER: "Дизайнер",
  SALES: "Сейл",
};
