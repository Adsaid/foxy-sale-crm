"use client";

import { useQuery } from "@tanstack/react-query";
import { summaryService } from "@/services/summary-service";

export function useSummaries() {
  return useQuery({
    queryKey: ["summaries"],
    queryFn: summaryService.getAll,
  });
}
