"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { summaryService } from "@/services/summary-service";

export function useSummaries() {
  return useQuery({
    queryKey: ["summaries"],
    queryFn: summaryService.getAll,
  });
}

export function useDeleteSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => summaryService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Підсумок видалено");
    },
    onError: () => toast.error("Не вдалося видалити підсумок"),
  });
}
