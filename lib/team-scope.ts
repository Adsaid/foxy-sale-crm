import { NextResponse } from "next/server";

export type TeamScopedUser = {
  role: string;
  teamId?: string | null;
  activeTeamId?: string | null;
};

export function resolveTeamId(user: TeamScopedUser): string | null {
  return user.activeTeamId ?? user.teamId ?? null;
}

export function teamGuardResponse(user: TeamScopedUser) {
  const teamId = resolveTeamId(user);
  if (!teamId) {
    return {
      teamId: null,
      error: NextResponse.json({ error: "Оберіть команду" }, { status: 400 }),
    };
  }
  return { teamId, error: null as NextResponse | null };
}
