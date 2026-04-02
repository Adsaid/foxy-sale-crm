import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";
import { isDevelopEnv } from "@/lib/app-env";

export const metadata: Metadata = {
  title: "Реєстрація — Foxy Sale CRM",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const sp = await searchParams;
  const code = sp.code?.trim() || null;

  const allowAdminRegistration = true;
  const allowSuperAdminRegistration = isDevelopEnv();

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <RegisterForm
        allowAdminRegistration={allowAdminRegistration}
        allowSuperAdminRegistration={allowSuperAdminRegistration}
        invitationCodeFromUrl={code}
      />
    </main>
  );
}
