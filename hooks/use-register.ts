"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/services/auth-service";
import type { RegisterInput } from "@/lib/validations/auth";
import type { AuthResponse } from "@/types/auth";

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: (data: AuthResponse) => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Реєстрація успішна!");
      const pending = data.user.pendingApproval ?? ((data.user.accountStatus ?? "APPROVED") === "PENDING");
      router.push(pending ? "/pending-approval" : "/dashboard");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Помилка реєстрації";
      toast.error(message);
    },
  });
}
