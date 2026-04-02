"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "@/hooks/use-accounts";
import { useTable } from "@/hooks/use-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableBodySkeleton } from "@/components/ui/table-body-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { AccountOperationalStatusBadge } from "@/components/ui/account-operational-status-badge";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { AccountDialog } from "@/components/dialogs/account-dialog";
import { AccountDetailSheet } from "@/components/sheets/account-detail-sheet";
import { AccountReportsPanel } from "@/components/dashboard/account-reports-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubmitAccountReport } from "@/hooks/use-submit-account-report";
import {
  TableToolbar,
  TablePagination,
  SortableHeader,
} from "@/components/ui/data-table-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Account,
  AccountFormPayload,
  AccountType,
  CreateAccountInput,
} from "@/types/crm";
import { formatDateKyiv } from "@/lib/date-kyiv";
import { cn } from "@/lib/utils";

export function AccountsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const isSales = user?.role === "SALES";
  const { data: accounts, isLoading } = useAccounts();
  const { data: salesUsers } = useAdminUsers("SALES", !!isAdmin);
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const [typeFilter, setTypeFilter] = useState<"all" | AccountType>("all");
  const [salesFilter, setSalesFilter] = useState<string>("all");
  const [salesFilterOpen, setSalesFilterOpen] = useState(false);

  const sortedSalesUsers = useMemo(() => {
    if (!salesUsers?.length) return [];
    return [...salesUsers].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(
        `${b.firstName} ${b.lastName}`,
        "uk"
      )
    );
  }, [salesUsers]);

  const selectedSalesUser =
    salesFilter === "all"
      ? null
      : sortedSalesUsers.find((u) => u.id === salesFilter);

  const rowPredicate = useMemo(() => {
    return (acc: Account) => {
      if (typeFilter !== "all" && acc.type !== typeFilter) return false;
      if (isAdmin && salesFilter !== "all" && acc.ownerId !== salesFilter) return false;
      return true;
    };
  }, [typeFilter, salesFilter, isAdmin]);

  const filtersActive =
    typeFilter !== "all" || (isAdmin && salesFilter !== "all");

  const table = useTable({
    data: accounts,
    searchableFields: [
      "account",
      "type",
      "location",
      "operationalStatus",
      "warmUpStage",
      "owner.firstName",
      "owner.lastName",
      "owner.email",
      "accountCreatedAt",
    ],
    defaultSort: { column: "accountCreatedAt", direction: "desc" },
    predicate: rowPredicate,
    filtersActive,
  });

  useEffect(() => {
    table.setPage(1);
  }, [typeFilter, salesFilter]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [sheetAccount, setSheetAccount] = useState<Account | null>(null);
  const [adminTab, setAdminTab] = useState<"accounts" | "reports">("accounts");

  function handleOpenCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleOpenEdit(acc: Account) {
    setEditing(acc);
    setDialogOpen(true);
  }

  function handleSubmit(data: AccountFormPayload) {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      const payload: CreateAccountInput = {
        account: data.account,
        type: data.type,
        profileLinks: data.profileLinks,
        ownerId: data.ownerId,
        operationalStatus: data.operationalStatus,
        warmUpStage: data.warmUpStage,
        desktopType: data.desktopType,
        location: data.location,
        contactsCount: data.contactsCount,
        profileViewsCount: data.profileViewsCount,
        accountCreatedAt: data.accountCreatedAt,
      };
      if (data.description) {
        payload.description = data.description;
      }
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const accountsTabContent: ReactNode = (
    <>
      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
        isAdmin={!!isAdmin}
        salesUsers={salesUsers}
        isPending={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        placeholder="Пошук акаунтів..."
      >
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as "all" | AccountType)}
        >
          <SelectTrigger className="h-9 w-[148px] shrink-0">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі типи</SelectItem>
            <SelectItem value="UPWORK">Upwork</SelectItem>
            <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Popover open={salesFilterOpen} onOpenChange={setSalesFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={salesFilterOpen}
                className="h-9 w-[min(100%,240px)] max-w-[240px] shrink-0 justify-between px-3 font-normal"
              >
                <span className="truncate">
                  {salesFilter === "all"
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
                      data-checked={salesFilter === "all"}
                      onSelect={() => {
                        setSalesFilter("all");
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
      </TableToolbar>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="account" label="Акаунт" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="type" label="Тип" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader
                column="operationalStatus"
                label="Статус"
                sort={table.sort}
                onSort={table.toggleSort}
              />
              <TableHead className="hidden lg:table-cell text-muted-foreground">Конт. / перегл.</TableHead>
              {isAdmin && (
                <SortableHeader
                  column="owner.firstName"
                  label="Сейл"
                  sort={table.sort}
                  onSort={table.toggleSort}
                />
              )}
              <SortableHeader
                column="accountCreatedAt"
                label="Дата створення"
                sort={table.sort}
                onSort={table.toggleSort}
              />
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableBodySkeleton colSpan={isAdmin ? 7 : 6} />
            ) : !table.rows.length ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                  {table.isFiltered ? "Нічого не знайдено" : "Немає акаунтів"}
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((acc) => (
                <TableRow
                  key={acc.id}
                  className="cursor-pointer"
                  onClick={() => setSheetAccount(acc)}
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
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground tabular-nums">
                    {acc.type === "UPWORK" ? (
                      acc.profileViewsCount != null ? acc.profileViewsCount : "—"
                    ) : acc.contactsCount != null || acc.profileViewsCount != null ? (
                      <>
                        {acc.contactsCount ?? "—"} / {acc.profileViewsCount ?? "—"}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
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
                  )}
                  <TableCell className="tabular-nums">
                    {acc.accountCreatedAt
                      ? formatDateKyiv(acc.accountCreatedAt)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(acc)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(acc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={table.page}
        totalPages={table.totalPages}
        pageSize={table.pageSize}
        totalItems={table.totalItems}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />

      <AccountDetailSheet
        account={sheetAccount}
        open={!!sheetAccount}
        onOpenChange={(o) => !o && setSheetAccount(null)}
      />
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">
          {isAdmin && adminTab === "reports" ? "Звіти по акаунтах" : "Акаунти"}
        </h2>
        <div className="flex min-h-10 flex-wrap items-center gap-2">
          {isSales && <SubmitReportDialog />}
          <Button
            type="button"
            onClick={handleOpenCreate}
            className={cn(
              isAdmin && adminTab === "reports" && "invisible pointer-events-none"
            )}
            tabIndex={isAdmin && adminTab === "reports" ? -1 : undefined}
            aria-hidden={isAdmin && adminTab === "reports" ? true : undefined}
          >
            <Plus className="mr-2 size-4" />
            Додати
          </Button>
        </div>
      </div>

      {isAdmin ? (
        <Tabs
          value={adminTab}
          onValueChange={(v) => setAdminTab(v as "accounts" | "reports")}
          className="w-full min-w-0"
        >
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="accounts">Акаунти</TabsTrigger>
            <TabsTrigger value="reports">Звіти</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="mt-0 space-y-4 outline-none focus-visible:outline-none">
            {accountsTabContent}
          </TabsContent>
          <TabsContent value="reports" className="mt-0 outline-none focus-visible:outline-none">
            <AccountReportsPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">{accountsTabContent}</div>
      )}
    </div>
  );
}

function SubmitReportDialog() {
  const [open, setOpen] = useState(false);
  const mutation = useSubmitAccountReport();

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Send className="mr-2 size-4" />
        Надіслати звіт
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Надіслати звіт по акаунтах?</AlertDialogTitle>
            <AlertDialogDescription>
              Адміни отримають сповіщення в CRM і текст звіту в Telegram (якщо підключено). У звіт
              потраплять усі ваші акаунти в поточному стані.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                mutation.mutate(undefined, {
                  onSuccess: () => setOpen(false),
                });
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Надсилання…" : "Надіслати"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
