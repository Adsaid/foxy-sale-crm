"use client";

import { useMemo, useState } from "react";
import { uk } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CalendarRange,
  ChartPie,
  ChevronsUpDown,
  ClipboardCheck,
  Clock,
  Phone,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallStats, useCallStatsTimeseries } from "@/hooks/use-stats";
import { useAuth } from "@/hooks/use-auth";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useDevs } from "@/hooks/use-devs";
import {
  CRM_TIMEZONE,
  formatComparePeriodTooltipKyiv,
  formatStatsPeriodShortKyiv,
  isSameKyivCalendarDay,
} from "@/lib/date-kyiv";
import {
  callStatsComparisonRangeFromPreset,
  callStatsRangeFromPreset,
  type CallStatsPreset,
} from "@/lib/call-stats-range";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AssigneeOptionContent } from "@/components/ui/assignee-option-content";
import type {
  CallStatsData,
  CallStatsQueryParams,
  CallStatsTimeseriesPoint,
} from "@/types/crm";

const SALES_ALL = "all";
const DEV_ALL = "all";

const PRESET_OPTIONS: { value: CallStatsPreset; label: string }[] = [
  { value: "all", label: "Увесь час" },
  { value: "today", label: "Сьогодні" },
  { value: "this_week", label: "Поточний тиждень" },
  { value: "last_week", label: "Минулий тиждень" },
  { value: "this_month", label: "Поточний місяць" },
  { value: "last_month", label: "Минулий місяць" },
  { value: "custom", label: "Свій період" },
];

type CallStatCardVariant =
  | "total"
  | "completed"
  | "success"
  | "unsuccessful"
  | "pending"
  | "cancelled";

type CallStatDelta = {
  text: string;
  sentiment: "positive" | "negative";
  direction: "up" | "down";
};

function buildCallStatDelta(
  variant: CallStatCardVariant,
  current: number,
  previous: number
): CallStatDelta | null {
  if (previous === 0) return null;
  const raw = current - previous;
  if (raw === 0) return null;
  const pct = Math.round((raw / previous) * 1000) / 10;
  if (pct === 0) return null;
  const sign = pct > 0 ? "+" : "";
  const text = `${sign}${pct}%`;
  const direction: CallStatDelta["direction"] = raw > 0 ? "up" : "down";
  const isNegativeMetric = variant === "unsuccessful" || variant === "cancelled";
  const sentiment: CallStatDelta["sentiment"] =
    raw > 0 ? (isNegativeMetric ? "negative" : "positive") : isNegativeMetric ? "positive" : "negative";
  return { text, sentiment, direction };
}

function callStatDeltaToneClass(sentiment: CallStatDelta["sentiment"]) {
  return sentiment === "positive"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

const CALL_STATS_CARD_VARIANT_STYLES: Record<
  CallStatCardVariant,
  { icon: LucideIcon; iconWrap: string; iconHover: string }
> = {
  total: {
    icon: Phone,
    iconWrap:
      "bg-amber-500/12 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-amber-500/22 dark:group-hover:bg-amber-500/18",
  },
  completed: {
    icon: ClipboardCheck,
    iconWrap:
      "bg-indigo-500/12 text-indigo-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-indigo-500/10 dark:text-indigo-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-indigo-500/22 dark:group-hover:bg-indigo-500/18",
  },
  success: {
    icon: TrendingUp,
    iconWrap:
      "bg-emerald-500/12 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-emerald-500/22 dark:group-hover:bg-emerald-500/18",
  },
  unsuccessful: {
    icon: TrendingDown,
    iconWrap:
      "bg-red-500/12 text-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-red-500/10 dark:text-red-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-red-500/22 dark:group-hover:bg-red-500/18",
  },
  pending: {
    icon: Clock,
    iconWrap:
      "bg-amber-400/15 text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-amber-400/12 dark:text-amber-200 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-amber-400/28 dark:group-hover:bg-amber-400/18",
  },
  cancelled: {
    icon: Ban,
    iconWrap:
      "bg-slate-500/12 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-slate-500/14 dark:text-slate-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-slate-500/22 dark:group-hover:bg-slate-500/20",
  },
};

const CALL_STATS_CARD_CONFIG = [
  { label: "Всього дзвінків", variant: "total" as const },
  { label: "Завершені", variant: "completed" as const },
  { label: "Успішні", variant: "success" as const },
  { label: "Неуспішні", variant: "unsuccessful" as const },
  { label: "Очікують", variant: "pending" as const },
  { label: "Скасовані", variant: "cancelled" as const },
] as const;

function StatCardCompact({
  label,
  value,
  variant,
  delta,
  deltaTooltip,
}: {
  label: string;
  value: string | number;
  variant: CallStatCardVariant;
  delta?: CallStatDelta | null;
  /** Показується в тултіпі при наведенні на дельту (період порівняння). */
  deltaTooltip?: string | null;
}) {
  const s = CALL_STATS_CARD_VARIANT_STYLES[variant];
  const Icon = s.icon;
  const deltaBlock =
    delta ? (
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5",
          callStatDeltaToneClass(delta.sentiment)
        )}
      >
        {delta.direction === "up" ? (
          <ArrowUp className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
        ) : (
          <ArrowDown className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
        )}
        <span className="text-sm font-bold tabular-nums leading-none tracking-tight">{delta.text}</span>
      </div>
    ) : null;
  return (
    <div
      className={cn(
        "group relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/45",
        "bg-gradient-to-b from-card via-card to-muted/35 dark:to-muted/10",
        "shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]",
        "dark:border-border/35 dark:shadow-[0_2px_14px_-2px_rgba(0,0,0,0.5)]",
        "transition-[box-shadow,border-color,background-color] duration-200 ease-out",
        "hover:border-border/75 hover:bg-muted/20",
        "hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.12),0_4px_14px_-4px_rgba(15,23,42,0.07)]",
        "dark:hover:border-border/55 dark:hover:bg-muted/10",
        "dark:hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.52)]"
      )}
    >
      <div className="relative flex flex-1 flex-col bg-gradient-to-b from-muted/30 to-transparent px-3 pb-3 pt-2.5 dark:from-muted/15">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,255,255,0.5),transparent_58%)] opacity-40 dark:opacity-0" />
        <div className="relative z-10 flex items-start gap-2.5">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl transition-[background-color,box-shadow] duration-200 ease-out",
              s.iconWrap,
              s.iconHover
            )}
            aria-hidden
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase leading-snug tracking-[0.14em] text-muted-foreground">
              {label}
            </p>
            <div className="mt-1.5 flex min-w-0 items-baseline justify-between gap-1.5">
              <p className="min-w-0 font-sans text-[1.375rem] font-semibold leading-none tabular-nums tracking-tight text-foreground sm:text-[1.5rem]">
                {value}
              </p>
              {delta ? (
                deltaTooltip ? (
                  <UiTooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={0}
                        className={cn(
                          "shrink-0 cursor-help rounded-md border-0 bg-transparent p-0 outline-none ring-offset-background",
                          "focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2"
                        )}
                        aria-label={deltaTooltip}
                      >
                        {deltaBlock}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={6}
                      className="max-w-[min(100vw-2rem,18rem)] text-left"
                    >
                      {deltaTooltip}
                    </TooltipContent>
                  </UiTooltip>
                ) : (
                  deltaBlock
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallStatsCardsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {CALL_STATS_CARD_CONFIG.map(({ label, variant }) => {
        return (
          <div
            key={label}
            className={cn(
              "flex max-w-full min-w-[min(100%,200px)] flex-[1_1_200px] flex-col overflow-hidden rounded-xl border border-border/45",
              "bg-gradient-to-b from-card via-card to-muted/35 dark:to-muted/10",
              "shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)] dark:border-border/35 dark:shadow-[0_2px_14px_-2px_rgba(0,0,0,0.5)]"
            )}
          >
            <div className="relative bg-gradient-to-b from-muted/30 to-transparent px-3 pb-3 pt-2.5 dark:from-muted/15">
              <div className="flex items-start gap-2.5">
                <Skeleton className="size-9 shrink-0 rounded-xl" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-semibold uppercase leading-snug tracking-[0.14em] text-muted-foreground">
                    {label}
                  </p>
                  <Skeleton className="mt-1.5 h-8 w-12 max-w-full rounded-md" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Кольори серій графіка: усі — жовтий, успішні — зелені, неуспішні — червоні. */
const CALL_STATS_COLORS = {
  total: "#eab308",
  success: "#22c55e",
  unsuccessful: "#ef4444",
} as const;

const CALL_STATS_CHART_CONFIG = {
  total: { label: "Усі дзвінки", color: CALL_STATS_COLORS.total },
  success: { label: "Успішні", color: CALL_STATS_COLORS.success },
  unsuccessful: { label: "Неуспішні", color: CALL_STATS_COLORS.unsuccessful },
} satisfies ChartConfig;

type SeriesKey = keyof typeof CALL_STATS_COLORS;

const GRADIENT_IDS: Record<SeriesKey, string> = {
  total: "callStatsFillTotal",
  success: "callStatsFillSuccess",
  unsuccessful: "callStatsFillUnsuccessful",
};

/** Ті самі підписи серій, що й на лінійному графіку (легенда / перемикачі). */
const SERIES_META: { key: SeriesKey; label: string }[] = [
  { key: "total", label: "Усі дзвінки" },
  { key: "success", label: "Успішні" },
  { key: "unsuccessful", label: "Неуспішні" },
];

/** Кольори сегментів pie за результатами: успіх, неуспіх, очікує, скасовано. */
const CALL_STATS_PIE_COLORS = {
  success: "#22c55e",
  unsuccessful: "#ef4444",
  pending: "#eab308",
  cancelled: "#64748b",
} as const;

/** Slug-ключі для ChartStyle / tooltip; підписи — лише в `label`. */
const CALL_STATS_PIE_CONFIG = {
  success: { label: "Успішні", color: CALL_STATS_PIE_COLORS.success },
  unsuccessful: { label: "Неуспішні", color: CALL_STATS_PIE_COLORS.unsuccessful },
  pending: { label: "Очікують", color: CALL_STATS_PIE_COLORS.pending },
  cancelled: { label: "Скасовані", color: CALL_STATS_PIE_COLORS.cancelled },
} satisfies ChartConfig;

/** Легенда під pie: сегменти діаграми (не серії лінійного графіка). */
const PIE_LEGEND_META: { key: string; label: string; fill: string }[] = [
  { key: "unsuccessful", label: "Неуспішні", fill: CALL_STATS_PIE_COLORS.unsuccessful },
  { key: "success", label: "Успішні", fill: CALL_STATS_PIE_COLORS.success },
  { key: "pending", label: "Очікують", fill: CALL_STATS_PIE_COLORS.pending },
  { key: "cancelled", label: "Скасовані", fill: CALL_STATS_PIE_COLORS.cancelled },
];

function callStatsPieRows(stats: CallStatsData) {
  return [
    {
      key: "success",
      name: "success",
      value: stats.successCalls,
      fill: CALL_STATS_PIE_COLORS.success,
    },
    {
      key: "unsuccessful",
      name: "unsuccessful",
      value: stats.unsuccessfulCalls,
      fill: CALL_STATS_PIE_COLORS.unsuccessful,
    },
    {
      key: "pending",
      name: "pending",
      value: stats.pendingCalls,
      fill: CALL_STATS_PIE_COLORS.pending,
    },
    {
      key: "cancelled",
      name: "cancelled",
      value: stats.cancelledCalls,
      fill: CALL_STATS_PIE_COLORS.cancelled,
    },
  ];
}

function CallStatsDistributionPie({ stats }: { stats: CallStatsData }) {
  const pieData = useMemo(() => {
    const rows = callStatsPieRows(stats);
    return rows.filter((r) => r.value > 0).map((r) => ({ ...r }));
  }, [stats]);

  const pieSizeClass = "h-[min(100vw-2rem,320px)] w-[min(100vw-2rem,320px)]";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:p-3">
          {stats.totalCalls === 0 ? (
            <div
              className="mx-auto flex min-h-[min(100vw-2rem,240px)] w-full max-w-[320px] flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:min-h-[280px]"
              aria-label="Немає дзвінків за період"
            >
              <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-destructive/45 bg-destructive/15 shadow-sm dark:border-destructive/50 dark:bg-destructive/25">
                <ChartPie className="size-8 text-destructive" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Немає дзвінків</p>
                <p className="text-xs leading-relaxed text-muted-foreground/85">
                  За обраний період немає даних для відображення розподілу
                </p>
              </div>
            </div>
          ) : (
            <ChartContainer
              config={CALL_STATS_PIE_CONFIG}
              className={cn(
                "mx-auto aspect-square max-w-full [&_.recharts-pie-label-line]:hidden",
                pieSizeClass
              )}
            >
              <PieChart>
                <defs>
                  <filter id="callStatsPieRingShadow" x="-35%" y="-35%" width="170%" height="170%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.22" />
                  </filter>
                </defs>
                <RechartsTooltip cursor={false} content={<ChartTooltipContent />} />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="74%"
                  paddingAngle={pieData.length > 1 ? 2.5 : 0}
                  strokeWidth={0}
                  style={{ filter: "url(#callStatsPieRingShadow)" }}
                >
                  {pieData.map((d) => (
                    <Cell
                      key={d.key}
                      fill={d.fill}
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                      style={{ filter: "drop-shadow(0 2px 4px rgba(15,23,42,0.16))" }}
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const { cx, cy } = viewBox;
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan className="fill-foreground text-3xl font-bold tabular-nums">
                              {stats.totalCalls}
                            </tspan>
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </div>
      </div>
      <div
        className="mt-4 flex w-full shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-2.5"
        role="group"
        aria-label="Сегменти кругової діаграми"
      >
        {PIE_LEGEND_META.map(({ key, label, fill }) => (
          <div
            key={key}
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
          >
            <span
              className="h-0.5 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: fill }}
              aria-hidden
            />
            <span className="leading-none">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CallStatsAreaGradients() {
  return (
    <defs>
      {(Object.keys(CALL_STATS_COLORS) as SeriesKey[]).map((key) => {
        const c = CALL_STATS_COLORS[key];
        const gid = GRADIENT_IDS[key];
        return (
          <linearGradient key={gid} id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity={0.38} />
            <stop offset="50%" stopColor={c} stopOpacity={0.1} />
            <stop offset="100%" stopColor={c} stopOpacity={0} />
          </linearGradient>
        );
      })}
    </defs>
  );
}

/** Картка «Динаміка дзвінків» + підзаголовок — у стані завантаження. */
function CallStatsDynamicsCardSkeleton() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/40 bg-muted/25 px-4 py-3">
        <Skeleton className="h-4 w-40" aria-hidden />
        <Skeleton className="mt-1.5 h-3 w-[min(100%,18rem)] max-w-sm" aria-hidden />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:p-3">
          <Skeleton
            className="aspect-auto h-full min-h-[260px] w-full rounded-lg sm:min-h-[300px]"
            aria-hidden
          />
        </div>
        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-2.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-[5.5rem] rounded-full" aria-hidden />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Картка «Розподіл дзвінків» + підзаголовок — у стані завантаження. */
function CallStatsPieCardSkeleton() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/40 bg-muted/25 px-4 py-3">
        <Skeleton className="h-4 w-36" aria-hidden />
        <Skeleton className="mt-1.5 h-3 w-52 max-w-[min(100%,13rem)]" aria-hidden />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:p-3">
          <Skeleton
            className="aspect-square h-[min(100vw-2rem,280px)] w-[min(100vw-2rem,280px)] max-w-full shrink-0 rounded-full"
            aria-hidden
          />
        </div>
        <div className="mt-4 flex w-full shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-2.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-[4.75rem] rounded-full" aria-hidden />
          ))}
        </div>
      </div>
    </div>
  );
}

function CallStatsAreaChart({
  points,
  subtitle,
}: {
  points: CallStatsTimeseriesPoint[];
  subtitle: string;
}) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    total: true,
    success: true,
    unsuccessful: true,
  });

  const data = useMemo(
    () =>
      points.map((p) => ({
        name: p.label,
        total: p.total,
        success: p.success,
        unsuccessful: p.unsuccessful,
      })),
    [points]
  );

  function toggleSeries(key: SeriesKey, checked: boolean) {
    setVisible((v) => ({ ...v, [key]: checked }));
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/40 bg-muted/25 px-4 py-3">
        <h3 className="text-sm font-semibold leading-none tracking-tight">Динаміка дзвінків</h3>
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:p-3">
          <ChartContainer
            config={CALL_STATS_CHART_CONFIG}
            className="aspect-auto h-full min-h-[260px] w-full sm:min-h-[300px]"
          >
            <AreaChart data={data} margin={{ left: 4, right: 6, top: 10, bottom: 4 }}>
              <CallStatsAreaGradients />
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="6 6"
                className="[&_line]:opacity-40 dark:[&_line]:opacity-30"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                interval="preserveStartEnd"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                className="text-[10px] sm:text-[11px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={40}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                className="text-[10px] sm:text-[11px]"
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={<ChartTooltipContent indicator="line" />}
              />
              {visible.total && (
                <Area
                  type="monotone"
                  dataKey="total"
                  name="total"
                  stroke={CALL_STATS_COLORS.total}
                  fill={`url(#${GRADIENT_IDS.total})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.success && (
                <Area
                  type="monotone"
                  dataKey="success"
                  name="success"
                  stroke={CALL_STATS_COLORS.success}
                  fill={`url(#${GRADIENT_IDS.success})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.unsuccessful && (
                <Area
                  type="monotone"
                  dataKey="unsuccessful"
                  name="unsuccessful"
                  stroke={CALL_STATS_COLORS.unsuccessful}
                  fill={`url(#${GRADIENT_IDS.unsuccessful})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
            </AreaChart>
          </ChartContainer>
        </div>
        <div
          className="mt-4 flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-2.5"
          role="group"
          aria-label="Серії на графіку"
        >
          {SERIES_META.map(({ key, label }) => {
            const on = visible[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleSeries(key, !on)}
                aria-pressed={on}
                title="Натисніть, щоб показати або приховати серію на графіку"
                aria-label={on ? `${label} — приховати` : `${label} — показати`}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-[color,box-shadow,background-color,border-color,transform]",
                  "hover:shadow-sm active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  on
                    ? "border-border/80 bg-background/90 text-foreground shadow-sm"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                <span
                  className="h-0.5 w-4 shrink-0 rounded-full"
                  style={{
                    backgroundColor: CALL_STATS_COLORS[key],
                    opacity: on ? 1 : 0.35,
                  }}
                  aria-hidden
                />
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function customRangeButtonLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Оберіть період";
  const end = range.to ?? range.from;
  return `${formatStatsPeriodShortKyiv(range.from)} — ${formatStatsPeriodShortKyiv(end)}`;
}

function CallStatsCardsCompact({
  stats,
  compareStats,
  showCompareDelta,
  compareDeltaTooltip,
}: {
  stats: CallStatsData;
  compareStats: CallStatsData | null | undefined;
  showCompareDelta: boolean;
  /** Період, з яким порівнюється поточний (для тултіпа на дельті). */
  compareDeltaTooltip?: string | null;
}) {
  const values: Record<CallStatCardVariant, number> = {
    total: stats.totalCalls,
    completed: stats.completedCalls,
    success: stats.successCalls,
    unsuccessful: stats.unsuccessfulCalls,
    pending: stats.pendingCalls,
    cancelled: stats.cancelledCalls,
  };
  const prevValues: Record<CallStatCardVariant, number> | null =
    showCompareDelta && compareStats
      ? {
          total: compareStats.totalCalls,
          completed: compareStats.completedCalls,
          success: compareStats.successCalls,
          unsuccessful: compareStats.unsuccessfulCalls,
          pending: compareStats.pendingCalls,
          cancelled: compareStats.cancelledCalls,
        }
      : null;
  return (
    <div className="flex flex-wrap gap-2.5">
      {CALL_STATS_CARD_CONFIG.map(({ label, variant }) => {
        const delta =
          prevValues !== null
            ? buildCallStatDelta(variant, values[variant], prevValues[variant])
            : null;
        return (
          <div
            key={label}
            className="max-w-full min-w-[min(100%,200px)] flex-[1_1_200px]"
          >
            <StatCardCompact
              label={label}
              value={values[variant]}
              variant={variant}
              delta={delta}
              deltaTooltip={delta ? compareDeltaTooltip : null}
            />
          </div>
        );
      })}
    </div>
  );
}

interface CallStatsCallsPanelProps {
  isAdmin: boolean;
  /** Для адміна: не робити запит, коли активна інша вкладка дашборду. */
  fetchEnabled?: boolean;
}

export function CallStatsCallsPanel({
  isAdmin,
  fetchEnabled = true,
}: CallStatsCallsPanelProps) {
  const { user } = useAuth();
  const isSales = user?.role === "SALES";
  /** Фільтр по виконавцю — для адміна та сейла (не для ролей розробник/дизайнер на сторінці статистики). */
  const showDevFilter = isAdmin || isSales;

  const { data: salesUsers } = useAdminUsers("SALES", isAdmin);
  const { data: devs, isLoading: devsLoading } = useDevs({ enabled: showDevFilter });
  const [preset, setPreset] = useState<CallStatsPreset>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customOpen, setCustomOpen] = useState(false);
  const [salesFilter, setSalesFilter] = useState<string>(SALES_ALL);
  const [salesFilterOpen, setSalesFilterOpen] = useState(false);
  const [devFilter, setDevFilter] = useState<string>(DEV_ALL);
  const [devFilterOpen, setDevFilterOpen] = useState(false);

  const sortedSalesUsers = useMemo(() => {
    if (!salesUsers?.length) return [];
    return [...salesUsers].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "uk")
    );
  }, [salesUsers]);

  const selectedSalesUser =
    salesFilter === SALES_ALL ? null : sortedSalesUsers.find((u) => u.id === salesFilter);

  const sortedDevs = useMemo(() => {
    if (!devs?.length) return [];
    return [...devs].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "uk")
    );
  }, [devs]);

  const selectedDev =
    devFilter === DEV_ALL ? null : sortedDevs.find((d) => d.id === devFilter);

  const apiFilters = useMemo((): CallStatsQueryParams | null => {
    if (preset === "custom" && (!customRange?.from || !customRange?.to)) {
      return null;
    }
    const rangeIso = callStatsRangeFromPreset(
      preset,
      new Date(),
      preset === "custom" && customRange?.from && customRange?.to
        ? { from: customRange.from, to: customRange.to }
        : null
    );
    const out: CallStatsQueryParams = {};
    if (rangeIso.from && rangeIso.to) {
      out.from = rangeIso.from;
      out.to = rangeIso.to;
    }
    if (isAdmin && salesFilter !== SALES_ALL) {
      out.salesId = salesFilter;
    }
    if (showDevFilter && devFilter !== DEV_ALL) {
      out.callerId = devFilter;
    }
    out.timeZone = CRM_TIMEZONE;
    if (preset === "today") {
      out.granularity = "hour";
    } else if (
      preset === "custom" &&
      customRange?.from &&
      customRange?.to &&
      isSameKyivCalendarDay(customRange.from, customRange.to)
    ) {
      out.granularity = "hour";
    }
    return out;
  }, [preset, customRange, isAdmin, showDevFilter, salesFilter, devFilter]);

  const compareApiFilters = useMemo((): CallStatsQueryParams | null => {
    if (preset === "all" || preset === "custom") return null;
    const cmp = callStatsComparisonRangeFromPreset(preset, new Date());
    if (!cmp?.from || !cmp?.to) return null;
    const out: CallStatsQueryParams = {
      from: cmp.from,
      to: cmp.to,
      timeZone: CRM_TIMEZONE,
    };
    if (isAdmin && salesFilter !== SALES_ALL) {
      out.salesId = salesFilter;
    }
    if (showDevFilter && devFilter !== DEV_ALL) {
      out.callerId = devFilter;
    }
    if (preset === "today") {
      out.granularity = "hour";
    }
    return out;
  }, [preset, isAdmin, showDevFilter, salesFilter, devFilter]);

  const compareDeltaTooltip = useMemo(() => {
    if (!compareApiFilters?.from || !compareApiFilters?.to) return null;
    return formatComparePeriodTooltipKyiv(compareApiFilters.from, compareApiFilters.to);
  }, [compareApiFilters]);

  const statsQuery = useCallStats(apiFilters, fetchEnabled);
  const compareStatsQuery = useCallStats(
    compareApiFilters,
    fetchEnabled && compareApiFilters !== null
  );
  const seriesQuery = useCallStatsTimeseries(apiFilters, fetchEnabled);

  const hasNonDefaultFilters = useMemo(
    () =>
      preset !== "all" ||
      salesFilter !== SALES_ALL ||
      devFilter !== DEV_ALL,
    [preset, salesFilter, devFilter]
  );

  function resetFilters() {
    setPreset("all");
    setCustomRange(undefined);
    setCustomOpen(false);
    setSalesFilter(SALES_ALL);
    setDevFilter(DEV_ALL);
    setSalesFilterOpen(false);
    setDevFilterOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={preset}
          onValueChange={(v) => {
            const nextPreset = v as CallStatsPreset;
            setPreset(nextPreset);
            if (nextPreset === "custom") {
              const thisWeekRange = callStatsRangeFromPreset("this_week", new Date(), null);
              if (thisWeekRange.from && thisWeekRange.to) {
                setCustomRange({
                  from: new Date(thisWeekRange.from),
                  to: new Date(thisWeekRange.to),
                });
              }
            } else {
              setCustomOpen(false);
            }
          }}
        >
          <SelectTrigger className="h-9 w-[min(100%,240px)] shrink-0">
            <SelectValue placeholder="Період" />
          </SelectTrigger>
          <SelectContent>
            {PRESET_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preset === "custom" && (
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-[min(100%,280px)] max-w-[280px] shrink-0 justify-start gap-2 px-3 font-normal"
              >
                <CalendarRange className="size-4 shrink-0 opacity-50" />
                <span className="truncate text-left">{customRangeButtonLabel(customRange)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto max-w-[calc(100vw-1.25rem)] overflow-hidden p-0"
              align="start"
              sideOffset={6}
            >
              <Calendar
                mode="range"
                locale={uk}
                defaultMonth={customRange?.from}
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={2}
                showOutsideDays={false}
              />
            </PopoverContent>
          </Popover>
        )}

        {isAdmin && (
          <Popover open={salesFilterOpen} onOpenChange={setSalesFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={salesFilterOpen}
                  className="h-9 w-[min(100%,240px)] max-w-[240px] shrink-0 justify-between px-3 font-normal"
                >
                  <span className="truncate">
                    {salesFilter === SALES_ALL
                      ? "Усі сейли"
                      : selectedSalesUser
                        ? `${selectedSalesUser.firstName} ${selectedSalesUser.lastName}`
                        : "Сейл"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(100vw-2rem,320px)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Пошук сейла..." />
                  <CommandList>
                    <CommandEmpty>Не знайдено</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="усі сейли всі"
                        data-checked={salesFilter === SALES_ALL}
                        onSelect={() => {
                          setSalesFilter(SALES_ALL);
                          setSalesFilterOpen(false);
                        }}
                      >
                        Усі сейли
                      </CommandItem>
                      {sortedSalesUsers.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.firstName} ${u.lastName} ${u.email}`}
                          data-checked={salesFilter === u.id}
                          onSelect={() => {
                            setSalesFilter(u.id);
                            setSalesFilterOpen(false);
                          }}
                        >
                          <ManagerBadge
                            name={`${u.firstName} ${u.lastName}`}
                            bgColor={u.badgeBgColor}
                            textColor={u.badgeTextColor}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
        )}

        {showDevFilter && (
            <Popover modal={false} open={devFilterOpen} onOpenChange={setDevFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={devFilterOpen}
                  className="h-9 w-[min(100%,240px)] max-w-[240px] shrink-0 justify-between px-3 font-normal"
                >
                  <span className="truncate">
                    {devFilter === DEV_ALL
                      ? "Усі виконавці"
                      : selectedDev
                        ? `${selectedDev.firstName} ${selectedDev.lastName}`
                        : "Оберіть виконавця"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] max-w-[calc(100vw-1.5rem)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Пошук виконавця..." />
                  <CommandList>
                    {devsLoading ? (
                      <div className="space-y-2 p-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>Не знайдено</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="усі виконавці всі"
                            data-checked={devFilter === DEV_ALL}
                            onSelect={() => {
                              setDevFilter(DEV_ALL);
                              setDevFilterOpen(false);
                            }}
                          >
                            Усі виконавці
                          </CommandItem>
                          {sortedDevs.map((d) => (
                            <CommandItem
                              key={d.id}
                              value={`${d.firstName} ${d.lastName} ${d.specialization ?? ""} ${d.technologies.map((t) => t.name).join(" ")}`}
                              data-checked={devFilter === d.id}
                              onSelect={() => {
                                setDevFilter(d.id);
                                setDevFilterOpen(false);
                              }}
                            >
                              <AssigneeOptionContent dev={d} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-3 sm:ml-auto"
          disabled={!hasNonDefaultFilters}
          onClick={resetFilters}
          aria-label="Скинути фільтри"
        >
          <RotateCcw className="size-3.5 opacity-70" aria-hidden />
          Скинути фільтри
        </Button>
      </div>

      {apiFilters === null ? (
        <p className="text-sm text-muted-foreground">
          Оберіть початок і кінець періоду в календарі.
        </p>
      ) : statsQuery.isLoading ? (
        <div className="space-y-4">
          <CallStatsCardsSkeleton />
          <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-stretch">
            <div className="min-h-0 min-w-0">
              <CallStatsDynamicsCardSkeleton />
            </div>
            <div className="min-h-0 min-w-0">
              <CallStatsPieCardSkeleton />
            </div>
          </div>
        </div>
      ) : statsQuery.isError ? (
        <p className="text-sm text-destructive">
          {(statsQuery.error as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Не вдалося завантажити статистику"}
        </p>
      ) : statsQuery.data ? (
        <div className="space-y-4">
          <CallStatsCardsCompact
            stats={statsQuery.data}
            compareStats={compareStatsQuery.data}
            showCompareDelta={
              compareApiFilters !== null &&
              compareStatsQuery.isSuccess &&
              compareStatsQuery.data !== undefined
            }
            compareDeltaTooltip={compareDeltaTooltip}
          />
          {seriesQuery.isError ? (
            <p className="text-sm text-destructive">
              {(seriesQuery.error as { response?: { data?: { error?: string } } })?.response?.data
                ?.error ?? "Не вдалося завантажити графік"}
            </p>
          ) : (
            <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-stretch">
              <div className="min-h-0 h-full min-w-0">
                {seriesQuery.isLoading ? (
                  <CallStatsDynamicsCardSkeleton />
                ) : seriesQuery.data ? (
                  <CallStatsAreaChart
                    points={seriesQuery.data.points}
                    subtitle={
                      preset === "all" || preset === "custom"
                        ? "Порівняння кількості дзвінків за обраний період"
                        : "Динаміка дзвінків у межах обраного пресету: три лінії — усі дзвінки, успішні та неуспішні. Легенда під графіком керує видимістю серій."
                    }
                  />
                ) : null}
              </div>
              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                <div className="shrink-0 border-b border-border/40 bg-muted/25 px-4 py-3">
                  <h3 className="text-sm font-semibold leading-none tracking-tight">Розподіл дзвінків</h3>
                  <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                    За результатами в обраному періоді
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-4">
                  <CallStatsDistributionPie stats={statsQuery.data} />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
