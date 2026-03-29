"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/user-service";

export function useDevs(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["users", "devs"],
    queryFn: userService.getDevs,
    enabled: options?.enabled ?? true,
  });
}
