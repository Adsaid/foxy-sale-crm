import api from "@/lib/api/client";
import type { CallStatsData, AdminAccountStatsData } from "@/types/crm";

export const statsService = {
  async getCallStats(): Promise<CallStatsData> {
    const res = await api.get<CallStatsData>("/api/stats/calls");
    return res.data;
  },

  async getAdminAccountStats(): Promise<AdminAccountStatsData> {
    const res = await api.get<AdminAccountStatsData>("/api/stats/accounts");
    return res.data;
  },
};
