import api from "@/lib/api/client";
import type {
  CallStatsData,
  CallStatsQueryParams,
  CallStatsTimeseriesResponse,
  AdminAccountStatsData,
} from "@/types/crm";

export const statsService = {
  async getCallStats(params: CallStatsQueryParams): Promise<CallStatsData> {
    const res = await api.get<CallStatsData>("/api/stats/calls", { params });
    return res.data;
  },

  async getCallStatsTimeseries(params: CallStatsQueryParams): Promise<CallStatsTimeseriesResponse> {
    const res = await api.get<CallStatsTimeseriesResponse>("/api/stats/calls/timeseries", {
      params,
    });
    return res.data;
  },

  async getAdminAccountStats(): Promise<AdminAccountStatsData> {
    const res = await api.get<AdminAccountStatsData>("/api/stats/accounts");
    return res.data;
  },
};
