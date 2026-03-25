"use client";

import { useQuery } from "@tanstack/react-query";
import { technologyService } from "@/services/technology-service";
import type { Technology } from "@/types/auth";

export function useTechnologies() {
  return useQuery<Technology[]>({
    queryKey: ["technologies"],
    queryFn: technologyService.getAll,
  });
}
