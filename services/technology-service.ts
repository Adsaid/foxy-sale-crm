import api from "@/lib/api/client";
import type { Technology } from "@/types/auth";

export const technologyService = {
  async getAll(audience?: "DEV" | "DESIGNER"): Promise<Technology[]> {
    const q = audience ? `?audience=${audience}` : "";
    const res = await api.get<Technology[]>(`/api/technologies${q}`);
    return res.data;
  },
};
