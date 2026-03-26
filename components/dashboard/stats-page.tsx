"use client";

import { useAuth } from "@/hooks/use-auth";
import { useSalesStats, useDevStats } from "@/hooks/use-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SalesStatsView() {
  const { data: stats, isLoading } = useSalesStats();

  if (isLoading) return <LoadingSkeleton count={6} />;
  if (!stats) return null;

  const items = [
    { label: "Всього дзвінків", value: stats.totalCalls },
    { label: "Завершені", value: stats.completedCalls },
    { label: "Успішні", value: stats.successCalls },
    { label: "Неуспішні", value: stats.unsuccessfulCalls },
    { label: "Очікують", value: stats.pendingCalls },
    { label: "Акаунтів", value: stats.totalAccounts },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function DevStatsView() {
  const { data: stats, isLoading } = useDevStats();

  if (isLoading) return <LoadingSkeleton count={4} />;
  if (!stats) return null;

  const items = [
    { label: "Призначено дзвінків", value: stats.totalAssigned },
    { label: "Завершено", value: stats.completed },
    { label: "Успішність", value: `${stats.successRate}%` },
    { label: "Очікують", value: stats.pending },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

export function StatsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSkeleton count={4} />;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Статистика</h2>
      {(user?.role === "SALES" || user?.role === "ADMIN") && <SalesStatsView />}
      {user?.role === "DEV" && <DevStatsView />}
    </div>
  );
}
