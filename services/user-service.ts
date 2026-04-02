import api from "@/lib/api/client";
import type { DevUser, AdminUser, AdminInvitation, UpdateUserInput, PendingTeam } from "@/types/crm";

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

  async getInvitations(): Promise<AdminInvitation[]> {
    const res = await api.get<AdminInvitation[]>("/api/admin/invitations");
    return res.data;
  },

  async createInvitation(data: {
    email: string;
    role: "SALES" | "DEV" | "DESIGNER";
  }): Promise<AdminInvitation> {
    const res = await api.post<AdminInvitation>("/api/admin/invitations", data);
    return res.data;
  },

  async deleteInvitation(id: string): Promise<void> {
    await api.delete(`/api/admin/invitations/${id}`);
  },

  async getPendingUsers(): Promise<AdminUser[]> {
    const res = await api.get<AdminUser[]>("/api/admin/pending-users");
    return res.data;
  },

  async approveUser(id: string): Promise<AdminUser> {
    const res = await api.post<AdminUser>(`/api/admin/users/${id}/approve`);
    return res.data;
  },

  async getPendingTeams(): Promise<PendingTeam[]> {
    const res = await api.get<PendingTeam[]>("/api/super-admin/pending-teams");
    return res.data;
  },

  async approveTeam(id: string): Promise<void> {
    await api.post(`/api/super-admin/teams/${id}/approve`);
  },
};
