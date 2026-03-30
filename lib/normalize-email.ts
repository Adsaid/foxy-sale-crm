/** Єдиний вигляд email для порівняння та збереження при реєстрації / запрошеннях. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
