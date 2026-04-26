"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { devDailyCallService } from "@/services/dev-daily-call-service";
import type {
  CreateDevDailyCallInput,
  UpdateDevDailyCallInput,
} from "@/types/crm";

function toastApiError(err: unknown, fallback: string) {
  const msg =
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { data?: { error?: string } } }).response?.data
      ?.error;
  toast.error(typeof msg === "string" && msg.trim() ? msg : fallback);
}

export function useDevDailyCalls() {
  return useQuery({
    queryKey: ["devDailyCalls"],
    queryFn: () => devDailyCallService.getAll(),
  });
}

export function useCreateDevDailyCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDevDailyCallInput) =>
      devDailyCallService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devDailyCalls"] });
      toast.success("Дейлік створено");
    },
    onError: (err) =>
      toastApiError(err, "Помилка створення дейліка"),
  });
}

export function useUpdateDevDailyCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDevDailyCallInput }) =>
      devDailyCallService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devDailyCalls"] });
      toast.success("Дейлік оновлено");
    },
    onError: (err) =>
      toastApiError(err, "Помилка оновлення дейліка"),
  });
}

export function useDeleteDevDailyCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devDailyCallService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devDailyCalls"] });
      toast.success("Дейлік видалено");
    },
    onError: () => toast.error("Помилка видалення дейліка"),
  });
}
