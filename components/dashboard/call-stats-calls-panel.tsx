"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarRange, ChevronsUpDown } from "lucide-react";
import { useCallStats } from "@/hooks/use-stats";
import { useAdminUsers } from "@/hooks/use-admin-users";
import {
  callStatsRangeFromPreset,
  type CallStatsPreset,
} from "@/lib/call-stats-range";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { CallStatsData, CallStatsQueryParams } from "@/types/crm";

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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function customRangeButtonLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Оберіть період";
  const end = range.to ?? range.from;
  return `${format(range.from, "d MMM yyyy", { locale: uk })} — ${format(end, "d MMM yyyy", { locale: uk })}`;
}

function CallStatsCards({ stats }: { stats: CallStatsData }) {
  const items = [
    { label: "Всього дзвінків", value: stats.totalCalls },
    { label: "Завершені", value: stats.completedCalls },
    { label: "Успішні", value: stats.successCalls },
    { label: "Неуспішні", value: stats.unsuccessfulCalls },
    { label: "Очікують", value: stats.pendingCalls },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} />
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
    return out;
  }, [preset, customRange, isAdmin, salesFilter]);

  const { data, isLoading, isError, error } = useCallStats(apiFilters, fetchEnabled);

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
      ) : isLoading ? (
        <LoadingSkeleton count={5} />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {(error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Не вдалося завантажити статистику"}
        </p>
      ) : data ? (
        <CallStatsCards stats={data} />
      ) : null}
    </div>
  );
}
