import type { Account, CallEvent as PrismaCall, CallSummary } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildCallTransferInfo } from "@/lib/transfer-history";
import type { CallEvent } from "@/types/crm";

export const callDetailInclude = {
  account: true,
  caller: { select: { id: true, firstName: true, lastName: true, email: true } },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      badgeBgColor: true,
      badgeTextColor: true,
    },
  },
} as const;

type CallWithDetail = PrismaCall & {
  account: Account;
  caller: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    badgeBgColor: string | null;
    badgeTextColor: string | null;
  };
};

function mapAccount(a: Account): CallEvent["account"] {
  return {
    id: a.id,
    account: a.account,
    type: a.type,
    profileLinks: a.profileLinks,
    description: a.description ?? null,
    operationalStatus: a.operationalStatus ?? null,
    warmUpStage: a.warmUpStage ?? null,
    location: a.location ?? null,
    desktopType: a.desktopType ?? null,
    contactsCount: a.contactsCount ?? null,
    profileViewsCount: a.profileViewsCount ?? null,
    ownerId: a.ownerId,
    createdAt: a.createdAt.toISOString(),
  };
}

/**
 * Дані для бічної панелі з підсумку: спочатку знімок CallSummary (історія),
 * за потреби доповнено живим CallEvent (зарплата, посилання, опис тощо).
 */
export async function buildCallEventDetailFromSummary(
  summary: CallSummary,
  call: CallWithDetail | null
): Promise<CallEvent> {
  const transferInfo = await buildCallTransferInfo({
    isTransferred: summary.isTransferred,
    transferredFromAt: summary.transferredFromAt,
    transferredToAt: summary.transferredToAt,
    transferredReason: summary.transferredReason,
    transferredById: summary.transferredById,
    transferHistory: summary.transferHistory,
  });

  const createdBy = await prisma.user.findUnique({
    where: { id: summary.createdById },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      badgeBgColor: true,
      badgeTextColor: true,
    },
  });

  const status =
    summary.callEndedAt != null
      ? "COMPLETED"
      : (call?.status ?? "SCHEDULED");

  const account: CallEvent["account"] = call
    ? mapAccount(call.account)
    : {
        id: summary.id,
        account: summary.accountName,
        type: summary.accountType,
        profileLinks: [],
        description: null,
        operationalStatus: null,
        warmUpStage: null,
        location: null,
        desktopType: null,
        contactsCount: null,
        profileViewsCount: null,
        ownerId: summary.createdById,
        createdAt: summary.createdAt.toISOString(),
      };

  const caller: CallEvent["caller"] = call
    ? call.caller
    : {
        id: "",
        firstName: summary.callerFirstName,
        lastName: summary.callerLastName,
        email: "",
      };

  return {
    id: summary.id,
    accountId: call?.accountId ?? summary.id,
    account,
    company: summary.company,
    interviewerName: summary.interviewerName,
    callType: summary.callType,
    callStartedAt: summary.callStartedAt.toISOString(),
    callEndedAt: summary.callEndedAt?.toISOString() ?? null,
    callerId: call?.callerId ?? "",
    caller,
    createdById: summary.createdById,
    createdBy: createdBy ?? undefined,
    status,
    outcome: summary.outcome,
    devFeedback: summary.devFeedback ?? null,
    movingToNextStage: summary.movingToNextStage,
    nextStep: summary.nextStep ?? null,
    nextStepDate: summary.nextStepDate?.toISOString() ?? null,
    expectedFeedbackDate: call?.expectedFeedbackDate?.toISOString() ?? null,
    notes: summary.notes ?? null,
    salaryFrom: call?.salaryFrom ?? null,
    salaryTo: call?.salaryTo ?? null,
    callLink: call?.callLink ?? null,
    description: call?.description ?? null,
    transferInfo,
    createdAt: summary.createdAt.toISOString(),
    updatedAt: summary.createdAt.toISOString(),
  };
}
