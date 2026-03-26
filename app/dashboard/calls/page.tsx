import { requireUser } from "@/lib/server-auth";
import { CallsPage } from "@/components/dashboard/calls-page";

export default async function DashboardCallsPage() {
  await requireUser(["SALES", "DEV", "ADMIN"]);
  return <CallsPage />;
}
