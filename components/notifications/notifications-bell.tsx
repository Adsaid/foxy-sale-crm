"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const typeIcons: Record<NotificationType, typeof Bell> = {
  CALL_ASSIGNED: Phone,
  CALL_RESCHEDULED: ArrowRightLeft,
  CALL_COMPLETED: CheckCheck,
  ACCOUNT_REASSIGNED: Briefcase,
  CALL_CANCELLED: Ban,
  ACCOUNT_UPDATED_BY_ADMIN: Shield,
  CALL_STARTING_SOON: Clock,
  CALL_LINK_UPDATED: Link2,
};

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
        <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground leading-snug">
          {notification.message}
        </p>
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

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data: countData } = useUnreadCount();
  const { data: notifData } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = countData?.count ?? 0;
  const notifications = notifData?.notifications ?? [];

  const handleMarkRead = (id: string) => {
    markRead.mutate([id]);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Сповіщення</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              Прочитати все
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
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
