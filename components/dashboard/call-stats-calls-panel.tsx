"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, ChartPie, ChevronsUpDown } from "lucide-react";
import { useCallStats, useCallStatsTimeseries } from "@/hooks/use-stats";
import { useAdminUsers } from "@/hooks/use-admin-users";
import {
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
import { ManagerBadge } from "@/components/ui/manager-badge";
import type {
  CallStatsData,
  CallStatsQueryParams,
  CallStatsTimeseriesPoint,
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

function StatCardCompact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
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

/**
 * Кольори сегментів pie. Чотири неперетинні частини → сума = Всього дзвінків:
 * Очікують + Успішні + Неуспішні + Не вказано.
 * Картка «Завершені» = Успішні + Неуспішні + Не вказано (усі зі статусу COMPLETED).
 */
const CALL_STATS_PIE_COLORS = {
  /** Завершені без outcome SUCCESS/UNSUCCESSFUL — результат не вказано */
  completed: "#6366f1",
  success: "#22c55e",
  unsuccessful: "#ef4444",
  pending: "#eab308",
} as const;

/** Slug-ключі для ChartStyle / tooltip; підписи — лише в `label`. */
const CALL_STATS_PIE_CONFIG = {
  completed: { label: "Не вказано", color: CALL_STATS_PIE_COLORS.completed },
  success: { label: "Успішні", color: CALL_STATS_PIE_COLORS.success },
  unsuccessful: { label: "Неуспішні", color: CALL_STATS_PIE_COLORS.unsuccessful },
  pending: { label: "Очікують", color: CALL_STATS_PIE_COLORS.pending },
} satisfies ChartConfig;

/** Легенда під pie: сегменти діаграми (не серії лінійного графіка). */
const PIE_LEGEND_META: { key: string; label: string; fill: string }[] = [
  { key: "unsuccessful", label: "Неуспішні", fill: CALL_STATS_PIE_COLORS.unsuccessful },
  { key: "success", label: "Успішні", fill: CALL_STATS_PIE_COLORS.success },
  { key: "completed", label: "Не вказано", fill: CALL_STATS_PIE_COLORS.completed },
  { key: "pending", label: "Очікують", fill: CALL_STATS_PIE_COLORS.pending },
];

function callStatsPieRows(stats: CallStatsData) {
  const completedOther = Math.max(
    0,
    stats.completedCalls - stats.successCalls - stats.unsuccessfulCalls
  );
  return [
    {
      key: "completed",
      name: "completed",
      value: completedOther,
      fill: CALL_STATS_PIE_COLORS.completed,
    },
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
                <Tooltip cursor={false} content={<ChartTooltipContent />} />
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

function LoadingSkeletonCompact({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border px-3 py-2">
          <Skeleton className="mb-2 h-2.5 w-20" />
          <Skeleton className="h-7 w-9" />
        </div>
      ))}
    </div>
  );
}

function ChartAreaSkeleton() {
  return <Skeleton className="h-[320px] w-full rounded-xl border" />;
}

function CallStatsAreaChart({ points }: { points: CallStatsTimeseriesPoint[] }) {
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
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
          Порівняння кількості дзвінків за обраний період
        </p>
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
  return `${format(range.from, "d MMM yyyy", { locale: uk })} — ${format(end, "d MMM yyyy", { locale: uk })}`;
}

function CallStatsCardsCompact({ stats }: { stats: CallStatsData }) {
  const items = [
    { label: "Всього дзвінків", value: stats.totalCalls },
    { label: "Завершені", value: stats.completedCalls },
    { label: "Успішні", value: stats.successCalls },
    { label: "Неуспішні", value: stats.unsuccessfulCalls },
    { label: "Очікують", value: stats.pendingCalls },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <StatCardCompact key={item.label} label={item.label} value={item.value} />
      ))}
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
  const { data: salesUsers } = useAdminUsers("SALES", isAdmin);
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
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    out.timeZone = timeZone;
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
  }, [preset, customRange, isAdmin, salesFilter]);

  const statsQuery = useCallStats(apiFilters, fetchEnabled);
  const seriesQuery = useCallStatsTimeseries(apiFilters, fetchEnabled);

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
      </div>

      {apiFilters === null ? (
        <p className="text-sm text-muted-foreground">
          Оберіть початок і кінець періоду в календарі.
        </p>
      ) : statsQuery.isLoading ? (
        <div className="space-y-4">
          <LoadingSkeletonCompact count={5} />
          <ChartAreaSkeleton />
        </div>
      ) : statsQuery.isError ? (
        <p className="text-sm text-destructive">
          {(statsQuery.error as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Не вдалося завантажити статистику"}
        </p>
      ) : statsQuery.data ? (
        <div className="space-y-4">
          <CallStatsCardsCompact stats={statsQuery.data} />
          {seriesQuery.isLoading ? (
            <ChartAreaSkeleton />
          ) : seriesQuery.isError ? (
            <p className="text-sm text-destructive">
              {(seriesQuery.error as { response?: { data?: { error?: string } } })?.response?.data
                ?.error ?? "Не вдалося завантажити графік"}
            </p>
          ) : seriesQuery.data ? (
            <div className="grid min-h-0 min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-stretch">
              <div className="min-h-0 h-full min-w-0">
                <CallStatsAreaChart points={seriesQuery.data.points} />
              </div>
              <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                <div className="shrink-0 border-b border-border/40 bg-muted/25 px-4 py-3">
                  <h3 className="text-sm font-semibold leading-none tracking-tight">Розподіл дзвінків</h3>
                  <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                    За статусами в обраному періоді
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-4">
                  <CallStatsDistributionPie stats={statsQuery.data} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
