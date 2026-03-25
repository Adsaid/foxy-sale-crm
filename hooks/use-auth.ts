"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth-service";
import type { AuthUser } from "@/types/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: authService.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

  return { user: data ?? null, isLoading, error, invalidate };
}
