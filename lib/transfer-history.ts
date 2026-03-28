import { prisma } from "@/lib/prisma";
import type { CallTransferEntry, CallTransferInfo } from "@/types/crm";

export type TransferHistoryStoredEntry = {
  fromAt: string;
  toAt: string;
  byId: string;
  reason: string | null;
  at?: string;
};

export function parseStoredTransferHistory(raw: unknown): TransferHistoryStoredEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: TransferHistoryStoredEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const fromAt = typeof o.fromAt === "string" ? o.fromAt : null;
    const toAt = typeof o.toAt === "string" ? o.toAt : null;
    const byId = typeof o.byId === "string" ? o.byId : null;
    if (!fromAt || !toAt || !byId) continue;
    let reason: string | null = null;
    if (typeof o.reason === "string") reason = o.reason;
    else if (o.reason === null) reason = null;
    out.push({
      fromAt,
      toAt,
      byId,
      reason,
      at: typeof o.at === "string" ? o.at : undefined,
    });
  }
  return out;
}

export function appendTransferEntry(
  current: unknown,
  entry: {
    fromAt: Date;
    toAt: Date;
    byId: string;
    reason: string | null;
  }
): TransferHistoryStoredEntry[] {
  const prev = parseStoredTransferHistory(current);
  const newEntry: TransferHistoryStoredEntry = {
    fromAt: entry.fromAt.toISOString(),
    toAt: entry.toAt.toISOString(),
    byId: entry.byId,
    reason: entry.reason,
    at: new Date().toISOString(),
  };
  return [...prev, newEntry];
}

export async function buildCallTransferInfo(summary: {
  isTransferred: boolean;
  transferredFromAt: Date | null;
  transferredToAt: Date | null;
  transferredReason: string | null;
  transferredById: string | null;
  transferHistory: unknown;
}): Promise<CallTransferInfo | null> {
  if (!summary.isTransferred) return null;

  let rawEntries = parseStoredTransferHistory(summary.transferHistory);
  if (
    rawEntries.length === 0 &&
    summary.transferredFromAt &&
    summary.transferredById
  ) {
    rawEntries = [
      {
        fromAt: summary.transferredFromAt.toISOString(),
        toAt: (summary.transferredToAt ?? summary.transferredFromAt).toISOString(),
        byId: summary.transferredById,
        reason: summary.transferredReason,
      },
    ];
  }

  if (rawEntries.length === 0) return null;

  const userIds = [...new Set(rawEntries.map((e) => e.byId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      badgeBgColor: true,
      badgeTextColor: true,
    },
  });
  const map = new Map(users.map((u) => [u.id, u]));

  const transfers: CallTransferEntry[] = rawEntries.map((e) => {
    const u = map.get(e.byId);
    return {
      transferredFromAt: e.fromAt,
      transferredToAt: e.toAt,
      transferredReason: e.reason,
      transferredByName: u ? `${u.firstName} ${u.lastName}`.trim() : null,
      transferredByBadgeBgColor: u?.badgeBgColor ?? null,
      transferredByBadgeTextColor: u?.badgeTextColor ?? null,
    };
  });

  const last = transfers[transfers.length - 1];
  return {
    isTransferred: true,
    transferredFromAt: last.transferredFromAt,
    transferredToAt: last.transferredToAt,
    transferredReason: last.transferredReason,
    transferredByName: last.transferredByName,
    transferredByBadgeBgColor: last.transferredByBadgeBgColor,
    transferredByBadgeTextColor: last.transferredByBadgeTextColor,
    transfers,
  };
}
