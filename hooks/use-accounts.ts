"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountService } from "@/services/account-service";
import type { CreateAccountInput, UpdateAccountInput } from "@/types/crm";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: accountService.getAll,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountInput) => accountService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["stats", "accounts"] });
      toast.success("Акаунт створено");
    },
    onError: () => toast.error("Помилка створення акаунту"),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountInput }) =>
      accountService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["stats", "accounts"] });
      toast.success("Акаунт оновлено");
    },
    onError: () => toast.error("Помилка оновлення акаунту"),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["stats", "accounts"] });
      toast.success("Акаунт видалено");
    },
    onError: () => toast.error("Помилка видалення акаунту"),
  });
}
