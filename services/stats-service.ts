import api from "@/lib/api/client";
import type { SalesStatsData, DevStatsData } from "@/types/crm";

export const statsService = {
  async getSalesStats(): Promise<SalesStatsData> {
    const res = await api.get<SalesStatsData>("/api/stats/sales");
    return res.data;
  },

  async getDevStats(): Promise<DevStatsData> {
    const res = await api.get<DevStatsData>("/api/stats/dev");
    return res.data;
  },
};
