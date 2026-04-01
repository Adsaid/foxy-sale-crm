import { requireUser } from "@/lib/server-auth";
import { UsersPage } from "@/components/dashboard/users-page";

export default async function DashboardUsersPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);
  return <UsersPage />;
}
