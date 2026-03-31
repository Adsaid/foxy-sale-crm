export type AccountType = "UPWORK" | "LINKEDIN";

export type AccountOperationalStatus = "ACTIVE" | "PAUSED" | "SETUP" | "WARMING";
export type AccountWarmUpStage =
  | "PROFILE_FILLING"
  | "EMAIL_WARMING"
  | "DOCS_EMAIL_WARMING"
  | "STABLE";
export type AccountDesktopType =
  | "ADS_POWER"
  | "ANY_DESK"
  | "RIVNE_IP"
  | "LUTSK_IP"
  | "LVIV_IP"
  | "DOLPHIN"
  | "MODEM";
export type CallType = "HR" | "TECH" | "CLIENT" | "PM" | "CLIENT_TECH";
export type CallStage = "HR" | "TECH" | "CLIENT" | "PM" | "CLIENT_TECH";
export type CallStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type CallOutcome = "SUCCESS" | "UNSUCCESSFUL" | "PENDING";

export interface Account {
  id: string;
  account: string;
  type: AccountType;
  profileLinks: string[];
  description?: string | null;
  operationalStatus?: AccountOperationalStatus | null;
  warmUpStage?: AccountWarmUpStage | null;
  location?: string | null;
  desktopType?: AccountDesktopType | null;
  contactsCount?: number | null;
  profileViewsCount?: number | null;
  ownerId: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    badgeBgColor?: string | null;
    badgeTextColor?: string | null;
  };
  /** Дата створення акаунта на платформі (не дата запису в CRM). */
  accountCreatedAt?: string | null;
  createdAt: string;
}

export interface SalesAccountReportSubmittedBy {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Збережений звіт сейла по акаунтах (для адмінської вкладки «Звіти»). */
export interface SalesAccountReportListItem {
  id: string;
  createdAt: string;
  weekYear: number;
  weekNumber: number;
  weekStart: string;
  accountsSnapshot: Account[];
  telegramText?: string | null;
  submittedBy: SalesAccountReportSubmittedBy;
}

export interface SalesAccountReportsListResponse {
  items: SalesAccountReportListItem[];
  total: number;
  page: number;
  limit: number;
}

/** Один запис з історії переносів (для бічної панелі). */
export interface CallTransferEntry {
  transferredFromAt: string;
  transferredToAt: string;
  transferredReason: string | null;
  transferredByName: string | null;
  transferredByBadgeBgColor?: string | null;
  transferredByBadgeTextColor?: string | null;
}

/** Дані з CallSummary, якщо дзвінок було перенесено (лише коли є підсумок). */
export interface CallTransferInfo {
  isTransferred: boolean;
  /** Останній перенос (дублює останній елемент transfers). */
  transferredFromAt: string | null;
  transferredToAt: string | null;
  transferredReason: string | null;
  transferredByName: string | null;
  transferredByBadgeBgColor?: string | null;
  transferredByBadgeTextColor?: string | null;
  /** Усі переноси в хронологічному порядку. */
  transfers: CallTransferEntry[];
}

export interface CallEvent {
  id: string;
  accountId: string;
  account?: Account;
  company: string;
  interviewerName: string;
  callType: CallType;
  callStartedAt: string;
  callEndedAt?: string | null;
  callerId: string;
  caller?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: "DEV" | "DESIGNER";
  };
  createdById: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    badgeBgColor?: string | null;
    badgeTextColor?: string | null;
  };
  status: CallStatus;
  outcome: CallOutcome;
  devFeedback?: string | null;
  movingToNextStage: boolean;
  nextStep?: CallStage | null;
  nextStepDate?: string | null;
  expectedFeedbackDate?: string | null;
  notes?: string | null;
  salaryFrom?: number | null;
  salaryTo?: number | null;
  callLink?: string | null;
  description?: string | null;
  /** Заповнюється в GET /api/calls/[id], якщо для дзвінка є CallSummary з переносом. */
  transferInfo?: CallTransferInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  account: string;
  type: AccountType;
  profileLinks?: string[];
  description?: string;
  ownerId?: string;
  operationalStatus?: AccountOperationalStatus | null;
  warmUpStage?: AccountWarmUpStage | null;
  location?: string | null;
  desktopType?: AccountDesktopType | null;
  contactsCount?: number | null;
  profileViewsCount?: number | null;
  /** yyyy-MM-dd або null */
  accountCreatedAt?: string | null;
}

export interface UpdateAccountInput {
  account?: string;
  type?: AccountType;
  profileLinks?: string[];
  description?: string | null;
  ownerId?: string;
  operationalStatus?: AccountOperationalStatus | null;
  warmUpStage?: AccountWarmUpStage | null;
  location?: string | null;
  desktopType?: AccountDesktopType | null;
  contactsCount?: number | null;
  profileViewsCount?: number | null;
  accountCreatedAt?: string | null;
}

/** Дані з форми акаунта (створення / повне оновлення). */
export interface AccountFormPayload {
  account: string;
  type: AccountType;
  profileLinks?: string[];
  description?: string | null | undefined;
  ownerId?: string;
  operationalStatus: AccountOperationalStatus | null;
  warmUpStage: AccountWarmUpStage | null;
  desktopType: AccountDesktopType | null;
  location: string | null;
  contactsCount: number | null;
  profileViewsCount: number | null;
  /** yyyy-MM-dd з input type="date", порожньо = null */
  accountCreatedAt: string | null;
}

export interface CreateCallInput {
  accountId: string;
  company: string;
  interviewerName: string;
  callType: CallType;
  callStartedAt: string;
  callerId: string;
  salaryFrom: number;
  salaryTo?: number;
  callLink?: string;
  description?: string;
}

export interface UpdateCallInput {
  status?: CallStatus;
  outcome?: CallOutcome;
  callStartedAt?: string;
  movingToNextStage?: boolean;
  nextStep?: CallStage | null;
  nextStepDate?: string | null;
  expectedFeedbackDate?: string | null;
  notes?: string | null;
  salaryFrom?: number;
  salaryTo?: number | null;
  callLink?: string | null;
  description?: string | null;
  /** Mark call as rescheduled/transfered when editing datetime (used for CallSummary) */
  transferred?: boolean;
  transferredReason?: string | null;
  /** Перепризначення виконавця; дозволено лише для статусу SCHEDULED (перевірка на API). */
  callerId?: string;
}

export interface CompleteCallInput {
  devFeedback?: string;
}

export interface AdvanceCallStageInput {
  callType: CallType;
  callStartedAt: string;
}

export type InterviewerMatchSource = "active" | "history";

export interface InterviewerDuplicateMatch {
  source: InterviewerMatchSource;
  id: string;
  company: string;
  interviewerName: string;
  callType: CallType;
  callStartedAt: string;
  /** Ім'я виконавця на дзвінку (прізвище та ім'я) */
  devName: string;
  status?: CallStatus;
  outcome?: CallOutcome;
}

export interface CallSummary {
  id: string;
  callEventId?: string | null;
  company: string;
  accountName: string;
  accountType: AccountType;
  callType: CallType;
  callerFirstName: string;
  callerLastName: string;
  callerRole?: "DEV" | "DESIGNER" | null;
  interviewerName: string;
  callStartedAt: string;
  callEndedAt?: string | null;
  outcome: CallOutcome;
  devFeedback?: string | null;
  movingToNextStage: boolean;
  nextStep?: CallStage | null;
  nextStepDate?: string | null;
  notes?: string | null;
  createdById: string;
  createdByName?: string;
  createdByBadgeBgColor?: string | null;
  createdByBadgeTextColor?: string | null;
  isTransferred?: boolean;
  transferredById?: string | null;
  transferredByName?: string | null;
  transferredByBadgeBgColor?: string | null;
  transferredByBadgeTextColor?: string | null;
  transferredAt?: string | null;
  transferredFromAt?: string | null;
  transferredToAt?: string | null;
  transferredReason?: string | null;
  callCreatedAt?: string | null;
  createdAt: string;
}

export interface DevUser {
  id: string;
  role: "DEV" | "DESIGNER";
  firstName: string;
  lastName: string;
  email: string;
  specialization?: string | null;
  technologies: { id: string; name: string }[];
}

export interface SalesStatsData {
  totalCalls: number;
  completedCalls: number;
  successCalls: number;
  unsuccessfulCalls: number;
  pendingCalls: number;
  totalAccounts: number;
}

/** GET /api/stats/calls — агрегати по дзвінках (scope залежить від ролі та query). */
export interface CallStatsData {
  totalCalls: number;
  completedCalls: number;
  successCalls: number;
  unsuccessfulCalls: number;
  pendingCalls: number;
}

/** Параметри GET /api/stats/calls та /api/stats/calls/timeseries (ISO-дати; salesId / callerId — лише для адміна). */
export interface CallStatsQueryParams {
  from?: string;
  to?: string;
  salesId?: string;
  callerId?: string;
  timeZone?: string;
  granularity?: "hour" | "day";
}

/** Точка часового ряду для графіка дзвінків (GET /api/stats/calls/timeseries). */
export interface CallStatsTimeseriesPoint {
  key: string;
  label: string;
  total: number;
  success: number;
  unsuccessful: number;
}

export interface CallStatsTimeseriesResponse {
  points: CallStatsTimeseriesPoint[];
}

/** GET /api/stats/accounts — агрегати по акаунтах (лише адмін). */
export interface AccountStatsData {
  totalAccounts: number;
  upwork: number;
  linkedin: number;
  active: number;
  paused: number;
  setup: number;
  warming: number;
  noOperationalStatus: number;
}

/** Параметри GET /api/stats/accounts та timeseries (ISO-дати; salesId — ownerId сейла). */
export interface AccountStatsQueryParams {
  from?: string;
  to?: string;
  salesId?: string;
  timeZone?: string;
  granularity?: "hour" | "day";
}

/** Точка ряду для графіка акаунтів (GET /api/stats/accounts/timeseries). */
export interface AccountStatsTimeseriesPoint {
  key: string;
  label: string;
  total: number;
  upwork: number;
  linkedin: number;
  active: number;
  paused: number;
  setup: number;
  warming: number;
  noOperationalStatus: number;
}

export interface AccountStatsTimeseriesResponse {
  points: AccountStatsTimeseriesPoint[];
}

export interface DevStatsData {
  totalAssigned: number;
  completed: number;
  successRate: number;
  pending: number;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountStatus?: "APPROVED" | "PENDING";
  specialization?: string | null;
  badgeBgColor?: string | null;
  badgeTextColor?: string | null;
  technologies: { id: string; name: string }[];
  createdAt: string;
}

export interface AdminInvitation {
  id: string;
  code: string;
  email: string;
  role: "SALES" | "DEV" | "DESIGNER";
  createdById: string;
  createdAt: string;
  usedAt: string | null;
  usedByUserId: string | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  specialization?: string | null;
  technologyIds?: string[];
  badgeBgColor?: string | null;
  badgeTextColor?: string | null;
}
