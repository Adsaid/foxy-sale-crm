"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userService } from "@/services/user-service";
import type { UpdateUserInput } from "@/types/crm";

export function useAdminUsers(role?: string, enabled = true) {
  return useQuery({
    queryKey: ["admin", "users", role],
    queryFn: () => userService.getAdminUsers(role),
    enabled,
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

export function useAdminInvitations() {
  return useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: () => userService.getInvitations(),
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; role: "SALES" | "DEV" | "DESIGNER" }) =>
      userService.createInvitation(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
      toast.success("Запрошення створено");
    },
    onError: () => toast.error("Не вдалося створити запрошення"),
  });
}

export function useDeleteInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.deleteInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
      toast.success("Запрошення видалено");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Не вдалося видалити запрошення";
      toast.error(message);
    },
  });
}

export function usePendingUsers() {
  return useQuery({
    queryKey: ["admin", "pending-users"],
    queryFn: () => userService.getPendingUsers(),
  });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.approveUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pending-users"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Доступ надано");
    },
    onError: () => toast.error("Не вдалося підтвердити"),
  });
}

export function usePendingTeams(enabled = true) {
  return useQuery({
    queryKey: ["super-admin", "pending-teams"],
    queryFn: () => userService.getPendingTeams(),
    enabled,
  });
}

export function useApproveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.approveTeam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admin", "pending-teams"] });
      toast.success("Команду підтверджено");
    },
    onError: () => toast.error("Не вдалося підтвердити команду"),
  });
}
