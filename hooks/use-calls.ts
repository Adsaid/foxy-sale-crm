"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { callService } from "@/services/call-service";
import type { CreateCallInput, UpdateCallInput, CompleteCallInput, AdvanceCallStageInput } from "@/types/crm";

function toastApiError(err: unknown, fallback: string) {
  const msg =
    err &&
    typeof err === "object" &&
    "response" in err &&
    (err as { response?: { data?: { error?: string } } }).response?.data?.error;
  toast.error(typeof msg === "string" && msg.trim() ? msg : fallback);
}

export function useCalls() {
  return useQuery({
    queryKey: ["calls"],
    queryFn: () => callService.getAll(),
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
    onError: (err) => toastApiError(err, "Помилка створення дзвінка"),
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
      qc.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Дзвінок оновлено");
    },
    onError: (err) => toastApiError(err, "Помилка оновлення дзвінка"),
  });
}

export function useAdvanceCallStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdvanceCallStageInput }) =>
      callService.advanceToNextStage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Створено дзвінок наступного етапу");
    },
    onError: (err) => toastApiError(err, "Помилка переходу на наступний етап"),
  });
}

export function useDeleteCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Дзвінок видалено");
    },
    onError: () => toast.error("Помилка видалення дзвінка"),
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
      qc.invalidateQueries({ queryKey: ["summaries"] });
    },
    onError: (err: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error ?? "Помилка завершення дзвінка");
    },
  });
}
