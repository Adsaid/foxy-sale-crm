"use client";

import { useMemo, useState } from "react";
import { addDays, format, max as maxDate, min as minDate, startOfISOWeek } from "date-fns";
import { uk } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { useAccountReports } from "@/hooks/use-account-reports";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { formatWeekRangeLabelFromStart, isoWeeksCsvFromDateRange } from "@/lib/report-week";
import {
  accountDesktopTypeLabelUk,
  accountWarmUpStageLabelUk,
  formatAccountLocationLabel,
} from "@/lib/account-fields";
import { AccountLocationValue } from "@/components/ui/account-location-value";
import { formatCallTableDateTime, formatDateKyiv } from "@/lib/date-kyiv";
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
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { AccountOperationalStatusBadge } from "@/components/ui/account-operational-status-badge";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountDetailSheet } from "@/components/sheets/account-detail-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SortableHeader, TablePagination } from "@/components/ui/data-table-controls";
import type { SortState } from "@/hooks/use-table";
import type {
  Account,
  AccountDesktopType,
  AdminUser,
  SalesAccountReportListItem,
} from "@/types/crm";
import { CalendarRange, ChevronsUpDown } from "lucide-react";

const SALES_ALL = "all";

function defaultIsoWeekRange(): DateRange {
  const from = startOfISOWeek(new Date());
  return { from, to: addDays(from, 6) };
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Обрано саме пресет «поточний ISO-тиждень» (не довільний діапазон на календарі). */
function isCurrentIsoWeekPreset(range: DateRange | undefined): boolean {
  if (!range?.from) return false;
  const end = range.to ?? range.from;
  const preset = defaultIsoWeekRange();
  if (!preset.from || !preset.to) return false;
  return isSameCalendarDay(range.from, preset.from) && isSameCalendarDay(end, preset.to);
}

function pluralWeeksUk(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} тиждень`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} тижні`;
  return `${n} тижнів`;
}

function weekSpanTriggerLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Усі тижні";
  const end = range.to ?? range.from;
  const minMonday = startOfISOWeek(minDate([range.from, end]));
  const maxMonday = startOfISOWeek(maxDate([range.from, end]));
  if (minMonday.getTime() === maxMonday.getTime()) {
    return formatWeekRangeLabelFromStart(minMonday);
  }
  const csv = isoWeeksCsvFromDateRange(range);
  const count = csv ? csv.split(",").length : 0;
  const lastDay = addDays(maxMonday, 6);
  if (count > 1) {
    return `${pluralWeeksUk(count)}: ${formatWeekRangeLabelFromStart(minMonday)} → ${format(lastDay, "d MMM yyyy", { locale: uk })}`;
  }
  return `${formatWeekRangeLabelFromStart(minMonday)} → ${format(lastDay, "d MMM yyyy", { locale: uk })}`;
}

const SNAPSHOT_SORT_DEFAULT: SortState = { column: "type", direction: "asc" };

function snapshotSortValue(acc: Account, column: string): string | number {
  switch (column) {
    case "location":
      return formatAccountLocationLabel(acc.location).toLowerCase();
    case "operationalStatus":
      return acc.operationalStatus ?? "";
    case "warmUpStage":
      return acc.warmUpStage ?? "";
    case "account":
      return acc.account.toLowerCase();
    case "type":
      return acc.type;
    case "desktopType":
      return acc.desktopType ?? "";
    case "metrics": {
      if (acc.type === "UPWORK") return acc.profileViewsCount ?? -1;
      const c = acc.contactsCount ?? 0;
      const v = acc.profileViewsCount ?? 0;
      return c * 1_000_000 + v;
    }
    case "accountCreatedAt":
      return acc.accountCreatedAt ? new Date(acc.accountCreatedAt).getTime() : 0;
    default:
      return "";
  }
}

function sortSnapshotRows(rows: Account[], sort: SortState | null): Account[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const aVal = snapshotSortValue(a, sort.column);
    const bVal = snapshotSortValue(b, sort.column);
    if (aVal === bVal) return 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      const cmp = aVal - bVal;
      return sort.direction === "desc" ? -cmp : cmp;
    }
    const cmp = String(aVal).localeCompare(String(bVal), "uk", { sensitivity: "base" });
    return sort.direction === "desc" ? -cmp : cmp;
  });
}

export function AccountReportsPanel() {
  const { data: salesUsers } = useAdminUsers("SALES", true);
  const [salesFilter, setSalesFilter] = useState(SALES_ALL);
  const [salesFilterOpen, setSalesFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => defaultIsoWeekRange());
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sheetAccount, setSheetAccount] = useState<Account | null>(null);

  const weeksCsv = useMemo(() => isoWeeksCsvFromDateRange(dateRange), [dateRange]);

  const { data, isLoading } = useAccountReports({
    page,
    limit: pageSize,
    salesUserId: salesFilter === SALES_ALL ? undefined : salesFilter,
    weeks: weeksCsv,
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

  const filterAllWeeks = dateRange === undefined;
  const filterCurrentWeek = isCurrentIsoWeekPreset(dateRange);

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
              className="h-9 w-[min(100%,280px)] max-w-[280px] shrink-0 justify-start gap-2 px-3 font-normal"
            >
              <CalendarRange className="size-4 shrink-0 opacity-50" />
              <span className="truncate text-left">{weekSpanTriggerLabel(dateRange)}</span>
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
                variant={filterCurrentWeek ? "default" : "outline"}
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
                variant={filterAllWeeks ? "default" : "outline"}
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

      {isLoading ? (
        <div className="rounded-md border px-4 py-6">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </div>
      ) : !data?.items.length ? (
        <div className="rounded-md border py-12">
          <p className="text-center text-sm text-muted-foreground">
            Немає звітів за обраними фільтрами.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Accordion type="multiple" className="rounded-none border-0 shadow-none">
            {data.items.map((report) => (
              <ReportAccordionItem
                key={report.id}
                report={report}
                submitterUser={sortedSales.find((u) => u.id === report.submittedBy.id)}
                onRowClick={setSheetAccount}
              />
            ))}
          </Accordion>
          {data.total > 0 && (
            <TablePagination
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </div>
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
  submitterUser,
  onRowClick,
}: {
  report: SalesAccountReportListItem;
  submitterUser?: AdminUser;
  onRowClick: (a: Account) => void;
}) {
  const [sort, setSort] = useState<SortState | null>(SNAPSHOT_SORT_DEFAULT);

  function toggleSort(column: string) {
    setSort((prev) => {
      if (prev?.column === column) {
        if (prev.direction === "asc") return { column, direction: "desc" };
        return null;
      }
      return { column, direction: "asc" };
    });
  }

  const sortedSnapshot = useMemo(
    () => sortSnapshotRows(report.accountsSnapshot, sort),
    [report.accountsSnapshot, sort]
  );

  const weekStart = new Date(report.weekStart);
  const weekLabel = formatWeekRangeLabelFromStart(weekStart);
  const submitted = formatCallTableDateTime(report.createdAt);
  const { firstName, lastName } = report.submittedBy;
  const salesName = `${firstName} ${lastName}`.trim();

  return (
    <AccordionItem value={report.id} className="data-open:bg-transparent">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex w-full flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pr-2">
            <ManagerBadge
              name={salesName}
              bgColor={submitterUser?.badgeBgColor}
              textColor={submitterUser?.badgeTextColor}
            />
            <span className="text-sm text-muted-foreground">· {weekLabel}</span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            Надіслано: {submitted}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-0">
        <div className="min-w-0 rounded-md border bg-background">
          <Table className="w-max min-w-full">
            <TableHeader>
              <TableRow>
                <SortableHeader
                  column="location"
                  label="Місцезнаходження"
                  sort={sort}
                  onSort={toggleSort}
                  className="whitespace-normal text-left"
                />
                <SortableHeader
                  column="operationalStatus"
                  label="Статус"
                  sort={sort}
                  onSort={toggleSort}
                  className="whitespace-nowrap text-left"
                />
                <SortableHeader
                  column="account"
                  label="Акаунт"
                  sort={sort}
                  onSort={toggleSort}
                  className="text-left"
                />
                <SortableHeader
                  column="type"
                  label="Тип"
                  sort={sort}
                  onSort={toggleSort}
                  className="whitespace-nowrap text-left"
                />
                <SortableHeader
                  column="desktopType"
                  label="Робоче оточення"
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden text-left sm:table-cell whitespace-normal text-sm"
                />
                <SortableHeader
                  column="warmUpStage"
                  label="Етап"
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden text-left sm:table-cell whitespace-normal text-sm"
                />
                <SortableHeader
                  column="metrics"
                  label="Конт. / перегл."
                  sort={sort}
                  onSort={toggleSort}
                  className="hidden text-left md:table-cell"
                />
                <SortableHeader
                  column="accountCreatedAt"
                  label="Дата створення"
                  sort={sort}
                  onSort={toggleSort}
                  className="whitespace-nowrap text-left"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSnapshot.map((acc) => {
                const deskLabel =
                  acc.desktopType != null
                    ? accountDesktopTypeLabelUk[acc.desktopType as AccountDesktopType]
                    : "—";
                return (
                  <TableRow
                    key={acc.id}
                    className="cursor-pointer"
                    onClick={() => onRowClick(acc)}
                  >
                    <TableCell className="min-w-0 whitespace-normal break-words text-left align-middle">
                      <AccountLocationValue location={acc.location} />
                    </TableCell>
                    <TableCell className="text-left align-middle">
                      {acc.operationalStatus ? (
                        <AccountOperationalStatusBadge status={acc.operationalStatus} />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="min-w-0 text-left align-middle font-medium">
                      <span className="line-clamp-2 break-words">{acc.account}</span>
                    </TableCell>
                    <TableCell className="text-left align-middle">
                      <AccountTypeBadge type={acc.type} />
                    </TableCell>
                    <TableCell className="hidden text-left align-middle sm:table-cell text-sm">
                      {acc.type === "UPWORK" ? deskLabel : "—"}
                    </TableCell>
                    <TableCell className="hidden min-w-0 whitespace-normal text-left align-middle text-sm sm:table-cell">
                      {acc.operationalStatus === "WARMING" && acc.warmUpStage ? (
                        accountWarmUpStageLabelUk[acc.warmUpStage]
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden text-left align-middle text-sm tabular-nums md:table-cell">
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
                    <TableCell className="text-left align-middle tabular-nums">
                      {acc.accountCreatedAt
                        ? formatDateKyiv(acc.accountCreatedAt)
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
