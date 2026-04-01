"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/services/auth-service";
import type { LoginInput } from "@/lib/validations/auth";
import type { AuthResponse } from "@/types/auth";

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: (data: AuthResponse) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Успішний вхід!");
      const pending = data.user.pendingApproval ?? ((data.user.accountStatus ?? "APPROVED") === "PENDING");
      router.push(pending ? "/pending-approval" : "/dashboard");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Помилка входу";
      toast.error(message);
    },
  });
}
