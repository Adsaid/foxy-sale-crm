import api from "@/lib/api/client";
import type { SalesAccountReportsListResponse } from "@/types/crm";

export const accountReportService = {
  submit: () => api.post<{ id: string; createdAt: string }>("/api/account-reports"),

  list: (params: {
    page?: number;
    limit?: number;
    salesUserId?: string;
    weekYear?: number;
    weekNumber?: number;
    weekStartMin?: string;
    weekStartMax?: string;
  }) => {
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined)
    ) as Record<string, string | number>;
    return api.get<SalesAccountReportsListResponse>("/api/account-reports", {
      params: filtered,
    });
  },
};
