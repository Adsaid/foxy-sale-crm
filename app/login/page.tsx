import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Вхід — Foxy Sale CRM",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <LoginForm />
    </main>
  );
}
