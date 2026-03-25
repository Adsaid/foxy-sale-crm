import api from "@/lib/api/client";
import type { Account, CreateAccountInput, UpdateAccountInput } from "@/types/crm";

export const accountService = {
  async getAll(): Promise<Account[]> {
    const res = await api.get<Account[]>("/api/accounts");
    return res.data;
  },

  async create(data: CreateAccountInput): Promise<Account> {
    const res = await api.post<Account>("/api/accounts", data);
    return res.data;
  },

  async update(id: string, data: UpdateAccountInput): Promise<Account> {
    const res = await api.patch<Account>(`/api/accounts/${id}`, data);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/accounts/${id}`);
  },
};
