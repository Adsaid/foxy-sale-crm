import api from "@/lib/api/client";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";
import type { AuthUser, AuthResponse } from "@/types/auth";

export const authService = {
  async login(data: LoginInput): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/auth/login", data);
    return res.data;
  },

  async register(data: RegisterInput): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/auth/register", data);
    return res.data;
  },

  async logout(): Promise<void> {
    await api.post("/api/auth/logout");
  },

  async getMe(): Promise<AuthUser | null> {
    try {
      const res = await api.get<{ user: AuthUser }>("/api/auth/me");
      return res.data.user;
    } catch {
      return null;
    }
  },
};
