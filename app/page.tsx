import { redirectAuthenticatedHome } from "@/lib/authenticated-home-redirect";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  await redirectAuthenticatedHome();
}
