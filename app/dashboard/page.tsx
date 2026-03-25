import { requireUser } from "@/lib/server-auth";
import { StatsPage } from "@/components/dashboard/stats-page";

export default async function DashboardPage() {
  await requireUser();
  return <StatsPage />;
}
