import api from "@/lib/api/client";
import type { CallEvent, CreateCallInput, UpdateCallInput, CompleteCallInput } from "@/types/crm";

export const callService = {
  async getAll(): Promise<CallEvent[]> {
    const res = await api.get<CallEvent[]>("/api/calls");
    return res.data;
  },

  async create(data: CreateCallInput): Promise<CallEvent> {
    const res = await api.post<CallEvent>("/api/calls", data);
    return res.data;
  },

  async update(id: string, data: UpdateCallInput): Promise<CallEvent> {
    const res = await api.patch<CallEvent>(`/api/calls/${id}`, data);
    return res.data;
  },

  async complete(id: string, data: CompleteCallInput): Promise<CallEvent> {
    const res = await api.patch<CallEvent>(`/api/calls/${id}/complete`, data);
    return res.data;
  },
};
