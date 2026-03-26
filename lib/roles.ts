import type { Role } from "@prisma/client";

export function isSalesLike(role: Role): boolean {
  return role === "SALES" || role === "ADMIN";
}
