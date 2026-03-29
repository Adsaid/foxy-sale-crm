"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCheck,
  Phone,
  ArrowRightLeft,
  Briefcase,
  Ban,
  Shield,
  Clock,
  Link2,
  FileText,
  Send,
  Loader2,
  MessageCircle,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import type { Notification, NotificationType } from "@/types/notification";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ManagerBadge } from "@/components/ui/manager-badge";

const typeIcons: Record<NotificationType, typeof Bell> = {
  CALL_ASSIGNED: Phone,
  CALL_RESCHEDULED: ArrowRightLeft,
  CALL_COMPLETED: CheckCheck,
  ACCOUNT_REASSIGNED: Briefcase,
  CALL_CANCELLED: Ban,
  ACCOUNT_UPDATED_BY_ADMIN: Shield,
  CALL_STARTING_SOON: Clock,
  CALL_LINK_UPDATED: Link2,
  ACCOUNTS_REPORT_SUBMITTED: FileText,
};

function NotificationMessageBody({
  message,
  payload,
  isUnread,
}: {
  message: string;
  payload?: Record<string, unknown> | null;
  isUnread: boolean;
}) {
  const actorName =
    typeof payload?.actorDisplayName === "string" ? payload.actorDisplayName : null;
  const bg = typeof payload?.actorBadgeBgColor === "string" ? payload.actorBadgeBgColor : null;
  const tc =
    typeof payload?.actorBadgeTextColor === "string" ? payload.actorBadgeTextColor : null;

  const nl = message.indexOf("\n");
  const firstLine = nl === -1 ? message : message.slice(0, nl);
  const rest = nl === -1 ? "" : message.slice(nl + 1);

  const bodyTone = isUnread ? "text-foreground" : "text-muted-foreground";

  if (actorName && firstLine.startsWith(actorName)) {
    const tailFirst = firstLine.slice(actorName.length);
    return (
      <div className={cn("space-y-0.5 text-xs leading-snug", bodyTone)}>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <ManagerBadge
            name={actorName}
            bgColor={bg}
            textColor={tc}
            className="h-auto min-h-6 shrink-0 py-0.5 text-[11px] font-medium leading-tight"
          />
          <span className="min-w-0">{tailFirst}</span>
        </div>
        {rest ? <div className="whitespace-pre-line">{rest}</div> : null}
      </div>
    );
  }

  return (
    <span className={cn("whitespace-pre-line text-xs leading-snug", bodyTone)}>{message}</span>
  );
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "щойно";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  return `${days} дн тому`;
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const Icon = typeIcons[notification.type as NotificationType] ?? Bell;
  const isUnread = notification.readAt == null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isUnread ? "bg-accent/50" : "bg-transparent"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUnread
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-tight",
            isUnread ? "font-medium" : "text-muted-foreground"
          )}
        >
          {notification.title}
        </p>
        <div className="mt-0.5">
          <NotificationMessageBody
            message={notification.message}
            payload={notification.payload}
            isUnread={isUnread}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {isUnread && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          title="Позначити прочитаним"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function NotificationsPopoverSkeleton() {
  return (
    <div className="flex flex-col py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-3 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[85%]" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationsBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadCount();
  const { data: notifData, isLoading: notificationsLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [tgLoading, setTgLoading] = useState(false);

  const tgStatusQuery = useQuery({
    queryKey: ["telegram", "connect-status"],
    queryFn: async () => {
      const res = await api.get<{ connected: boolean }>("/api/telegram/connect");
      return res.data.connected;
    },
    enabled: !!user && open,
    staleTime: 0,
  });

  const telegramConnected = tgStatusQuery.data === true;

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["telegram", "connect-status"] });
    }, 4000);
    return () => window.clearInterval(id);
  }, [open, queryClient]);

  const unreadCount = countData?.count ?? 0;
  const notifications = notifData?.notifications ?? [];

  const handleMarkRead = (id: string) => {
    markRead.mutate([id]);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const handleConnectTelegram = useCallback(async () => {
    if (telegramConnected) return;
    setTgLoading(true);
    try {
      const res = await api.post<{ deepLink: string | null }>("/api/telegram/connect");
      const link = res.data.deepLink;
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
        toast.success("Відкрийте Telegram і натисніть Start у боті.");
      } else {
        toast.error("Не вдалося згенерувати посилання.");
      }
    } catch {
      toast.error("Помилка при підключенні Telegram.");
    } finally {
      setTgLoading(false);
    }
  }, [telegramConnected]);

  const handleDisconnectTelegram = useCallback(async () => {
    setTgLoading(true);
    try {
      await api.delete("/api/telegram/connect");
      await queryClient.invalidateQueries({ queryKey: ["telegram", "connect-status"] });
      toast.success("Telegram від’єднано.");
    } catch {
      toast.error("Не вдалося від’єднати.");
    } finally {
      setTgLoading(false);
    }
  }, [queryClient]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          queryClient.invalidateQueries({ queryKey: ["telegram", "connect-status"] });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background"
              aria-label={`Непрочитаних сповіщень: ${unreadCount}`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 gap-0 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b px-4 py-3">
          <h3 className="shrink-0 text-sm font-semibold">Сповіщення</h3>
          {tgStatusQuery.isLoading && open ? (
            <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" disabled>
              <Loader2 className="h-3 w-3 animate-spin" />
            </Button>
          ) : telegramConnected ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex h-7 cursor-default items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    <MessageCircle className="h-3.5 w-3.5" />
                    У Telegram
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[16rem]">
                  Сповіщення з CRM дублюються в цей чат у Telegram.
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-7 w-7 shrink-0 text-muted-foreground"
                    disabled={tgLoading}
                    onClick={handleDisconnectTelegram}
                    aria-label="Від’єднати Telegram"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Від’єднати Telegram</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 text-xs"
                  disabled={tgLoading}
                  onClick={handleConnectTelegram}
                >
                  {tgLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Підключити Telegram
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[18rem]">
                Дублювання сповіщень CRM у Telegram. Натисніть — відкриється бот, далі натисніть Start,
                щоб прив’язати цей акаунт.
              </TooltipContent>
            </Tooltip>
          )}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 shrink-0 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              Прочитати все
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {open && notificationsLoading ? (
            <NotificationsPopoverSkeleton />
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Немає сповіщень</p>
            </div>
          ) : (
            <div className="flex flex-col py-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
