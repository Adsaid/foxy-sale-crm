import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveAccountStatus } from "@/lib/account-status";
import { effectiveTeamStatus } from "@/lib/team-status";
import { PendingApprovalContent } from "@/components/auth/pending-approval-content";

export default async function PendingApprovalPage() {
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

  if (effectiveAccountStatus(user) === "APPROVED" && !waitingForTeamApproval) {
    redirect("/dashboard");
  }

  return <PendingApprovalContent email={user.email} />;
}
