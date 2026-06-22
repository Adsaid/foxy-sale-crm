"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";

export type AppChartTheme = "light" | "dark";

export function resolveChartTheme(resolvedTheme: string | undefined): AppChartTheme {
  return resolvedTheme === "dark" ? "dark" : "light";
}

export function useResolvedChartTheme(): AppChartTheme {
  const { resolvedTheme } = useTheme();
  return resolveChartTheme(resolvedTheme);
}

const CALL_STATS_LINE = {
  light: { total: "#eab308", success: "#22c55e", unsuccessful: "#ef4444" },
  dark: { total: "#facc15", success: "#4ade80", unsuccessful: "#f87171" },
} as const;

const CALL_STATS_PIE = {
  light: {
    success: "#22c55e",
    unsuccessful: "#ef4444",
    pending: "#eab308",
    cancelled: "#64748b",
  },
  dark: {
    success: "#4ade80",
    unsuccessful: "#f87171",
    pending: "#facc15",
    cancelled: "#94a3b8",
  },
} as const;

const ACCOUNT_LINE = {
  light: { total: "#eab308", upwork: "#0ea5e9", linkedin: "#6366f1" },
  dark: { total: "#facc15", upwork: "#38bdf8", linkedin: "#818cf8" },
} as const;

const ACCOUNT_STATUS_PIE = {
  light: {
    active: "#22c55e",
    paused: "#f97316",
    setup: "#8b5cf6",
    warming: "#f43f5e",
    limited: "#64748b",
    noStatus: "#94a3b8",
  },
  dark: {
    active: "#4ade80",
    paused: "#fb923c",
    setup: "#a78bfa",
    warming: "#fb7185",
    limited: "#94a3b8",
    noStatus: "#cbd5e1",
  },
} as const;

const SALES_FALLBACK_LIGHT = [
  "#2563eb",
  "#16a34a",
  "#c026d3",
  "#ea580c",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#be123c",
  "#0d9488",
  "#9333ea",
  "#b45309",
  "#1d4ed8",
] as const;

const SALES_FALLBACK_DARK = [
  "#60a5fa",
  "#4ade80",
  "#e879f9",
  "#fb923c",
  "#22d3ee",
  "#facc15",
  "#818cf8",
  "#fb7185",
  "#2dd4bf",
  "#c084fc",
  "#fbbf24",
  "#93c5fd",
] as const;

export function getCallStatsLineColors(theme: AppChartTheme) {
  return CALL_STATS_LINE[theme];
}

export function getCallStatsPieColors(theme: AppChartTheme) {
  return CALL_STATS_PIE[theme];
}

export function getAccountLineColors(theme: AppChartTheme) {
  return ACCOUNT_LINE[theme];
}

export function getAccountStatusPieColors(theme: AppChartTheme) {
  return ACCOUNT_STATUS_PIE[theme];
}

export function getSalesFallbackPalette(theme: AppChartTheme): readonly string[] {
  return theme === "dark" ? SALES_FALLBACK_DARK : SALES_FALLBACK_LIGHT;
}

export function getDailyEventBackground(theme: AppChartTheme): string {
  return theme === "dark" ? "#34d399" : "#059669";
}

/** Slightly lift saturation/brightness of hex colors on dark backgrounds. */
export function adjustEventColorForTheme(color: string, theme: AppChartTheme): string {
  if (theme === "light") return color;
  const trimmed = color.trim();
  if (!trimmed.startsWith("#")) return color;

  const hex = trimmed.slice(1);
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.length === 6
        ? hex
        : null;
  if (!normalized) return color;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return color;

  const mix = (channel: number) =>
    Math.min(255, Math.round(channel + (255 - channel) * 0.22));

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function useCallStatsChartPalettes() {
  const theme = useResolvedChartTheme();
  return useMemo(
    () => ({
      theme,
      line: getCallStatsLineColors(theme),
      pie: getCallStatsPieColors(theme),
    }),
    [theme],
  );
}

export function useAccountChartPalettes() {
  const theme = useResolvedChartTheme();
  return useMemo(
    () => ({
      theme,
      line: getAccountLineColors(theme),
      statusPie: getAccountStatusPieColors(theme),
    }),
    [theme],
  );
}
