"use client";

import { useQuery } from "@tanstack/react-query";
import { statsService } from "@/services/stats-service";

export function useSalesStats() {
  return useQuery({
    queryKey: ["stats", "sales"],
    queryFn: statsService.getSalesStats,
  });
}

export function useDevStats() {
  return useQuery({
    queryKey: ["stats", "dev"],
    queryFn: statsService.getDevStats,
  });
}
