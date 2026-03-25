import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard — Foxy Sale CRM",
};

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { technologies: true },
  });

  if (!user) redirect("/login");

  const { password: _, ...safeUser } = user;

  return (
    <main className="flex flex-1 flex-col">
      <DashboardContent user={safeUser} />
    </main>
  );
}
