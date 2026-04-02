import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Невірний формат email"),
  password: z.string().min(6, "Мінімум 6 символів"),
});

function registerSuperRefine(
  data: {
    password: string;
    confirmPassword: string;
    role: string;
    specialization?: "FRONTEND" | "BACKEND" | "FULLSTACK" | "UX_UI" | "UI" | "UX";
    technologyIds?: string[];
    badgeBgColor?: string;
    badgeTextColor?: string;
    teamName?: string;
    teamId?: string;
    invitationCode?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Паролі не збігаються",
      path: ["confirmPassword"],
    });
  }
  const devSpecs = ["FRONTEND", "BACKEND", "FULLSTACK"] as const;
  const designerSpecs = ["UX_UI", "UI", "UX"] as const;

  if (data.role === "DEV") {
    if (!data.specialization) {
      ctx.addIssue({
        code: "custom",
        message: "Оберіть спеціалізацію",
        path: ["specialization"],
      });
    } else if (!devSpecs.includes(data.specialization as (typeof devSpecs)[number])) {
      ctx.addIssue({
        code: "custom",
        message: "Для розробника оберіть Frontend, Backend або Fullstack",
        path: ["specialization"],
      });
    }
    if (!data.technologyIds || data.technologyIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Оберіть хоча б одну технологію",
        path: ["technologyIds"],
      });
    }
  }

  if (data.role === "DESIGNER") {
    if (!data.specialization) {
      ctx.addIssue({
        code: "custom",
        message: "Оберіть спеціалізацію",
        path: ["specialization"],
      });
    } else if (!designerSpecs.includes(data.specialization as (typeof designerSpecs)[number])) {
      ctx.addIssue({
        code: "custom",
        message: "Для дизайнера оберіть UX/UI, UI або UX",
        path: ["specialization"],
      });
    }
    if (!data.technologyIds || data.technologyIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Оберіть хоча б одну технологію",
        path: ["technologyIds"],
      });
    }
  }
  if (data.role === "SALES") {
    if (!data.badgeBgColor) {
      ctx.addIssue({
        code: "custom",
        message: "Оберіть колір фону бейджа",
        path: ["badgeBgColor"],
      });
    }
    if (!data.badgeTextColor) {
      ctx.addIssue({
        code: "custom",
        message: "Оберіть колір тексту бейджа",
        path: ["badgeTextColor"],
      });
    }
  }

  const hasInvite = typeof data.invitationCode === "string" && data.invitationCode.trim().length > 0;
  if (data.role === "ADMIN") {
    if (!data.teamName || data.teamName.trim().length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Для ролі Admin вкажіть назву команди",
        path: ["teamName"],
      });
    }
  } else if (data.role !== "SUPER_ADMIN" && !hasInvite && !data.teamId) {
    ctx.addIssue({
      code: "custom",
      message: "Оберіть команду",
      path: ["teamId"],
    });
  }
}

/**
 * Схема реєстрації. Якщо `allowAdmin === false`, роль ADMIN недоступна (наприклад APP_ENV=PROD).
 */
export function getRegisterSchema(allowAdmin: boolean, allowSuperAdmin = false) {
  const roleEnum = allowSuperAdmin
    ? z.enum(["SUPER_ADMIN", "ADMIN", "DEV", "DESIGNER", "SALES"])
    : allowAdmin
      ? z.enum(["ADMIN", "DEV", "DESIGNER", "SALES"])
      : z.enum(["DEV", "DESIGNER", "SALES"]);

  return z
    .object({
      firstName: z.string().min(2, "Мінімум 2 символи"),
      lastName: z.string().min(2, "Мінімум 2 символи"),
      email: z.string().email("Невірний формат email"),
      password: z.string().min(6, "Мінімум 6 символів"),
      confirmPassword: z.string(),
      role: roleEnum,
      specialization: z.enum(["FRONTEND", "BACKEND", "FULLSTACK", "UX_UI", "UI", "UX"]).optional(),
      technologyIds: z.array(z.string()).optional(),
      badgeBgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Невірний колір фону").optional(),
      badgeTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Невірний колір тексту").optional(),
      teamName: z.string().max(120, "Назва команди занадто довга").optional(),
      teamId: z.string().optional(),
      /** Код із посилання запрошення; роль тоді задає сервер за запрошенням. */
      invitationCode: z.string().min(1).optional(),
    })
    .superRefine(registerSuperRefine);
}

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "SUPER_ADMIN" | "ADMIN" | "DEV" | "DESIGNER" | "SALES";
  specialization?: "FRONTEND" | "BACKEND" | "FULLSTACK" | "UX_UI" | "UI" | "UX";
  technologyIds?: string[];
  badgeBgColor?: string;
  badgeTextColor?: string;
  teamName?: string;
  teamId?: string;
  invitationCode?: string;
};

export type LoginInput = z.infer<typeof loginSchema>;
