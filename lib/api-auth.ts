import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { effectiveAccountStatus } from "@/lib/account-status";

export type GetApiUserOptions = {
  /** Якщо false (за замовчуванням), користувачі з PENDING не проходять (окрім явних винятків). */
  allowPending?: boolean;
};

export async function getApiUser(
  allowedRoles?: Role[],
  options?: GetApiUserOptions,
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  const allowPending = options?.allowPending === true;
  if (!allowPending && effectiveAccountStatus(user) === "PENDING") {
    return {
      error: NextResponse.json(
        { error: "Обліковий запис очікує підтвердження адміністратора" },
        { status: 403 },
      ),
      user: null,
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }

  return { error: null, user };
}
