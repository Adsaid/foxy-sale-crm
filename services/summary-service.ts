import api from "@/lib/api/client";
import type { CallSummary } from "@/types/crm";

export const summaryService = {
  async getAll(): Promise<CallSummary[]> {
    const res = await api.get<CallSummary[]>("/api/summaries");
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/summaries/${id}`);
  },
};
