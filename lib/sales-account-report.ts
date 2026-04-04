import type { Prisma } from "@prisma/client";
import type { Account } from "@/types/crm";
import { appendTelegramCrmLinkFooter, escapeHtml } from "@/lib/telegram";
import {
  accountDesktopTypeLabelUk,
  accountWarmUpStageLabelUk,
  accountLocationRegionalEmoji,
  formatAccountLocationLabel,
} from "@/lib/account-fields";

export const ACCOUNT_REPORT_OWNER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  badgeBgColor: true,
  badgeTextColor: true,
} as const;

/** Явний select для знімка звіту — усі поля таблиці/картки, включно з датою створення на платформі. */
export const accountReportSnapshotSelect = {
  id: true,
  account: true,
  type: true,
  profileLinks: true,
  description: true,
  operationalStatus: true,
  warmUpStage: true,
  location: true,
  desktopType: true,
  contactsCount: true,
  profileViewsCount: true,
  ownerId: true,
  accountCreatedAt: true,
  createdAt: true,
  owner: { select: ACCOUNT_REPORT_OWNER_SELECT },
} satisfies Prisma.AccountSelect;

export type AccountForReport = Prisma.AccountGetPayload<{
  select: typeof accountReportSnapshotSelect;
}>;

function dateFieldToIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : value.toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

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
    accountCreatedAt: dateFieldToIso(account.accountCreatedAt),
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

/** Префікс «🇺🇦 UA» для рядка звіту; порожньо, якщо локації немає або вона не відображається. */
function accountReportLocationPrefix(stored: string | null | undefined): string {
  if (!stored?.trim()) return "";
  const label = formatAccountLocationLabel(stored);
  if (!label) return "";
  const flag = accountLocationRegionalEmoji(stored);
  return flag ? `${flag} ${label}` : label;
}

function upworkLine(acc: Account): string {
  const loc = accountReportLocationPrefix(acc.location);
  const head = loc ? `${loc} ` : "";
  const dot = statusDot(acc.operationalStatus);
  const name = acc.account.trim();
  const desk = acc.desktopType ? accountDesktopTypeLabelUk[acc.desktopType] : "—";

  if (acc.operationalStatus === "WARMING" && acc.warmUpStage) {
    const stage = accountWarmUpStageLabelUk[acc.warmUpStage];
    return `${head}${dot}${name} - ${desk}, ${stage.toLowerCase()}`;
  }

  const views = acc.profileViewsCount;
  if (views != null) {
    return `${head}${dot}${name} - ${desk} - ${viewsPhrase(views)}`;
  }
  return `${head}${dot}${name} - ${desk}`;
}

function linkedInLine(acc: Account): string {
  const loc = accountReportLocationPrefix(acc.location);
  const head = loc ? `${loc} ` : "";
  const dot = statusDot(acc.operationalStatus);
  const name = acc.account.trim();

  if (acc.operationalStatus === "WARMING" && acc.warmUpStage) {
    const stage = accountWarmUpStageLabelUk[acc.warmUpStage].toLowerCase();
    if (acc.contactsCount == null && acc.profileViewsCount == null) {
      return `${head}${dot}${name} ${stage}`;
    }
  }

  if (acc.contactsCount != null || acc.profileViewsCount != null) {
    const c = acc.contactsCount ?? 0;
    const v = acc.profileViewsCount ?? 0;
    return `${head}${dot}${name} - ${contactsPhrase(c)}, ${viewsPhrase(v)}`;
  }
  return `${head}${dot}${name}`;
}

/** Plain text для Telegram (і збереження в telegramText). Заголовок і сейл додає notifyAdminsSalesAccountReport. */
export function buildSalesAccountReportTelegramText(snapshots: Account[]): string {
  const up = snapshots.filter((a) => a.type === "UPWORK").sort(sortByAccountName);
  const li = snapshots.filter((a) => a.type === "LINKEDIN").sort(sortByAccountName);

  const lines: string[] = [
    "Upwork",
    ...up.map(upworkLine),
    "",
    "LinkedIn",
    ...li.map(linkedInLine),
  ];

  return lines.join("\n");
}

const TELEGRAM_MAX = 3900;

/** HTML для Telegram (<b>…</b>); тіло екранується. Розбивка без розриву тегів. */
export function chunkAccountReportTelegramHtmlParts(
  title: string,
  salesName: string,
  bodyPlain: string
): string[] {
  const htmlIntro =
    `<b>${escapeHtml(`📋 ${title}`)}</b>\n\n` +
    `👤 <b>Автор звіту:</b>\n` +
    `<b>${escapeHtml(salesName)}</b>\n`;

  const escapedBody = escapeHtml(bodyPlain);
  const sep = "\n\n";
  const full = `${htmlIntro}${sep}${escapedBody}`;

  if (full.length <= TELEGRAM_MAX) {
    return [appendTelegramCrmLinkFooter(full)];
  }

  const headerLen = htmlIntro.length + sep.length;
  const roomFirst = TELEGRAM_MAX - headerLen;
  if (roomFirst < 1) {
    const out: string[] = [htmlIntro];
    for (let i = 0; i < escapedBody.length; i += TELEGRAM_MAX) {
      out.push(escapedBody.slice(i, i + TELEGRAM_MAX));
    }
    return out.map((p) => appendTelegramCrmLinkFooter(p));
  }

  const parts: string[] = [
    `${htmlIntro}${sep}${escapedBody.slice(0, roomFirst)}`,
  ];
  for (let i = roomFirst; i < escapedBody.length; i += TELEGRAM_MAX) {
    parts.push(escapedBody.slice(i, i + TELEGRAM_MAX));
  }
  return parts.map((p) => appendTelegramCrmLinkFooter(p));
}
