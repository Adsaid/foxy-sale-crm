"use client";

import { useState, useMemo, useEffect } from "react";
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
import { ChevronsUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { AccountDialog } from "@/components/dialogs/account-dialog";
import { AccountDetailSheet } from "@/components/sheets/account-detail-sheet";
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

export function AccountsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
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
    ],
    defaultSort: { column: "createdAt", direction: "desc" },
    predicate: rowPredicate,
    filtersActive,
  });

  useEffect(() => {
    table.setPage(1);
  }, [typeFilter, salesFilter]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [sheetAccount, setSheetAccount] = useState<Account | null>(null);

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
      };
      if (data.description) {
        payload.description = data.description;
      }
      createMutation.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Акаунти</h2>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 size-4" />
          Додати
        </Button>
      </div>

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
              <SortableHeader column="createdAt" label="Створено" sort={table.sort} onSort={table.toggleSort} />
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
                    {acc.contactsCount != null || acc.profileViewsCount != null ? (
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
                  <TableCell>
                    {new Date(acc.createdAt).toLocaleDateString("uk-UA")}
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
    </div>
  );
}
