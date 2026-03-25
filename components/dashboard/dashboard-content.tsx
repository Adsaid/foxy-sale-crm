"use client";

import { useLogout } from "@/hooks/use-logout";
import type { DashboardUser } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const roleLabels: Record<string, string> = {
  ADMIN: "Адміністратор",
  DEV: "Розробник",
  SALES: "Менеджер з продажів",
};

const specLabels: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
};

export function DashboardContent({ user }: { user: DashboardUser }) {
  const { mutate: logout, isPending } = useLogout();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Dashboard</CardTitle>
          <CardDescription>Вітаємо у Foxy Sale CRM!</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">Ім'я</p>
            <p className="font-medium">{user.firstName} {user.lastName}</p>
          </div>

          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>

          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">Роль</p>
            <Badge variant="secondary" className="w-fit">
              {roleLabels[user.role] ?? user.role}
            </Badge>
          </div>

          {user.role === "DEV" && user.specialization && (
            <div className="grid gap-1">
              <p className="text-sm text-muted-foreground">Спеціалізація</p>
              <p className="font-medium">
                {specLabels[user.specialization] ?? user.specialization}
              </p>
            </div>
          )}

          {user.role === "DEV" && user.technologies.length > 0 && (
            <div className="grid gap-1">
              <p className="text-sm text-muted-foreground">Технології</p>
              <div className="flex flex-wrap gap-1.5">
                {user.technologies.map((t) => (
                  <Badge key={t.id}>{t.name}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">Дата реєстрації</p>
            <p className="font-medium">
              {new Date(user.createdAt).toLocaleDateString("uk-UA")}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => logout()}
            disabled={isPending}
            className="mt-2"
          >
            {isPending ? "Виходимо..." : "Вийти"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
