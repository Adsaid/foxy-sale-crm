"use client";

import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/stats-service";

export function useCallStats() {
  return useQuery({
    queryKey: ["stats", "calls"],
    queryFn: statsService.getCallStats,
  });
}

export function useAdminAccountStats(enabled: boolean) {
  return useQuery({
    queryKey: ["stats", "accounts"],
    queryFn: statsService.getAdminAccountStats,
    enabled,
  });
}
