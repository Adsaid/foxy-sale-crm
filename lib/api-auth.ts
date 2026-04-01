import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { effectiveAccountStatus } from "@/lib/account-status";
import { effectiveTeamStatus } from "@/lib/team-status";

export type GetApiUserOptions = {
  /** Якщо false (за замовчуванням), користувачі з PENDING не проходять (окрім явних винятків). */
  allowPending?: boolean;
  /** Поточний запит: для SUPER_ADMIN беремо active team із заголовка x-team-id. */
  request?: Request;
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

  if (!allowPending && user.role !== "SUPER_ADMIN" && user.teamId) {
    const team = await prisma.team.findUnique({
      where: { id: user.teamId },
      select: { status: true },
    });
    if (effectiveTeamStatus(team) === "PENDING") {
      return {
        error: NextResponse.json(
          { error: "Команда очікує підтвердження супер-адміністратора" },
          { status: 403 },
        ),
        user: null,
      };
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }

  let activeTeamId: string | null = user.teamId ?? null;
  if (user.role === "SUPER_ADMIN") {
    const fromHeader = options?.request?.headers.get("x-team-id")?.trim();
    if (fromHeader) {
      const team = await prisma.team.findUnique({
        where: { id: fromHeader },
        select: { id: true },
      });
      if (!team) {
        return {
          error: NextResponse.json({ error: "Команду не знайдено" }, { status: 404 }),
          user: null,
        };
      }
      activeTeamId = team.id;
    }
  }

  if (!activeTeamId && user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Користувача не прив'язано до команди" }, { status: 403 }),
      user: null,
    };
  }

  return { error: null, user: { ...user, activeTeamId } };
}
