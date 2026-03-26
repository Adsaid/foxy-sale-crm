import api from "@/lib/api/client";
import type { NotificationsResponse, UnreadCountResponse } from "@/types/notification";

export const notificationService = {
  async getNotifications(since?: string): Promise<NotificationsResponse> {
    const params: Record<string, string> = {};
    if (since) params.since = since;
    const res = await api.get<NotificationsResponse>("/api/notifications", { params });
    return res.data;
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const res = await api.get<UnreadCountResponse>("/api/notifications/unread-count");
    return res.data;
  },

  async markRead(ids: string[]): Promise<void> {
    await api.post("/api/notifications/read", { ids });
  },

  async markAllRead(): Promise<void> {
    await api.post("/api/notifications/read", { readAll: true });
  },
};
