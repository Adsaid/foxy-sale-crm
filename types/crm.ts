export type AccountType = "UPWORK" | "LINKEDIN";
export type CallType = "HR" | "TECH" | "CLIENT" | "PM" | "CLIENT_TECH";
export type CallStage = "HR" | "TECH" | "CLIENT" | "PM" | "CLIENT_TECH";
export type CallStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type CallOutcome = "SUCCESS" | "UNSUCCESSFUL" | "PENDING";

export interface Account {
  id: string;
  account: string;
  type: AccountType;
  ownerId: string;
  createdAt: string;
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
  caller?: { id: string; firstName: string; lastName: string; email: string };
  createdById: string;
  status: CallStatus;
  outcome: CallOutcome;
  devFeedback?: string | null;
  movingToNextStage: boolean;
  nextStep?: CallStage | null;
  nextStepDate?: string | null;
  expectedFeedbackDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  account: string;
  type: AccountType;
}

export interface UpdateAccountInput {
  account?: string;
  type?: AccountType;
}

export interface CreateCallInput {
  accountId: string;
  company: string;
  interviewerName: string;
  callType: CallType;
  callStartedAt: string;
  callerId: string;
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
  /** Ім'я DEV на дзвінку (прізвище та ім'я) */
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
  createdAt: string;
}

export interface DevUser {
  id: string;
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
  specialization?: string | null;
  technologies: { id: string; name: string }[];
  createdAt: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  specialization?: string | null;
  technologyIds?: string[];
}
