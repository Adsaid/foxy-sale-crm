import { requireUser } from "@/lib/server-auth";
import { SummaryPage } from "@/components/dashboard/summary-page";

export default async function DashboardSummaryPage() {
  await requireUser(["SALES", "ADMIN", "SUPER_ADMIN"]);
  return <SummaryPage />;
}
