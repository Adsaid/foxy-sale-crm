import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveAccountStatus } from "@/lib/account-status";
import { effectiveTeamStatus } from "@/lib/team-status";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { technologies: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }

  const { password: _, ...safeUser } = user;
  const team = safeUser.teamId
    ? await prisma.team.findUnique({
        where: { id: safeUser.teamId },
        select: { status: true },
      })
    : null;
  const teamStatus = effectiveTeamStatus(team);
  const pendingApproval =
    effectiveAccountStatus(user) === "PENDING" ||
    (safeUser.role !== "SUPER_ADMIN" && teamStatus === "PENDING");

  return NextResponse.json({
    user: {
      ...safeUser,
      teamId: safeUser.teamId ?? null,
      accountStatus: effectiveAccountStatus(user),
      teamStatus,
      pendingApproval,
    },
  });
}
