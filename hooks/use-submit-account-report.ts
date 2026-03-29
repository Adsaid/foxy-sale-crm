"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountReportService } from "@/services/account-report-service";

export function useSubmitAccountReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => accountReportService.submit().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["account-reports"] });
      toast.success("Звіт надіслано адмінам");
    },
    onError: (err: unknown) => {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "error" in err.response.data
          ? String((err.response.data as { error: unknown }).error)
          : "Не вдалося надіслати звіт";
      toast.error(msg);
    },
  });
}
