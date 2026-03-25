import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Невірний формат email"),
  password: z.string().min(6, "Мінімум 6 символів"),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(2, "Мінімум 2 символи"),
    lastName: z.string().min(2, "Мінімум 2 символи"),
    email: z.string().email("Невірний формат email"),
    password: z.string().min(6, "Мінімум 6 символів"),
    confirmPassword: z.string(),
    role: z.enum(["ADMIN", "DEV", "SALES"]),
    specialization: z.enum(["FRONTEND", "BACKEND", "FULLSTACK"]).optional(),
    technologyIds: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Паролі не збігаються",
        path: ["confirmPassword"],
      });
    }
    if (data.role === "DEV") {
      if (!data.specialization) {
        ctx.addIssue({
          code: "custom",
          message: "Оберіть спеціалізацію",
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
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
