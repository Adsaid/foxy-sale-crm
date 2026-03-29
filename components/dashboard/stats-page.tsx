"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CallStatsCallsPanel } from "@/components/dashboard/call-stats-calls-panel";
import { AccountStatsPanel } from "@/components/dashboard/account-stats-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StatsPage() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const showCallsAccountsTabs = user?.role === "ADMIN" || user?.role === "SALES";
  const [statsTab, setStatsTab] = useState<"calls" | "accounts">("calls");

  if (isLoading) return null;

  const heading =
    showCallsAccountsTabs && statsTab === "accounts"
      ? "Статистика аккаунтів"
      : "Статистика дзвінків";

  const callsSection = user ? (
    <CallStatsCallsPanel
      isAdmin={isAdmin}
      fetchEnabled={!showCallsAccountsTabs || statsTab === "calls"}
    />
  ) : null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{heading}</h2>

      {showCallsAccountsTabs ? (
        <Tabs
          value={statsTab}
          onValueChange={(v) => setStatsTab(v as "calls" | "accounts")}
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
            <AccountStatsPanel
              fetchEnabled={statsTab === "accounts"}
              showSalesFilter={isAdmin}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">{callsSection}</div>
      )}
    </div>
  );
}
