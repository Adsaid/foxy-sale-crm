"use client";

import { useQuery } from "@tanstack/react-query";
import { technologyService } from "@/services/technology-service";
import type { Technology } from "@/types/auth";

export function useTechnologies(
  audience?: "DEV" | "DESIGNER",
  options?: { enabled?: boolean },
) {
  return useQuery<Technology[]>({
    queryKey: ["technologies", audience ?? "all"],
    queryFn: () => technologyService.getAll(audience),
    enabled: options?.enabled ?? true,
  });
}
