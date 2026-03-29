"use client";

import { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import { uk } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CalendarRange, ChevronsUpDown } from "lucide-react";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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

const CALL_STATS_CHART_CONFIG = {
  total: { label: "Усі дзвінки", color: "var(--chart-1)" },
  success: { label: "Успішні", color: "var(--chart-2)" },
  unsuccessful: { label: "Неуспішні", color: "var(--chart-3)" },
} satisfies ChartConfig;

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
  return <Skeleton className="h-[280px] w-full rounded-lg border" />;
}

function CallStatsAreaChart({ points }: { points: CallStatsTimeseriesPoint[] }) {
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

  return (
    <div className="rounded-lg border bg-card p-4 pt-2">
      <ChartContainer config={CALL_STATS_CHART_CONFIG} className="aspect-auto h-[280px] w-full">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            className="text-[10px] sm:text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={36}
            allowDecimals={false}
            className="text-[10px] sm:text-xs"
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--color-total)"
            fill="var(--color-total)"
            fillOpacity={0.12}
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="success"
            stroke="var(--color-success)"
            fill="var(--color-success)"
            fillOpacity={0.12}
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="unsuccessful"
            stroke="var(--color-unsuccessful)"
            fill="var(--color-unsuccessful)"
            fillOpacity={0.12}
            strokeWidth={1.5}
          />
          <ChartLegend content={<ChartLegendContent />} className="pt-3" />
        </AreaChart>
      </ChartContainer>
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
            <CallStatsAreaChart points={seriesQuery.data.points} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
