import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveAccountStatus } from "@/lib/account-status";
import { PendingApprovalContent } from "@/components/auth/pending-approval-content";

export default async function PendingApprovalPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  if (effectiveAccountStatus(user) === "APPROVED") {
    redirect("/dashboard");
  }

  return <PendingApprovalContent email={user.email} />;
}
