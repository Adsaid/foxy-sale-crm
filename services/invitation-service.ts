import api from "@/lib/api/client";

/** Публічна перевірка коду (без авторизації). */
export const invitationPublicService = {
  async validate(code: string): Promise<{
    email: string;
    role: "SALES" | "DEV" | "DESIGNER";
    teamId: string | null;
    teamName: string | null;
  }> {
    const res = await api.get<{
      email: string;
      role: "SALES" | "DEV" | "DESIGNER";
      teamId: string | null;
      teamName: string | null;
    }>(
      "/api/invitations/validate",
      { params: { code } },
    );
    return res.data;
  },
};
