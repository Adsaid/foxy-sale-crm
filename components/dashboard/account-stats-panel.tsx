"use client";

import { useMemo, useState } from "react";
import { format, isSameDay, isValid, parseISO } from "date-fns";
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
  Briefcase,
  CalendarRange,
  ChartPie,
  ChevronsUpDown,
  CheckCircle2,
  Flame,
  HelpCircle,
  Pause,
  RotateCcw,
  Settings,
  Users,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAccountStats, useAccountStatsTimeseries } from "@/hooks/use-stats";
import { useAdminUsers } from "@/hooks/use-admin-users";
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
import type {
  AccountStatsData,
  AccountStatsQueryParams,
  AccountStatsTimeseriesPoint,
} from "@/types/crm";

const SALES_ALL = "all";

const PRESET_OPTIONS: { value: CallStatsPreset; label: string }[] = [
  { value: "all", label: "Увесь час" },
  { value: "today", label: "Сьогодні" },
  { value: "this_week", label: "Поточний тиждень" },
  { value: "last_week", label: "Минулий тиждень" },
  { value: "this_month", label: "Поточний місяць" },
  { value: "last_month", label: "Минулий місяць" },
  { value: "custom", label: "Свій період" },
];

type AccountStatCardVariant =
  | "total"
  | "upwork"
  | "linkedin"
  | "active"
  | "paused"
  | "setup"
  | "warming"
  | "noStatus";

type AccountStatDelta = {
  text: string;
  sentiment: "positive" | "negative";
  direction: "up" | "down";
};

function buildAccountStatDelta(
  variant: AccountStatCardVariant,
  current: number,
  previous: number
): AccountStatDelta | null {
  if (previous === 0) return null;
  const raw = current - previous;
  if (raw === 0) return null;
  const pct = Math.round((raw / previous) * 1000) / 10;
  if (pct === 0) return null;
  const sign = pct > 0 ? "+" : "";
  const text = `${sign}${pct}%`;
  const direction: AccountStatDelta["direction"] = raw > 0 ? "up" : "down";
  const inverted = variant === "paused" || variant === "noStatus";
  const sentiment: AccountStatDelta["sentiment"] =
    raw > 0 ? (inverted ? "negative" : "positive") : inverted ? "positive" : "negative";
  return { text, sentiment, direction };
}

function accountStatDeltaToneClass(sentiment: AccountStatDelta["sentiment"]) {
  return sentiment === "positive"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

function formatComparePeriodTooltip(isoFrom: string, isoTo: string): string {
  const from = parseISO(isoFrom);
  const to = parseISO(isoTo);
  if (!isValid(from) || !isValid(to)) {
    return "Порівняння з попереднім періодом такого ж типу";
  }
  if (isSameDay(from, to)) {
    return `Порівняння з ${format(from, "d MMMM yyyy", { locale: uk })}`;
  }
  return `Порівняння з періодом ${format(from, "d MMM yyyy", { locale: uk })} — ${format(to, "d MMM yyyy", { locale: uk })}`;
}

const ACCOUNT_CARD_STYLES: Record<
  AccountStatCardVariant,
  { icon: LucideIcon; iconWrap: string; iconHover: string }
> = {
  total: {
    icon: Users,
    iconWrap:
      "bg-amber-500/12 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-amber-500/22 dark:group-hover:bg-amber-500/18",
  },
  upwork: {
    icon: Briefcase,
    iconWrap:
      "bg-sky-500/12 text-sky-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-sky-500/10 dark:text-sky-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-sky-500/22 dark:group-hover:bg-sky-500/18",
  },
  linkedin: {
    icon: Share2,
    iconWrap:
      "bg-indigo-500/12 text-indigo-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-indigo-500/10 dark:text-indigo-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-indigo-500/22 dark:group-hover:bg-indigo-500/18",
  },
  active: {
    icon: CheckCircle2,
    iconWrap:
      "bg-emerald-500/12 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-emerald-500/10 dark:text-emerald-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-emerald-500/22 dark:group-hover:bg-emerald-500/18",
  },
  paused: {
    icon: Pause,
    iconWrap:
      "bg-orange-500/12 text-orange-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-orange-500/10 dark:text-orange-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-orange-500/22 dark:group-hover:bg-orange-500/18",
  },
  setup: {
    icon: Settings,
    iconWrap:
      "bg-violet-500/12 text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-violet-500/10 dark:text-violet-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-violet-500/22 dark:group-hover:bg-violet-500/18",
  },
  warming: {
    icon: Flame,
    iconWrap:
      "bg-rose-500/12 text-rose-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-rose-500/10 dark:text-rose-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-rose-500/22 dark:group-hover:bg-rose-500/18",
  },
  noStatus: {
    icon: HelpCircle,
    iconWrap:
      "bg-slate-500/12 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-inset ring-black/[0.05] dark:bg-slate-500/10 dark:text-slate-300 dark:shadow-none dark:ring-white/10",
    iconHover: "group-hover:bg-slate-500/22 dark:group-hover:bg-slate-500/18",
  },
};

const ACCOUNT_TYPE_CARD_CONFIG: { label: string; variant: AccountStatCardVariant }[] = [
  { label: "Всього акаунтів", variant: "total" },
  { label: "Upwork", variant: "upwork" },
  { label: "LinkedIn", variant: "linkedin" },
];

const ACCOUNT_STATUS_CARD_CONFIG: { label: string; variant: AccountStatCardVariant }[] = [
  { label: "Активні", variant: "active" },
  { label: "На паузі", variant: "paused" },
  { label: "Налаштування", variant: "setup" },
  { label: "Прогрів", variant: "warming" },
  { label: "Без операційного статусу", variant: "noStatus" },
];

function AccountStatCardCompact({
  label,
  value,
  variant,
  delta,
  deltaTooltip,
}: {
  label: string;
  value: string | number;
  variant: AccountStatCardVariant;
  delta?: AccountStatDelta | null;
  deltaTooltip?: string | null;
}) {
  const s = ACCOUNT_CARD_STYLES[variant];
  const Icon = s.icon;
  const deltaBlock =
    delta ? (
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5",
          accountStatDeltaToneClass(delta.sentiment)
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

function accountCardSkeletonItem(label: string) {
  return (
    <div
      key={label}
      className={cn(
        "flex max-w-full min-w-[min(100%,150px)] flex-[1_1_150px] flex-col overflow-hidden rounded-xl border border-border/45 sm:min-w-[min(100%,170px)] sm:flex-[1_1_170px]",
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
}

function AccountTypeCardsSectionSkeleton() {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border/40 bg-muted/10 p-2.5 dark:bg-muted/5 sm:p-3">
      <Skeleton className="mb-2 h-3 w-36 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-wrap content-start gap-2">
        {ACCOUNT_TYPE_CARD_CONFIG.map(({ label }) => accountCardSkeletonItem(label))}
      </div>
    </section>
  );
}

function AccountStatusCardsSectionSkeleton() {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border/40 bg-muted/10 p-2.5 dark:bg-muted/5 sm:p-3">
      <Skeleton className="mb-2 h-3 w-48 shrink-0" aria-hidden />
      <div className="flex flex-1 flex-wrap content-start gap-2">
        {ACCOUNT_STATUS_CARD_CONFIG.map(({ label }) => accountCardSkeletonItem(label))}
      </div>
    </section>
  );
}

const ACCOUNT_CHART_COLORS = {
  total: "#eab308",
  upwork: "#0ea5e9",
  linkedin: "#6366f1",
} as const;

const ACCOUNT_CHART_CONFIG = {
  total: { label: "Усі нові", color: ACCOUNT_CHART_COLORS.total },
  upwork: { label: "Upwork", color: ACCOUNT_CHART_COLORS.upwork },
  linkedin: { label: "LinkedIn", color: ACCOUNT_CHART_COLORS.linkedin },
} satisfies ChartConfig;

type AccountSeriesKey = keyof typeof ACCOUNT_CHART_COLORS;

const ACCOUNT_GRADIENT_IDS: Record<AccountSeriesKey, string> = {
  total: "accountStatsFillTotal",
  upwork: "accountStatsFillUpwork",
  linkedin: "accountStatsFillLinkedin",
};

const ACCOUNT_SERIES_META: { key: AccountSeriesKey; label: string }[] = [
  { key: "total", label: "Усі нові" },
  { key: "upwork", label: "Upwork" },
  { key: "linkedin", label: "LinkedIn" },
];

/** Розподіл за типом (pie): ті самі кольори, що й на лінійному графіку. */
const ACCOUNT_TYPE_PIE_CONFIG = {
  upwork: { label: "Upwork", color: ACCOUNT_CHART_COLORS.upwork },
  linkedin: { label: "LinkedIn", color: ACCOUNT_CHART_COLORS.linkedin },
} satisfies ChartConfig;

const ACCOUNT_TYPE_PIE_LEGEND_META: { key: string; label: string; fill: string }[] = [
  { key: "upwork", label: "Upwork", fill: ACCOUNT_CHART_COLORS.upwork },
  { key: "linkedin", label: "LinkedIn", fill: ACCOUNT_CHART_COLORS.linkedin },
];

const ACCOUNT_PIE_COLORS = {
  active: "#22c55e",
  paused: "#f97316",
  setup: "#8b5cf6",
  warming: "#f43f5e",
  noStatus: "#64748b",
} as const;

const ACCOUNT_PIE_CONFIG = {
  active: { label: "Активні", color: ACCOUNT_PIE_COLORS.active },
  paused: { label: "На паузі", color: ACCOUNT_PIE_COLORS.paused },
  setup: { label: "Налаштування", color: ACCOUNT_PIE_COLORS.setup },
  warming: { label: "Прогрів", color: ACCOUNT_PIE_COLORS.warming },
  noStatus: { label: "Без статусу", color: ACCOUNT_PIE_COLORS.noStatus },
} satisfies ChartConfig;

const ACCOUNT_PIE_LEGEND_META: { key: string; label: string; fill: string }[] = [
  { key: "active", label: "Активні", fill: ACCOUNT_PIE_COLORS.active },
  { key: "paused", label: "На паузі", fill: ACCOUNT_PIE_COLORS.paused },
  { key: "setup", label: "Налаштування", fill: ACCOUNT_PIE_COLORS.setup },
  { key: "warming", label: "Прогрів", fill: ACCOUNT_PIE_COLORS.warming },
  { key: "noStatus", label: "Без статусу", fill: ACCOUNT_PIE_COLORS.noStatus },
];

const ACCOUNT_STATUS_CHART_COLORS = {
  active: ACCOUNT_PIE_COLORS.active,
  paused: ACCOUNT_PIE_COLORS.paused,
  setup: ACCOUNT_PIE_COLORS.setup,
  warming: ACCOUNT_PIE_COLORS.warming,
  noOperationalStatus: ACCOUNT_PIE_COLORS.noStatus,
} as const;

const ACCOUNT_STATUS_CHART_CONFIG = {
  active: { label: "Активні", color: ACCOUNT_STATUS_CHART_COLORS.active },
  paused: { label: "На паузі", color: ACCOUNT_STATUS_CHART_COLORS.paused },
  setup: { label: "Налаштування", color: ACCOUNT_STATUS_CHART_COLORS.setup },
  warming: { label: "Прогрів", color: ACCOUNT_STATUS_CHART_COLORS.warming },
  noOperationalStatus: { label: "Без статусу", color: ACCOUNT_STATUS_CHART_COLORS.noOperationalStatus },
} satisfies ChartConfig;

type AccountStatusSeriesKey = keyof typeof ACCOUNT_STATUS_CHART_COLORS;

const ACCOUNT_STATUS_GRADIENT_IDS: Record<AccountStatusSeriesKey, string> = {
  active: "accountStatusFillActive",
  paused: "accountStatusFillPaused",
  setup: "accountStatusFillSetup",
  warming: "accountStatusFillWarming",
  noOperationalStatus: "accountStatusFillNoStatus",
};

const ACCOUNT_STATUS_SERIES_META: { key: AccountStatusSeriesKey; label: string }[] = [
  { key: "active", label: "Активні" },
  { key: "paused", label: "На паузі" },
  { key: "setup", label: "Налаштування" },
  { key: "warming", label: "Прогрів" },
  { key: "noOperationalStatus", label: "Без статусу" },
];

function accountStatsTypePieRows(stats: AccountStatsData) {
  return [
    {
      key: "upwork",
      name: "upwork",
      value: stats.upwork,
      fill: ACCOUNT_CHART_COLORS.upwork,
    },
    {
      key: "linkedin",
      name: "linkedin",
      value: stats.linkedin,
      fill: ACCOUNT_CHART_COLORS.linkedin,
    },
  ];
}

function accountStatsStatusPieRows(stats: AccountStatsData) {
  return [
    {
      key: "active",
      name: "active",
      value: stats.active,
      fill: ACCOUNT_PIE_COLORS.active,
    },
    {
      key: "paused",
      name: "paused",
      value: stats.paused,
      fill: ACCOUNT_PIE_COLORS.paused,
    },
    {
      key: "setup",
      name: "setup",
      value: stats.setup,
      fill: ACCOUNT_PIE_COLORS.setup,
    },
    {
      key: "warming",
      name: "warming",
      value: stats.warming,
      fill: ACCOUNT_PIE_COLORS.warming,
    },
    {
      key: "noStatus",
      name: "noStatus",
      value: stats.noOperationalStatus,
      fill: ACCOUNT_PIE_COLORS.noStatus,
    },
  ];
}

function AccountTypeDistributionPie({ stats }: { stats: AccountStatsData }) {
  const pieData = useMemo(() => {
    const rows = accountStatsTypePieRows(stats);
    return rows.filter((r) => r.value > 0).map((r) => ({ ...r }));
  }, [stats]);

  const pieSizeClass = "h-[min(100vw-2rem,220px)] w-[min(100vw-2rem,220px)]";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:p-3">
          {stats.totalAccounts === 0 ? (
            <div
              className="mx-auto flex min-h-[min(100vw-2rem,220px)] w-full max-w-[280px] flex-col items-center justify-center gap-3 px-4 py-8 text-center"
              aria-label="Немає акаунтів за період"
            >
              <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-muted-foreground/35 bg-muted/20">
                <ChartPie className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
              </div>
              <p className="text-xs text-muted-foreground">Немає даних для розподілу за типом</p>
            </div>
          ) : (
            <ChartContainer
              config={ACCOUNT_TYPE_PIE_CONFIG}
              className={cn(
                "mx-auto aspect-square max-w-full [&_.recharts-pie-label-line]:hidden",
                pieSizeClass
              )}
            >
              <PieChart>
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
                >
                  {pieData.map((d) => (
                    <Cell key={d.key} fill={d.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const { cx, cy } = viewBox;
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan className="fill-foreground text-3xl font-bold tabular-nums">
                              {stats.totalAccounts}
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
        className="mt-3 flex w-full shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-2"
        role="group"
        aria-label="Типи акаунтів"
      >
        {ACCOUNT_TYPE_PIE_LEGEND_META.map(({ key, label, fill }) => (
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

function AccountStatusDistributionPie({ stats }: { stats: AccountStatsData }) {
  const pieData = useMemo(() => {
    const rows = accountStatsStatusPieRows(stats);
    return rows.filter((r) => r.value > 0).map((r) => ({ ...r }));
  }, [stats]);

  const pieSizeClass = "h-[min(100vw-2rem,240px)] w-[min(100vw-2rem,240px)]";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:p-3">
          {stats.totalAccounts === 0 ? (
            <div
              className="mx-auto flex min-h-[min(100vw-2rem,240px)] w-full max-w-[320px] flex-col items-center justify-center gap-3 px-4 py-8 text-center sm:min-h-[280px]"
              aria-label="Немає акаунтів за період"
            >
              <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-destructive/45 bg-destructive/15 shadow-sm dark:border-destructive/50 dark:bg-destructive/25">
                <ChartPie className="size-8 text-destructive" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Немає акаунтів</p>
                <p className="text-xs leading-relaxed text-muted-foreground/85">
                  За обраний період немає даних для відображення розподілу
                </p>
              </div>
            </div>
          ) : (
            <ChartContainer
              config={ACCOUNT_PIE_CONFIG}
              className={cn(
                "mx-auto aspect-square max-w-full [&_.recharts-pie-label-line]:hidden",
                pieSizeClass
              )}
            >
              <PieChart>
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
                >
                  {pieData.map((d) => (
                    <Cell key={d.key} fill={d.fill} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        const { cx, cy } = viewBox;
                        return (
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan className="fill-foreground text-3xl font-bold tabular-nums">
                              {stats.totalAccounts}
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
        className="mt-3 flex w-full shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-2"
        role="group"
        aria-label="Сегменти діаграми за операційним статусом"
      >
        {ACCOUNT_PIE_LEGEND_META.map(({ key, label, fill }) => (
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

function AccountAreaGradients() {
  return (
    <defs>
      {(Object.keys(ACCOUNT_CHART_COLORS) as AccountSeriesKey[]).map((key) => {
        const c = ACCOUNT_CHART_COLORS[key];
        const gid = ACCOUNT_GRADIENT_IDS[key];
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

function AccountStatusAreaGradients() {
  return (
    <defs>
      {(Object.keys(ACCOUNT_STATUS_CHART_COLORS) as AccountStatusSeriesKey[]).map((key) => {
        const c = ACCOUNT_STATUS_CHART_COLORS[key];
        const gid = ACCOUNT_STATUS_GRADIENT_IDS[key];
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

function AccountDynamicsCardSkeleton({ legendCount = 3 }: { legendCount?: number }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/40 bg-muted/25 px-3 py-2.5 sm:px-4">
        <Skeleton className="h-4 w-48" aria-hidden />
        <Skeleton className="mt-1.5 h-3 w-[min(100%,18rem)] max-w-sm" aria-hidden />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <div className="flex min-h-[220px] flex-1 flex-col rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:min-h-[240px] sm:p-2.5">
          <Skeleton className="h-[220px] w-full shrink-0 rounded-lg sm:h-[240px]" aria-hidden />
        </div>
        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-2">
          {Array.from({ length: legendCount }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-[5.5rem] rounded-full" aria-hidden />
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountPieCardSkeleton({ legendCount }: { legendCount: number }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/40 bg-muted/25 px-4 py-3">
        <Skeleton className="h-4 w-40" aria-hidden />
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
          {Array.from({ length: legendCount }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-[4.75rem] rounded-full" aria-hidden />
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountAreaChart({
  points,
  subtitle,
}: {
  points: AccountStatsTimeseriesPoint[];
  subtitle: string;
}) {
  const [visible, setVisible] = useState<Record<AccountSeriesKey, boolean>>({
    total: true,
    upwork: true,
    linkedin: true,
  });

  const data = useMemo(
    () =>
      points.map((p) => ({
        name: p.label,
        total: p.total ?? 0,
        upwork: p.upwork ?? 0,
        linkedin: p.linkedin ?? 0,
      })),
    [points]
  );

  function toggleSeries(key: AccountSeriesKey, checked: boolean) {
    setVisible((v) => ({ ...v, [key]: checked }));
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/40 bg-muted/25 px-3 py-2.5 sm:px-4">
        <h3 className="text-sm font-semibold leading-none tracking-tight">Динаміка акаунтів</h3>
        <p className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-2">{subtitle}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <div className="flex min-h-[220px] flex-1 flex-col rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:min-h-[240px] sm:p-2.5">
          <ChartContainer
            config={ACCOUNT_CHART_CONFIG}
            className="aspect-auto h-full min-h-[200px] w-full sm:min-h-[220px]"
          >
            <AreaChart data={data} margin={{ left: 4, right: 6, top: 10, bottom: 4 }}>
              <AccountAreaGradients />
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
                  stroke={ACCOUNT_CHART_COLORS.total}
                  fill={`url(#${ACCOUNT_GRADIENT_IDS.total})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.upwork && (
                <Area
                  type="monotone"
                  dataKey="upwork"
                  name="upwork"
                  stroke={ACCOUNT_CHART_COLORS.upwork}
                  fill={`url(#${ACCOUNT_GRADIENT_IDS.upwork})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.linkedin && (
                <Area
                  type="monotone"
                  dataKey="linkedin"
                  name="linkedin"
                  stroke={ACCOUNT_CHART_COLORS.linkedin}
                  fill={`url(#${ACCOUNT_GRADIENT_IDS.linkedin})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
            </AreaChart>
          </ChartContainer>
        </div>
        <div
          className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 px-2 py-2"
          role="group"
          aria-label="Серії на графіку"
        >
          {ACCOUNT_SERIES_META.map(({ key, label }) => {
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
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-[color,box-shadow,background-color,border-color,transform] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs",
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
                    backgroundColor: ACCOUNT_CHART_COLORS[key],
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

function AccountStatusAreaChart({
  points,
  subtitle,
}: {
  points: AccountStatsTimeseriesPoint[];
  subtitle: string;
}) {
  const [visible, setVisible] = useState<Record<AccountStatusSeriesKey, boolean>>({
    active: true,
    paused: true,
    setup: true,
    warming: true,
    noOperationalStatus: true,
  });

  const data = useMemo(
    () =>
      points.map((p) => ({
        name: p.label,
        active: p.active ?? 0,
        paused: p.paused ?? 0,
        setup: p.setup ?? 0,
        warming: p.warming ?? 0,
        noOperationalStatus: p.noOperationalStatus ?? 0,
      })),
    [points]
  );

  function toggleSeries(key: AccountStatusSeriesKey, checked: boolean) {
    setVisible((v) => ({ ...v, [key]: checked }));
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/40 bg-muted/25 px-3 py-2.5 sm:px-4">
        <h3 className="text-sm font-semibold leading-none tracking-tight">Динаміка статусів</h3>
        <p className="mt-1 text-xs leading-snug text-muted-foreground line-clamp-2">{subtitle}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <div className="flex min-h-[220px] flex-1 flex-col rounded-xl border border-border/35 bg-gradient-to-b from-muted/20 to-transparent p-2 shadow-inner sm:min-h-[240px] sm:p-2.5">
          <ChartContainer
            config={ACCOUNT_STATUS_CHART_CONFIG}
            className="aspect-auto h-full min-h-[200px] w-full sm:min-h-[220px]"
          >
            <AreaChart data={data} margin={{ left: 4, right: 6, top: 10, bottom: 4 }}>
              <AccountStatusAreaGradients />
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
              {visible.active && (
                <Area
                  type="monotone"
                  dataKey="active"
                  name="active"
                  stroke={ACCOUNT_STATUS_CHART_COLORS.active}
                  fill={`url(#${ACCOUNT_STATUS_GRADIENT_IDS.active})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.paused && (
                <Area
                  type="monotone"
                  dataKey="paused"
                  name="paused"
                  stroke={ACCOUNT_STATUS_CHART_COLORS.paused}
                  fill={`url(#${ACCOUNT_STATUS_GRADIENT_IDS.paused})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.setup && (
                <Area
                  type="monotone"
                  dataKey="setup"
                  name="setup"
                  stroke={ACCOUNT_STATUS_CHART_COLORS.setup}
                  fill={`url(#${ACCOUNT_STATUS_GRADIENT_IDS.setup})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.warming && (
                <Area
                  type="monotone"
                  dataKey="warming"
                  name="warming"
                  stroke={ACCOUNT_STATUS_CHART_COLORS.warming}
                  fill={`url(#${ACCOUNT_STATUS_GRADIENT_IDS.warming})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
              {visible.noOperationalStatus && (
                <Area
                  type="monotone"
                  dataKey="noOperationalStatus"
                  name="noOperationalStatus"
                  stroke={ACCOUNT_STATUS_CHART_COLORS.noOperationalStatus}
                  fill={`url(#${ACCOUNT_STATUS_GRADIENT_IDS.noOperationalStatus})`}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
                />
              )}
            </AreaChart>
          </ChartContainer>
        </div>
        <div
          className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border/40 bg-muted/20 px-2 py-2"
          role="group"
          aria-label="Серії на графіку статусів"
        >
          {ACCOUNT_STATUS_SERIES_META.map(({ key, label }) => {
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
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-[color,box-shadow,background-color,border-color,transform] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs",
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
                    backgroundColor: ACCOUNT_STATUS_CHART_COLORS[key],
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
  return `${format(range.from, "d MMM yyyy", { locale: uk })} — ${format(end, "d MMM yyyy", { locale: uk })}`;
}

function valueForVariant(stats: AccountStatsData, variant: AccountStatCardVariant): number {
  switch (variant) {
    case "total":
      return stats.totalAccounts;
    case "upwork":
      return stats.upwork;
    case "linkedin":
      return stats.linkedin;
    case "active":
      return stats.active;
    case "paused":
      return stats.paused;
    case "setup":
      return stats.setup;
    case "warming":
      return stats.warming;
    case "noStatus":
      return stats.noOperationalStatus;
  }
}

function AccountMetricCardsSection({
  title,
  cardConfig,
  stats,
  compareStats,
  showCompareDelta,
  compareDeltaTooltip,
}: {
  title: string;
  cardConfig: { label: string; variant: AccountStatCardVariant }[];
  stats: AccountStatsData;
  compareStats: AccountStatsData | null | undefined;
  showCompareDelta: boolean;
  compareDeltaTooltip?: string | null;
}) {
  const prevValues: Record<AccountStatCardVariant, number> | null =
    showCompareDelta && compareStats
      ? {
          total: compareStats.totalAccounts,
          upwork: compareStats.upwork,
          linkedin: compareStats.linkedin,
          active: compareStats.active,
          paused: compareStats.paused,
          setup: compareStats.setup,
          warming: compareStats.warming,
          noStatus: compareStats.noOperationalStatus,
        }
      : null;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border/40 bg-muted/10 p-2.5 dark:bg-muted/5 sm:p-3">
      <h3 className="mb-2 shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-1 flex-wrap content-start gap-2">
        {cardConfig.map(({ label, variant }) => {
          const value = valueForVariant(stats, variant);
          const delta =
            prevValues !== null
              ? buildAccountStatDelta(variant, value, prevValues[variant])
              : null;
          return (
            <div
              key={`${label}-${variant}`}
              className="max-w-full min-w-[min(100%,150px)] flex-[1_1_150px] sm:min-w-[min(100%,170px)] sm:flex-[1_1_170px]"
            >
              <AccountStatCardCompact
                label={label}
                value={value}
                variant={variant}
                delta={delta}
                deltaTooltip={delta ? compareDeltaTooltip : null}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface AccountStatsPanelProps {
  fetchEnabled?: boolean;
}

export function AccountStatsPanel({ fetchEnabled = true }: AccountStatsPanelProps) {
  const { data: salesUsers } = useAdminUsers("SALES", true);
  const [preset, setPreset] = useState<CallStatsPreset>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customOpen, setCustomOpen] = useState(false);
  const [salesFilter, setSalesFilter] = useState<string>(SALES_ALL);
  const [salesFilterOpen, setSalesFilterOpen] = useState(false);

  const sortedSalesUsers = useMemo(() => {
    if (!salesUsers?.length) return [];
    return [...salesUsers].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "uk")
    );
  }, [salesUsers]);

  const selectedSalesUser =
    salesFilter === SALES_ALL ? null : sortedSalesUsers.find((u) => u.id === salesFilter);

  const apiFilters = useMemo((): AccountStatsQueryParams | null => {
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
    const out: AccountStatsQueryParams = {};
    if (rangeIso.from && rangeIso.to) {
      out.from = rangeIso.from;
      out.to = rangeIso.to;
    }
    if (salesFilter !== SALES_ALL) {
      out.salesId = salesFilter;
    }
    out.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (preset === "today") {
      out.granularity = "hour";
    } else if (
      preset === "custom" &&
      customRange?.from &&
      customRange?.to &&
      isSameDay(customRange.from, customRange.to)
    ) {
      out.granularity = "hour";
    }
    return out;
  }, [preset, customRange, salesFilter]);

  const compareApiFilters = useMemo((): AccountStatsQueryParams | null => {
    if (preset === "all" || preset === "custom") return null;
    const cmp = callStatsComparisonRangeFromPreset(preset, new Date());
    if (!cmp?.from || !cmp?.to) return null;
    const out: AccountStatsQueryParams = {
      from: cmp.from,
      to: cmp.to,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (salesFilter !== SALES_ALL) {
      out.salesId = salesFilter;
    }
    if (preset === "today") {
      out.granularity = "hour";
    }
    return out;
  }, [preset, salesFilter]);

  const compareDeltaTooltip = useMemo(() => {
    if (!compareApiFilters?.from || !compareApiFilters?.to) return null;
    return formatComparePeriodTooltip(compareApiFilters.from, compareApiFilters.to);
  }, [compareApiFilters]);

  const statsQuery = useAccountStats(apiFilters, fetchEnabled);
  const compareStatsQuery = useAccountStats(
    compareApiFilters,
    fetchEnabled && compareApiFilters !== null
  );
  const seriesQuery = useAccountStatsTimeseries(apiFilters, fetchEnabled);

  const hasNonDefaultFilters = useMemo(
    () => preset !== "all" || salesFilter !== SALES_ALL,
    [preset, salesFilter]
  );

  function resetFilters() {
    setPreset("all");
    setCustomRange(undefined);
    setCustomOpen(false);
    setSalesFilter(SALES_ALL);
    setSalesFilterOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={preset}
          onValueChange={(v) => {
            setPreset(v as CallStatsPreset);
            if (v !== "custom") {
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
          <AccountTypeCardsSectionSkeleton />
          <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="flex min-h-0 w-full min-w-0 lg:col-span-7">
              <AccountDynamicsCardSkeleton legendCount={3} />
            </div>
            <div className="flex min-h-0 min-w-0 lg:col-span-5">
              <AccountPieCardSkeleton legendCount={2} />
            </div>
          </div>
          <AccountStatusCardsSectionSkeleton />
          <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="flex min-h-0 w-full min-w-0 lg:col-span-7">
              <AccountDynamicsCardSkeleton legendCount={5} />
            </div>
            <div className="flex min-h-0 min-w-0 lg:col-span-5">
              <AccountPieCardSkeleton legendCount={5} />
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
          <AccountMetricCardsSection
            title="Тип платформи"
            cardConfig={ACCOUNT_TYPE_CARD_CONFIG}
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
                ?.error ?? "Не вдалося завантажити графіки"}
            </p>
          ) : (
            <>
              <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-12 lg:items-stretch">
                <div className="flex min-h-0 w-full min-w-0 lg:col-span-7">
                  {seriesQuery.isLoading ? (
                    <AccountDynamicsCardSkeleton legendCount={3} />
                  ) : seriesQuery.data ? (
                    <AccountAreaChart
                      points={seriesQuery.data.points}
                      subtitle={
                        preset === "all" || preset === "custom"
                          ? "Порівняння кількості нових акаунтів (за датою додавання в CRM) за обраний період"
                          : "Нові акаунти у межах обраного пресету: усі, Upwork та LinkedIn. Легенда під графіком керує видимістю серій."
                      }
                    />
                  ) : null}
                </div>
                <div className="flex min-h-0 min-w-0 lg:col-span-5">
                  <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                    <div className="shrink-0 border-b border-border/40 bg-muted/25 px-3 py-2.5 sm:px-4">
                      <h3 className="text-sm font-semibold leading-none tracking-tight">
                        Розподіл за типом
                      </h3>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        Upwork і LinkedIn у обраному періоді
                      </p>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                      <AccountTypeDistributionPie stats={statsQuery.data} />
                    </div>
                  </div>
                </div>
              </div>
              <AccountMetricCardsSection
                title="Операційний статус"
                cardConfig={ACCOUNT_STATUS_CARD_CONFIG}
                stats={statsQuery.data}
                compareStats={compareStatsQuery.data}
                showCompareDelta={
                  compareApiFilters !== null &&
                  compareStatsQuery.isSuccess &&
                  compareStatsQuery.data !== undefined
                }
                compareDeltaTooltip={compareDeltaTooltip}
              />
              <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-12 lg:items-stretch">
                <div className="flex min-h-0 w-full min-w-0 lg:col-span-7">
                  {seriesQuery.isLoading ? (
                    <AccountDynamicsCardSkeleton legendCount={5} />
                  ) : seriesQuery.data ? (
                    <AccountStatusAreaChart
                      points={seriesQuery.data.points}
                      subtitle={
                        preset === "all" || preset === "custom"
                          ? "Нові акаунти за датою додавання в CRM, розподілені за поточним операційним статусом"
                          : "Нові акаунти у межах пресету за операційним статусом. Легенда під графіком керує видимістю серій."
                      }
                    />
                  ) : null}
                </div>
                <div className="flex min-h-0 min-w-0 lg:col-span-5">
                  <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                    <div className="shrink-0 border-b border-border/40 bg-muted/25 px-3 py-2.5 sm:px-4">
                      <h3 className="text-sm font-semibold leading-none tracking-tight">
                        Розподіл за статусом
                      </h3>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">
                        Операційний статус у обраному періоді
                      </p>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                      <AccountStatusDistributionPie stats={statsQuery.data} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
