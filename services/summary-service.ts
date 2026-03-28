import api from "@/lib/api/client";
import type { CallEvent, CallSummary } from "@/types/crm";

export const summaryService = {
  async getAll(): Promise<CallSummary[]> {
    const res = await api.get<CallSummary[]>("/api/summaries");
    return res.data;
  },

  /** Дані для бічної панелі з історії підсумку (не залежить від існування CallEvent). */
  async getDetailForSheet(id: string): Promise<CallEvent> {
    const res = await api.get<CallEvent>(`/api/summaries/${id}`);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/summaries/${id}`);
  },
};
