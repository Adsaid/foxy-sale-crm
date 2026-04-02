import type { TeamStatus } from "@prisma/client";

/** Поки не всі документи мають поле status, відсутність трактуємо як APPROVED. */
export function effectiveTeamStatus(team: {
  status?: TeamStatus | null;
} | null | undefined): TeamStatus {
  return team?.status ?? "APPROVED";
}
