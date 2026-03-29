"use client";

import { useMemo, useState } from "react";
import { addDays, format, max as maxDate, min as minDate, startOfISOWeek } from "date-fns";
import { uk } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { useAccountReports } from "@/hooks/use-account-reports";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { formatWeekRangeLabelFromStart } from "@/lib/report-week";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { AccountOperationalStatusBadge } from "@/components/ui/account-operational-status-badge";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountDetailSheet } from "@/components/sheets/account-detail-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Account, SalesAccountReportListItem } from "@/types/crm";
import { CalendarRange, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

const SALES_ALL = "all";

function defaultIsoWeekRange(): DateRange {
  const from = startOfISOWeek(new Date());
  return { from, to: addDays(from, 6) };
}

function weekStartBoundsIso(range: DateRange | undefined): {
  weekStartMin: string;
  weekStartMax: string;
} | null {
  if (!range?.from) return null;
  const end = range.to ?? range.from;
  const earlier = minDate([range.from, end]);
  const later = maxDate([range.from, end]);
  const minMonday = startOfISOWeek(earlier);
  const maxMonday = startOfISOWeek(later);
  return {
    weekStartMin: minMonday.toISOString(),
    weekStartMax: maxMonday.toISOString(),
  };
}

function weekSpanTriggerLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Усі тижні";
  const end = range.to ?? range.from;
  const minMonday = startOfISOWeek(minDate([range.from, end]));
  const maxMonday = startOfISOWeek(maxDate([range.from, end]));
  if (minMonday.getTime() === maxMonday.getTime()) {
    return formatWeekRangeLabelFromStart(minMonday);
  }
  const lastDay = addDays(maxMonday, 6);
  return `${formatWeekRangeLabelFromStart(minMonday)} — ${format(lastDay, "d MMM yyyy", { locale: uk })}`;
}

export function AccountReportsPanel() {
  const { data: salesUsers } = useAdminUsers("SALES", true);
  const [salesFilter, setSalesFilter] = useState(SALES_ALL);
  const [salesFilterOpen, setSalesFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => defaultIsoWeekRange());
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sheetAccount, setSheetAccount] = useState<Account | null>(null);

  const weekIso = useMemo(() => weekStartBoundsIso(dateRange), [dateRange]);

  const { data, isLoading } = useAccountReports({
    page,
    limit: 20,
    salesUserId: salesFilter === SALES_ALL ? undefined : salesFilter,
    ...(weekIso ?? {}),
  });

  const sortedSales = useMemo(() => {
    if (!salesUsers?.length) return [];
    return [...salesUsers].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "uk")
    );
  }, [salesUsers]);

  const selectedSalesUser =
    salesFilter === SALES_ALL ? null : sortedSales.find((u) => u.id === salesFilter);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={salesFilterOpen} onOpenChange={setSalesFilterOpen}>
          <PopoverTrigger asChild>
            <Button
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
                      setPage(1);
                    }}
                  >
                    Усі сейли
                  </CommandItem>
                  {sortedSales.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={`${u.firstName} ${u.lastName} ${u.email}`}
                      data-checked={salesFilter === u.id}
                      onSelect={() => {
                        setSalesFilter(u.id);
                        setSalesFilterOpen(false);
                        setPage(1);
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

        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-9 w-[min(100%,min(100vw-2rem,320px))] max-w-[320px] shrink-0 justify-start gap-2 px-3 font-normal"
            >
              <CalendarRange className="size-4 shrink-0 opacity-60" />
              <span className="truncate">{weekSpanTriggerLabel(dateRange)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              locale={uk}
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(r) => {
                setDateRange(r);
                setPage(1);
              }}
              numberOfMonths={2}
              showOutsideDays={false}
            />
            <Separator />
            <div className="flex flex-wrap gap-2 p-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setDateRange(defaultIsoWeekRange());
                  setPage(1);
                  setDateRangeOpen(false);
                }}
              >
                Поточний тиждень
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setDateRange(undefined);
                  setPage(1);
                  setDateRangeOpen(false);
                }}
              >
                Усі тижні
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      {isLoading ? (
        <Card size="sm">
          <CardContent className="space-y-2 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      ) : !data?.items.length ? (
        <Card size="sm">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CardDescription className="text-center text-base">
              Немає звітів за обраними фільтрами.
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <Card size="sm" className="gap-0 py-0">
          <CardContent className="space-y-0 px-0 pt-4 pb-0">
            <Accordion
              type="multiple"
              className="rounded-none border-0 bg-transparent shadow-none"
            >
              {data.items.map((report) => (
                <ReportAccordionItem
                  key={report.id}
                  report={report}
                  onRowClick={setSheetAccount}
                />
              ))}
            </Accordion>
          </CardContent>
          {data.total > 0 && (
            <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t py-3 text-sm text-muted-foreground">
              <span>
                {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} з{" "}
                {data.total}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="px-2 tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      <AccountDetailSheet
        account={sheetAccount}
        open={!!sheetAccount}
        onOpenChange={(o) => !o && setSheetAccount(null)}
      />
    </div>
  );
}

function ReportAccordionItem({
  report,
  onRowClick,
}: {
  report: SalesAccountReportListItem;
  onRowClick: (a: Account) => void;
}) {
  const weekStart = new Date(report.weekStart);
  const weekLabel = formatWeekRangeLabelFromStart(weekStart);
  const submitted = new Date(report.createdAt).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const { firstName, lastName } = report.submittedBy;

  return (
    <AccordionItem value={report.id} className="border-0 border-b border-border last:border-b-0">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex w-full flex-col items-start gap-1 pr-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <span className="font-medium text-foreground">
              {firstName} {lastName}
            </span>
            <span className="text-muted-foreground"> · {weekLabel}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums sm:shrink-0">
            Надіслано: {submitted}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-0">
        <Card className="gap-0 overflow-hidden py-0 shadow-none ring-1 ring-border">
          <CardContent className="px-0 py-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Акаунт</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="hidden md:table-cell">Конт. / перегл.</TableHead>
                <TableHead className="hidden lg:table-cell">Сейл</TableHead>
                <TableHead>Створено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.accountsSnapshot.map((acc) => (
                <TableRow
                  key={acc.id}
                  className="cursor-pointer"
                  onClick={() => onRowClick(acc)}
                >
                  <TableCell className="font-medium">{acc.account}</TableCell>
                  <TableCell>
                    <AccountTypeBadge type={acc.type} />
                  </TableCell>
                  <TableCell>
                    {acc.operationalStatus ? (
                      <AccountOperationalStatusBadge status={acc.operationalStatus} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground tabular-nums">
                    {acc.type === "UPWORK" ? (
                      acc.profileViewsCount != null ? (
                        acc.profileViewsCount
                      ) : (
                        "—"
                      )
                    ) : acc.contactsCount != null || acc.profileViewsCount != null ? (
                      <>
                        {acc.contactsCount ?? "—"} / {acc.profileViewsCount ?? "—"}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {acc.owner ? (
                      <ManagerBadge
                        name={`${acc.owner.firstName} ${acc.owner.lastName}`}
                        bgColor={acc.owner.badgeBgColor}
                        textColor={acc.owner.badgeTextColor}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {new Date(acc.createdAt).toLocaleDateString("uk-UA")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>
  );
}
