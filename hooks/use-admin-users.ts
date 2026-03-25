"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userService } from "@/services/user-service";
import type { UpdateUserInput } from "@/types/crm";

export function useAdminUsers(role?: string) {
  return useQuery({
    queryKey: ["admin", "users", role],
    queryFn: () => userService.getAdminUsers(role),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Користувача оновлено");
    },
    onError: () => toast.error("Помилка оновлення користувача"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      userService.changePassword(id, password),
    onSuccess: () => toast.success("Пароль змінено"),
    onError: () => toast.error("Помилка зміни пароля"),
  });
}
