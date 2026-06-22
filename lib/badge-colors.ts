import type { AppChartTheme } from "@/lib/chart-theme";
import { adjustEventColorForTheme } from "@/lib/chart-theme";

function parseHex(hex: string): [number, number, number] | null {
  const trimmed = hex.trim();
  if (!trimmed.startsWith("#")) return null;
  const raw = trimmed.slice(1);
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.length === 6
        ? raw
        : null;
  if (!normalized) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return [r, g, b];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function mixHex(a: string, b: string, weightB: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;
  const w = Math.min(1, Math.max(0, weightB));
  const mix = (i: 0 | 1 | 2) => Math.round(ca[i] * (1 - w) + cb[i] * w);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(0))}${toHex(mix(1))}${toHex(mix(2))}`;
}

const DEFAULT_LIGHT_BG = "#EEF2FF";
const DEFAULT_LIGHT_TEXT = "#3730A3";
const DEFAULT_DARK_BG = "#312e81";
const DEFAULT_DARK_TEXT = "#e0e7ff";

export function resolveSalesBadgeColors(
  badgeBgColor: string | null | undefined,
  badgeTextColor: string | null | undefined,
  theme: AppChartTheme,
): { background: string; text: string } {
  const bg = badgeBgColor?.trim() || (theme === "dark" ? DEFAULT_DARK_BG : DEFAULT_LIGHT_BG);
  const text = badgeTextColor?.trim() || (theme === "dark" ? DEFAULT_DARK_TEXT : DEFAULT_LIGHT_TEXT);

  if (theme === "light") {
    return { background: bg, text };
  }

  const adjustedBg = adjustEventColorForTheme(bg, "dark");
  const bgRgb = parseHex(adjustedBg);
  if (!bgRgb) {
    return { background: adjustedBg, text };
  }

  const lum = relativeLuminance(...bgRgb);
  const adjustedText =
    lum > 0.35 ? mixHex(text, "#f8fafc", 0.55) : mixHex(text, "#ffffff", 0.15);

  return {
    background: mixHex(adjustedBg, "#0f172a", 0.35),
    text: adjustedText,
  };
}

export function salesBadgeCardBackground(
  background: string,
  theme: AppChartTheme,
  opacity = 0.4,
): string {
  if (theme === "light") {
    const rgb = parseHex(background);
    if (!rgb) return background;
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
  }
  const rgb = parseHex(background);
  if (!rgb) return background;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Math.min(0.55, opacity + 0.1)})`;
}
