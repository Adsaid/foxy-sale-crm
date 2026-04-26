import { z } from "zod";

const recurrenceTypeSchema = z.enum(["NONE", "WEEKLY"]);

/** TZDate.toISOString() emits `+03:00` style offsets; Zod's default datetime only allows `Z`. */
function isoDateTimeString(message: string) {
  return z.string().datetime({ offset: true, message });
}

function optionalTrimmedString(maxLen: number) {
  return z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : undefined))
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || v.length <= maxLen, `Максимум ${maxLen} символів`);
}

export const createDevDailyCallSchema = z
  .object({
    title: z.string().trim().min(1, "Назва обов'язкова").max(200, "Назва занадто довга"),
    description: optionalTrimmedString(2000),
    callStartedAt: isoDateTimeString("Некоректний час початку"),
    callEndedAt: isoDateTimeString("Некоректний час завершення").optional(),
    callLink: optionalTrimmedString(1000),
    recurrenceType: recurrenceTypeSchema.default("NONE"),
    recurrenceEndDate: isoDateTimeString("Некоректний час завершення повтору").optional(),
  })
  .superRefine((data, ctx) => {
    const startedAt = new Date(data.callStartedAt);
    if (Number.isNaN(startedAt.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["callStartedAt"],
        message: "Некоректний час початку",
      });
      return;
    }

    if (data.callEndedAt) {
      const endedAt = new Date(data.callEndedAt);
      if (Number.isNaN(endedAt.getTime()) || endedAt <= startedAt) {
        ctx.addIssue({
          code: "custom",
          path: ["callEndedAt"],
          message: "Час завершення має бути пізніше за час початку",
        });
      }
    }

    if (data.recurrenceEndDate) {
      const recEnd = new Date(data.recurrenceEndDate);
      if (Number.isNaN(recEnd.getTime()) || recEnd < startedAt) {
        ctx.addIssue({
          code: "custom",
          path: ["recurrenceEndDate"],
          message: "Кінець повторюваності не може бути раніше початку",
        });
      }
    }
  });

export const updateDevDailyCallSchema = z
  .object({
    title: z.string().trim().min(1, "Назва обов'язкова").max(200).optional(),
    description: optionalTrimmedString(2000),
    callStartedAt: isoDateTimeString("Некоректний час початку").optional(),
    callEndedAt: z
      .union([
        isoDateTimeString("Некоректний час завершення"),
        z.null(),
      ])
      .optional(),
    callLink: optionalTrimmedString(1000),
    recurrenceType: recurrenceTypeSchema.optional(),
    recurrenceEndDate: z
      .union([
        isoDateTimeString("Некоректний час завершення повтору"),
        z.null(),
      ])
      .optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.callStartedAt && data.callEndedAt) {
      const startedAt = new Date(data.callStartedAt);
      const endedAt = new Date(data.callEndedAt);
      if (
        Number.isNaN(startedAt.getTime()) ||
        Number.isNaN(endedAt.getTime()) ||
        endedAt <= startedAt
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["callEndedAt"],
          message: "Час завершення має бути пізніше за час початку",
        });
      }
    }

    if (data.callStartedAt && data.recurrenceEndDate) {
      const startedAt = new Date(data.callStartedAt);
      const recEnd = new Date(data.recurrenceEndDate);
      if (
        Number.isNaN(startedAt.getTime()) ||
        Number.isNaN(recEnd.getTime()) ||
        recEnd < startedAt
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["recurrenceEndDate"],
          message: "Кінець повторюваності не може бути раніше початку",
        });
      }
    }
  })
  .strict();

export type CreateDevDailyCallInputParsed = z.infer<typeof createDevDailyCallSchema>;
export type UpdateDevDailyCallInputParsed = z.infer<typeof updateDevDailyCallSchema>;
