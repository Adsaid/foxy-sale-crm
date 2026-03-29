"use client";

import { useQuery } from "@tanstack/react-query";
import { accountReportService } from "@/services/account-report-service";

export function useAccountReports(params: {
  page?: number;
  limit?: number;
  salesUserId?: string;
  weekYear?: number;
  weekNumber?: number;
  weekStartMin?: string;
  weekStartMax?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...rest } = params;
  return useQuery({
    queryKey: ["account-reports", rest],
    queryFn: () => accountReportService.list(rest).then((r) => r.data),
    enabled,
  });
}
