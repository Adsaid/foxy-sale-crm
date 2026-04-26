import api from "@/lib/api/client";
import type {
  DevDailyCall,
  CreateDevDailyCallInput,
  UpdateDevDailyCallInput,
} from "@/types/crm";

export const devDailyCallService = {
  async getAll(): Promise<DevDailyCall[]> {
    const res = await api.get<DevDailyCall[]>("/api/dev-daily-calls");
    return res.data;
  },

  async create(data: CreateDevDailyCallInput): Promise<DevDailyCall> {
    const res = await api.post<DevDailyCall>("/api/dev-daily-calls", data);
    return res.data;
  },

  async update(
    id: string,
    data: UpdateDevDailyCallInput,
  ): Promise<DevDailyCall> {
    const res = await api.patch<DevDailyCall>(
      `/api/dev-daily-calls/${id}`,
      data,
    );
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/dev-daily-calls/${id}`);
  },
};
