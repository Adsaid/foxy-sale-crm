"use client";

import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/stats-service";
import type { AccountStatsQueryParams, CallStatsQueryParams } from "@/types/crm";

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

export function useAccountStats(filters: AccountStatsQueryParams | null, enabled = true) {
  return useQuery({
    queryKey: ["stats", "accounts", filters],
    queryFn: () => statsService.getAccountStats(filters ?? {}),
    enabled: enabled && filters !== null,
  });
}

export function useAccountStatsTimeseries(filters: AccountStatsQueryParams | null, enabled = true) {
  return useQuery({
    queryKey: ["stats", "accounts", "timeseries", filters],
    queryFn: () => statsService.getAccountStatsTimeseries(filters ?? {}),
    enabled: enabled && filters !== null,
  });
}
