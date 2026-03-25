import api from "@/lib/api/client";
import type { DevUser, AdminUser, UpdateUserInput } from "@/types/crm";

export const userService = {
  async getDevs(): Promise<DevUser[]> {
    const res = await api.get<DevUser[]>("/api/users/devs");
    return res.data;
  },

  async getAdminUsers(role?: string): Promise<AdminUser[]> {
    const params = role ? `?role=${role}` : "";
    const res = await api.get<AdminUser[]>(`/api/admin/users${params}`);
    return res.data;
  },

  async updateUser(id: string, data: UpdateUserInput): Promise<AdminUser> {
    const res = await api.patch<AdminUser>(`/api/admin/users/${id}`, data);
    return res.data;
  },

  async changePassword(id: string, password: string): Promise<void> {
    await api.patch(`/api/admin/users/${id}/password`, { password });
  },
};
