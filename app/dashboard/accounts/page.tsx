import { requireUser } from "@/lib/server-auth";
import { AccountsPage } from "@/components/dashboard/accounts-page";

export default async function DashboardAccountsPage() {
  await requireUser(["SALES"]);
  return <AccountsPage />;
}
