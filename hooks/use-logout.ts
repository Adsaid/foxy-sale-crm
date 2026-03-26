"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/services/auth-service";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Щоб після логіну іншої ролі (ADMIN/DEV) не відображався старий кеш запитів.
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.push("/login");
    },
    onError: () => {
      toast.error("Помилка при виході");
    },
  });
}
