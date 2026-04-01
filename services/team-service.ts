import api from "@/lib/api/client";

export type TeamOption = { id: string; name: string };

export const teamService = {
  async listPublic(): Promise<TeamOption[]> {
    const res = await api.get<{ items: TeamOption[] }>("/api/teams/public");
    return res.data.items;
  },
  async listAccessible(): Promise<TeamOption[]> {
    const res = await api.get<{ items: TeamOption[] }>("/api/teams");
    return res.data.items;
  },
};
