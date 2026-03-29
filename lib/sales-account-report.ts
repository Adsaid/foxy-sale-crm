import type { Prisma } from "@prisma/client";
import type { Account } from "@/types/crm";
import {
  accountDesktopTypeLabelUk,
  accountWarmUpStageLabelUk,
} from "@/lib/account-fields";

export const ACCOUNT_REPORT_OWNER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  badgeBgColor: true,
  badgeTextColor: true,
} as const;

export const accountReportPrismaInclude = {
  owner: { select: ACCOUNT_REPORT_OWNER_SELECT },
} satisfies Prisma.AccountInclude;

export type AccountForReport = Prisma.AccountGetPayload<{
  include: typeof accountReportPrismaInclude;
}>;

export function accountToSnapshot(account: AccountForReport): Account {
  return {
    id: account.id,
    account: account.account,
    type: account.type,
    profileLinks: account.profileLinks,
    description: account.description,
    operationalStatus: account.operationalStatus,
    warmUpStage: account.warmUpStage,
    location: account.location,
    desktopType: account.desktopType,
    contactsCount: account.contactsCount,
    profileViewsCount: account.profileViewsCount,
    ownerId: account.ownerId,
    owner: account.owner,
    createdAt: account.createdAt.toISOString(),
  };
}

function pluralUk(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function viewsPhrase(n: number): string {
  return `${n} ${pluralUk(n, "перегляд", "перегляди", "переглядів")}`;
}

function contactsPhrase(n: number): string {
  return `${n} ${pluralUk(n, "контакт", "контакти", "контактів")}`;
}

function statusDot(
  status: Account["operationalStatus"]
): string {
  switch (status) {
    case "ACTIVE":
      return "🟢";
    case "PAUSED":
      return "🔴";
    case "SETUP":
      return "🟡";
    case "WARMING":
      return "🟢";
    default:
      return "⚪";
  }
}

function sortByAccountName(a: Account, b: Account): number {
  return a.account.localeCompare(b.account, "uk", { sensitivity: "base" });
}

function upworkLine(acc: Account): string {
  const locationLabel = acc.location?.trim() || "—";
  const dot = statusDot(acc.operationalStatus);
  const name = acc.account.trim();
  const desk = acc.desktopType ? accountDesktopTypeLabelUk[acc.desktopType] : "—";

  if (acc.operationalStatus === "WARMING" && acc.warmUpStage) {
    const stage = accountWarmUpStageLabelUk[acc.warmUpStage];
    return `${locationLabel} ${dot}${name} - ${desk}, ${stage.toLowerCase()}`;
  }

  const views = acc.profileViewsCount;
  if (views != null) {
    return `${locationLabel} ${dot}${name} - ${desk} - ${viewsPhrase(views)}`;
  }
  return `${locationLabel} ${dot}${name} - ${desk}`;
}

function linkedInLine(acc: Account): string {
  const dot = statusDot(acc.operationalStatus);
  const name = acc.account.trim();

  if (acc.operationalStatus === "WARMING" && acc.warmUpStage) {
    const stage = accountWarmUpStageLabelUk[acc.warmUpStage].toLowerCase();
    if (acc.contactsCount == null && acc.profileViewsCount == null) {
      return `${dot}${name} ${stage}`;
    }
  }

  if (acc.contactsCount != null || acc.profileViewsCount != null) {
    const c = acc.contactsCount ?? 0;
    const v = acc.profileViewsCount ?? 0;
    return `${dot}${name} - ${contactsPhrase(c)}, ${viewsPhrase(v)}`;
  }
  return `${dot}${name}`;
}

/** Plain text для Telegram (і збереження в telegramText). */
export function buildSalesAccountReportTelegramText(
  snapshots: Account[],
  salesDisplayName: string
): string {
  const up = snapshots.filter((a) => a.type === "UPWORK").sort(sortByAccountName);
  const li = snapshots.filter((a) => a.type === "LINKEDIN").sort(sortByAccountName);

  const lines: string[] = [
    `Звіт по акаунтах — ${salesDisplayName}`,
    "",
    "Upwork",
    ...up.map(upworkLine),
    "",
    "LinkedIn",
    ...li.map(linkedInLine),
  ];

  return lines.join("\n");
}

const TELEGRAM_MAX = 3900;

export function chunkTelegramPlainParts(intro: string, body: string): string[] {
  const first = `${intro}\n\n${body}`;
  if (first.length <= TELEGRAM_MAX) return [first];

  const parts: string[] = [];
  if (intro.length <= TELEGRAM_MAX) {
    parts.push(intro);
  } else {
    for (let i = 0; i < intro.length; i += TELEGRAM_MAX) {
      parts.push(intro.slice(i, i + TELEGRAM_MAX));
    }
  }

  for (let i = 0; i < body.length; i += TELEGRAM_MAX) {
    parts.push(body.slice(i, i + TELEGRAM_MAX));
  }

  return parts;
}
