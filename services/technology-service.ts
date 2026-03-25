import api from "@/lib/api/client";
import type { Technology } from "@/types/auth";

export const technologyService = {
  async getAll(): Promise<Technology[]> {
    const res = await api.get<Technology[]>("/api/technologies");
    return res.data;
  },
};
