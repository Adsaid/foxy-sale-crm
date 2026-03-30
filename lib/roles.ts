import type { Role } from "@prisma/client";

export function isSalesLike(role: Role): boolean {
  return role === "SALES" || role === "ADMIN";
}

/** ADMIN може мутувати будь-який дзвінок; SALES — лише створений ним. */
export function canMutateCall(
  user: { id: string; role: string },
  callCreatedById: string,
): boolean {
  if (user.role === "ADMIN") return true;
  return user.role === "SALES" && callCreatedById === user.id;
}
