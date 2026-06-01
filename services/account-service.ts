import api from "@/lib/api/client";
import type { Account, CreateAccountInput, UpdateAccountInput } from "@/types/crm";
import type { AccountOperationalStatus } from "@/lib/account-fields";

export interface GetAccountsParams {
  operationalStatus?: AccountOperationalStatus;
}

export const accountService = {
  async getAll(params?: GetAccountsParams): Promise<Account[]> {
    const res = await api.get<Account[]>("/api/accounts", {
      params: params?.operationalStatus ? { operationalStatus: params.operationalStatus } : undefined,
    });
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
