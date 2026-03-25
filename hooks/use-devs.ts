"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/user-service";

export function useDevs() {
  return useQuery({
    queryKey: ["users", "devs"],
    queryFn: userService.getDevs,
  });
}
