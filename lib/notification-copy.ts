/**
 * Дієслова минулого часу з маркером в(ла) — без поля статі в профілі
 * (сейл / дев / адмін).
 */
export const notifVerbPast = {
  assignedCall: "призначив(ла)",
  movedCall: "переніс(ла)",
  cancelledCall: "скасував(ла)",
  updatedCallLink: "оновив(ла)",
  completedCall: "завершив(ла)",
  transferredAccount: "передав(ла)",
  updatedYourAccount: "оновив(ла)",
  sentAccountsReport: "надіслав(ла)",
} as const;

/** Дати/час для текстів сповіщень (укр. локаль). */
export function formatNotificationDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Короткі підписи типу дзвінка для повідомлень. */
export function callTypeLabelUk(type: string): string {
  const map: Record<string, string> = {
    HR: "HR",
    TECH: "Технічний",
    CLIENT: "Клієнт",
    PM: "PM",
    CLIENT_TECH: "Клієнт + тех",
  };
  return map[type] ?? type;
}

/** Тип акаунта для текстів. */
export function accountTypeLabelUk(type: string): string {
  return type === "UPWORK" ? "Upwork" : type === "LINKEDIN" ? "LinkedIn" : type;
}
