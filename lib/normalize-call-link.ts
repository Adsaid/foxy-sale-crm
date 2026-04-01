/**
 * Нормалізує посилання на дзвінок перед збереженням: порожній рядок → null;
 * якщо немає схеми (http/https тощо) — додає https://
 * (наприклад meet.google.com/xxx → https://meet.google.com/xxx).
 */
export function normalizeCallLinkForSave(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (/^[a-z][\w+.-]*:/i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

/** Додає https:// до URL без протоколу (для відображення / href старих даних). */
export function ensureUrlProtocol(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^[a-z][\w+.-]*:/i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}
