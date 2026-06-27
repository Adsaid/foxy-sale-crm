import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveAccountStatus } from "@/lib/account-status";
import { effectiveTeamStatus } from "@/lib/team-status";
import { getDefaultDashboardPath } from "@/lib/default-dashboard-route";

/** Редірект залогіненого користувача на домашню сторінку за роллю (або pending / login). */
export async function redirectAuthenticatedHome(): Promise<never> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  const team = user.teamId
    ? await prisma.team.findUnique({
        where: { id: user.teamId },
        select: { status: true },
      })
    : null;
  const waitingForTeamApproval =
    user.role !== "SUPER_ADMIN" && effectiveTeamStatus(team) === "PENDING";

  if (user.role !== "SUPER_ADMIN" && !user.teamId) {
    redirect("/pending-approval");
  }

  if (effectiveAccountStatus(user) === "PENDING" || waitingForTeamApproval) {
    redirect("/pending-approval");
  }

  redirect(getDefaultDashboardPath(user.role));
}
