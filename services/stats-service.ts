import api from "@/lib/api/client";
import type {
  CallStatsData,
  CallStatsQueryParams,
  CallStatsTimeseriesResponse,
  AccountStatsData,
  AccountStatsQueryParams,
  AccountStatsTimeseriesResponse,
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

  async getAccountStats(params: AccountStatsQueryParams): Promise<AccountStatsData> {
    const res = await api.get<AccountStatsData>("/api/stats/accounts", { params });
    return res.data;
  },

  async getAccountStatsTimeseries(
    params: AccountStatsQueryParams
  ): Promise<AccountStatsTimeseriesResponse> {
    const res = await api.get<AccountStatsTimeseriesResponse>("/api/stats/accounts/timeseries", {
      params,
    });
    return res.data;
  },
};
