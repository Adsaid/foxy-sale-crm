import api from "@/lib/api/client";
import type {
  CallEvent,
  CreateCallInput,
  UpdateCallInput,
  CompleteCallInput,
  AdvanceCallStageInput,
  InterviewerDuplicateMatch,
} from "@/types/crm";

export const callService = {
  async getAll(): Promise<CallEvent[]> {
    const res = await api.get<CallEvent[]>("/api/calls");
    return res.data;
  },

  async getById(id: string): Promise<CallEvent> {
    const res = await api.get<CallEvent>(`/api/calls/${id}`);
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

  async remove(id: string): Promise<void> {
    await api.delete(`/api/calls/${id}`);
  },

  async advanceToNextStage(id: string, data: AdvanceCallStageInput): Promise<CallEvent> {
    const res = await api.post<CallEvent>(`/api/calls/${id}/next-stage`, data);
    return res.data;
  },

  async checkInterviewerDuplicates(name: string): Promise<InterviewerDuplicateMatch[]> {
    const res = await api.get<{ matches: InterviewerDuplicateMatch[] }>(
      "/api/calls/check-interviewer",
      { params: { name } }
    );
    return res.data.matches;
  },
};
