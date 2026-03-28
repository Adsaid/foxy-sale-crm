"use client";

import { useState } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { AccountOperationalStatusBadge } from "@/components/ui/account-operational-status-badge";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { AccountDialog } from "@/components/dialogs/account-dialog";
import { AccountDetailSheet } from "@/components/sheets/account-detail-sheet";
import {
  TableToolbar,
  TablePagination,
  SortableHeader,
} from "@/components/ui/data-table-controls";
import type { Account, AccountFormPayload, CreateAccountInput } from "@/types/crm";

export function AccountsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { data: accounts, isLoading } = useAccounts();
  const { data: salesUsers } = useAdminUsers("SALES", !!isAdmin);
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

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
  });

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
      />

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
                  label="Менеджер"
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
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="text-center">
                  Завантаження...
                </TableCell>
              </TableRow>
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
