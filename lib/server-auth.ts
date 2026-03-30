import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { effectiveAccountStatus } from "@/lib/account-status";

export async function requireUser(allowedRoles?: Role[]) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { technologies: true },
  });

  if (!user) redirect("/login");

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  const { password: _, ...safeUser } = user;
  return safeUser;
}

/** Доступ лише для підтверджених облікових записів; інакше — на сторінку очікування. */
export async function requireApprovedUser(allowedRoles?: Role[]) {
  const user = await requireUser(allowedRoles);
  if (effectiveAccountStatus(user) === "PENDING") {
    redirect("/pending-approval");
  }
  return user;
}
