"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { notificationService } from "@/services/notification-service";
import type { Notification, NotificationType } from "@/types/notification";
import { useAuth } from "@/hooks/use-auth";

const POLL_INTERVAL = 5_000;

const toastConfig: Record<NotificationType, { variant: "info" | "success"; icon?: string }> = {
  CALL_ASSIGNED: { variant: "info" },
  CALL_RESCHEDULED: { variant: "info" },
  CALL_COMPLETED: { variant: "success" },
  ACCOUNT_REASSIGNED: { variant: "info" },
  CALL_CANCELLED: { variant: "info" },
  ACCOUNT_UPDATED_BY_ADMIN: { variant: "info" },
  CALL_STARTING_SOON: { variant: "info" },
  CALL_LINK_UPDATED: { variant: "info" },
};

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: POLL_INTERVAL,
    enabled: !!user,
  });
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const seenIds = useRef(new Set<string>());
  const initialFetchDone = useRef(false);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: POLL_INTERVAL,
    enabled: !!user,
  });

  useEffect(() => {
    if (!query.data?.notifications) return;

    if (!initialFetchDone.current) {
      for (const n of query.data.notifications) {
        seenIds.current.add(n.id);
      }
      initialFetchDone.current = true;
      return;
    }

    for (const n of query.data.notifications) {
      if (seenIds.current.has(n.id)) continue;
      seenIds.current.add(n.id);

      const cfg = toastConfig[n.type as NotificationType];
      if (cfg?.variant === "success") {
        toast.success(n.title, { description: n.message });
      } else {
        toast.info(n.title, { description: n.message });
      }
    }
  }, [query.data]);

  const resetSeen = useCallback(() => {
    seenIds.current.clear();
    initialFetchDone.current = false;
  }, []);

  return { ...query, resetSeen };
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => notificationService.markRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });
}
