"use client";

import { useState } from "react";

const STORAGE_KEY = "activeTeamId";

export function useActiveTeamId() {
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  const setActiveTeamId = (value: string | null) => {
    setActiveTeamIdState(value);
    if (!value) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  return { activeTeamId, setActiveTeamId };
}
