"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCallStats, useAdminAccountStats } from "@/hooks/use-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountOperationalStatusLabelUk } from "@/lib/account-fields";

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

function CallStatsView() {
  const { data: stats, isLoading } = useCallStats();

  if (isLoading) return <LoadingSkeleton count={5} />;
  if (!stats) return null;

  const items = [
    { label: "Всього дзвінків", value: stats.totalCalls },
    { label: "Завершені", value: stats.completedCalls },
    { label: "Успішні", value: stats.successCalls },
    { label: "Неуспішні", value: stats.unsuccessfulCalls },
    { label: "Очікують", value: stats.pendingCalls },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function AdminAccountStatsView({ enabled }: { enabled: boolean }) {
  const { data: stats, isLoading } = useAdminAccountStats(enabled);

  if (!enabled) return null;
  if (isLoading) return <LoadingSkeleton count={8} />;
  if (!stats) return null;

  const statusItems = [
    { label: accountOperationalStatusLabelUk.ACTIVE, value: stats.active },
    { label: accountOperationalStatusLabelUk.PAUSED, value: stats.paused },
    { label: accountOperationalStatusLabelUk.SETUP, value: stats.setup },
    { label: accountOperationalStatusLabelUk.WARMING, value: stats.warming },
    ...(stats.noOperationalStatus > 0
      ? [{ label: "Без операційного статусу", value: stats.noOperationalStatus }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Всього акаунтів" value={stats.totalAccounts} />
        <StatCard label="Upwork" value={stats.upwork} />
        <StatCard label="LinkedIn" value={stats.linkedin} />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          За операційним статусом
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statusItems.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsPage() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [adminTab, setAdminTab] = useState<"calls" | "accounts">("calls");

  if (isLoading) return <LoadingSkeleton count={4} />;

  const heading =
    isAdmin && adminTab === "accounts"
      ? "Статистика аккаунтів"
      : "Статистика дзвінків";

  const callsSection = user ? <CallStatsView /> : null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{heading}</h2>

      {isAdmin ? (
        <Tabs
          value={adminTab}
          onValueChange={(v) => setAdminTab(v as "calls" | "accounts")}
          className="w-full min-w-0"
        >
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="calls">Дзвінки</TabsTrigger>
            <TabsTrigger value="accounts">Акаунти</TabsTrigger>
          </TabsList>
          <TabsContent
            value="calls"
            className="mt-0 space-y-4 outline-none focus-visible:outline-none"
          >
            {callsSection}
          </TabsContent>
          <TabsContent
            value="accounts"
            className="mt-0 space-y-4 outline-none focus-visible:outline-none"
          >
            <AdminAccountStatsView enabled={adminTab === "accounts"} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">{callsSection}</div>
      )}
    </div>
  );
}
