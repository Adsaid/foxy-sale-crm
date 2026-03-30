export type NotificationType =
  | "CALL_ASSIGNED"
  | "CALL_DEV_REASSIGNED_AWAY"
  | "CALL_RESCHEDULED"
  | "CALL_COMPLETED"
  | "ACCOUNT_REASSIGNED"
  | "CALL_CANCELLED"
  | "ACCOUNT_UPDATED_BY_ADMIN"
  | "CALL_STARTING_SOON"
  | "CALL_LINK_UPDATED"
  | "ACCOUNTS_REPORT_SUBMITTED";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  serverNow: string;
}

export interface UnreadCountResponse {
  count: number;
}
