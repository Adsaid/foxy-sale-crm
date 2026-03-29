import api from "@/lib/api/client";
import type { CallStatsData, CallStatsQueryParams, AdminAccountStatsData } from "@/types/crm";

export const statsService = {
  async getCallStats(params: CallStatsQueryParams): Promise<CallStatsData> {
    const res = await api.get<CallStatsData>("/api/stats/calls", { params });
    return res.data;
  },

  async getAdminAccountStats(): Promise<AdminAccountStatsData> {
    const res = await api.get<AdminAccountStatsData>("/api/stats/accounts");
    return res.data;
  },
};
