"use client";

import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/stats-service";
import type { CallStatsQueryParams } from "@/types/crm";

export function useCallStats(filters: CallStatsQueryParams | null, enabled = true) {
  return useQuery({
    queryKey: ["stats", "calls", filters],
    queryFn: () => statsService.getCallStats(filters ?? {}),
    enabled: enabled && filters !== null,
  });
}

export function useCallStatsTimeseries(filters: CallStatsQueryParams | null, enabled = true) {
  return useQuery({
    queryKey: ["stats", "calls", "timeseries", filters],
    queryFn: () => statsService.getCallStatsTimeseries(filters ?? {}),
    enabled: enabled && filters !== null,
  });
}

export function useAdminAccountStats(enabled: boolean) {
  return useQuery({
    queryKey: ["stats", "accounts"],
    queryFn: statsService.getAdminAccountStats,
    enabled,
  });
}
