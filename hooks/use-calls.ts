"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callService } from "@/services/call-service";
import type { CreateCallInput, UpdateCallInput, CompleteCallInput } from "@/types/crm";

export function useCalls() {
  return useQuery({
    queryKey: ["calls"],
    queryFn: callService.getAll,
  });
}

export function useCreateCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCallInput) => callService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Дзвінок створено");
    },
    onError: () => toast.error("Помилка створення дзвінка"),
  });
}

export function useUpdateCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCallInput }) =>
      callService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Дзвінок оновлено");
    },
    onError: () => toast.error("Помилка оновлення дзвінка"),
  });
}

export function useCompleteCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CompleteCallInput }) =>
      callService.complete(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Дзвінок завершено");
    },
    onError: (err: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error ?? "Помилка завершення дзвінка");
    },
  });
}
