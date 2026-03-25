"use client";

import { useState } from "react";
import { useAdminUsers, useUpdateUser, useChangePassword } from "@/hooks/use-admin-users";
import { useTable } from "@/hooks/use-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, KeyRound } from "lucide-react";
import { UserEditDialog } from "@/components/dialogs/user-edit-dialog";
import { PasswordDialog } from "@/components/dialogs/password-dialog";
import {
  TableToolbar,
  TablePagination,
  SortableHeader,
} from "@/components/ui/data-table-controls";
import type { AdminUser } from "@/types/crm";

const roleLabels: Record<string, string> = {
  SALES: "Менеджер",
  DEV: "Розробник",
};

const specLabels: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
};

export function UsersPage() {
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const { data: users, isLoading } = useAdminUsers(roleFilter);
  const updateMutation = useUpdateUser();
  const passwordMutation = useChangePassword();

  const table = useTable({
    data: users,
    searchableFields: ["firstName", "lastName", "email", "role", "specialization"],
    defaultSort: { column: "createdAt", direction: "desc" },
  });

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Керування користувачами</h2>
      </div>

      <UserEditDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        isPending={updateMutation.isPending}
        onSubmit={(data) => {
          if (!editUser) return;
          updateMutation.mutate(
            { id: editUser.id, data },
            { onSuccess: () => setEditUser(null) }
          );
        }}
      />

      <PasswordDialog
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        isPending={passwordMutation.isPending}
        onSubmit={(password) => {
          if (!passwordUser) return;
          passwordMutation.mutate(
            { id: passwordUser.id, password },
            { onSuccess: () => setPasswordUser(null) }
          );
        }}
      />

      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        placeholder="Пошук користувачів..."
      >
        <Select
          value={roleFilter ?? "ALL"}
          onValueChange={(v) => setRoleFilter(v === "ALL" ? undefined : v)}
        >
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Всі ролі</SelectItem>
            <SelectItem value="SALES">Менеджери</SelectItem>
            <SelectItem value="DEV">Розробники</SelectItem>
          </SelectContent>
        </Select>
      </TableToolbar>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="firstName" label="Ім'я" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="email" label="Email" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="role" label="Роль" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="specialization" label="Спеціалізація" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>Технології</TableHead>
              <SortableHeader column="createdAt" label="Створено" sort={table.sort} onSort={table.toggleSort} />
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : !table.rows.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {table.isFiltered ? "Нічого не знайдено" : "Немає користувачів"}
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabels[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.specialization ? specLabels[u.specialization] ?? u.specialization : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.technologies.length > 0
                        ? u.technologies.map((t) => (
                            <Badge key={t.id} variant="outline">
                              {t.name}
                            </Badge>
                          ))
                        : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(u.createdAt).toLocaleDateString("uk-UA")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditUser(u)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPasswordUser(u)}
                      >
                        <KeyRound className="size-4" />
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
    </div>
  );
}
