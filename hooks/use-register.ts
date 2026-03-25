"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/services/auth-service";
import type { RegisterInput } from "@/lib/validations/auth";

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Реєстрація успішна!");
      router.push("/dashboard");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Помилка реєстрації";
      toast.error(message);
    },
  });
}
