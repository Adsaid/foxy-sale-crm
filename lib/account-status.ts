import type { AccountStatus } from "@prisma/client";

/** Доки в БД не всі документи мають поле — трактуємо відсутність як APPROVED. */
export function effectiveAccountStatus(user: {
  accountStatus?: AccountStatus | null;
}): AccountStatus {
  return user.accountStatus ?? "APPROVED";
}
