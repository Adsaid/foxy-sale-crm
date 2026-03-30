"use client";

import { useEffect, useState } from "react";
import {
  useAdminInvitations,
  useApproveUser,
  useCreateInvitation,
  useDeleteInvitation,
  usePendingUsers,
} from "@/hooks/use-admin-users";
import { Button } from "@/components/ui/button";
import { InvitationCreateDialog } from "@/components/dialogs/invitation-create-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableBodySkeleton } from "@/components/ui/table-body-skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDateKyiv } from "@/lib/date-kyiv";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  SALES: "Сейл",
  DEV: "Розробник",
};

export function UsersRequestsTab() {
  const { data: pending, isLoading: pendingLoading } = usePendingUsers();
  const { data: invitations, isLoading: invLoading } = useAdminInvitations();
  const createInv = useCreateInvitation();
  const approve = useApproveUser();
  const deleteInv = useDeleteInvitation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin);
  }, []);

  function registrationLink(code: string) {
    return `${baseUrl}/register?code=${encodeURIComponent(code)}`;
  }

  async function copyLink(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(registrationLink(code));
      setCopiedId(id);
      toast.success("Посилання скопійовано");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Не вдалося скопіювати");
    }
  }

  function handleCreateInvite(data: { email: string; role: "SALES" | "DEV" }) {
    createInv.mutate(data, {
      onSuccess: () => setInviteOpen(false),
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Заявки на доступ</h3>
        <p className="text-sm text-muted-foreground">
          Користувачі, які зареєструвалися без запрошення, очікують підтвердження.
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ім&apos;я</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Дата реєстрації</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingLoading ? (
                <TableBodySkeleton colSpan={5} />
              ) : !pending?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Немає заявок
                  </TableCell>
                </TableRow>
              ) : (
                pending.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{roleLabels[u.role] ?? u.role}</Badge>
                    </TableCell>
                    <TableCell>{formatDateKyiv(u.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => approve.mutate(u.id)}
                        disabled={approve.isPending}
                      >
                        Підтвердити
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Запрошення</h3>
            <p className="text-sm text-muted-foreground">
              Створіть посилання на реєстрацію з кодом та вказаною роллю.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            Створити запрошення
          </Button>
        </div>
        {!process.env.NEXT_PUBLIC_BASE_URL && (
          <p className="text-xs text-muted-foreground">
            Для стабільних посилань у проді задайте змінну{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_BASE_URL</code>.
          </p>
        )}
      </section>

      <InvitationCreateDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        isPending={createInv.isPending}
        onSubmit={handleCreateInvite}
      />

      <section className="space-y-3">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Створив</TableHead>
                <TableHead>Створено</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invLoading ? (
                <TableBodySkeleton colSpan={6} />
              ) : !invitations?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Ще немає запрошень
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((inv) => {
                  const used = !!inv.usedAt;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[inv.role] ?? inv.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {inv.createdBy.firstName} {inv.createdBy.lastName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateKyiv(inv.createdAt)}
                      </TableCell>
                      <TableCell>
                        {used ? (
                          <span className="text-sm text-muted-foreground">
                            Використано
                            {inv.usedAt ? ` · ${formatDateKyiv(inv.usedAt)}` : ""}
                          </span>
                        ) : (
                          <Badge variant="secondary">Активне</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {!used && baseUrl ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => copyLink(inv.code, inv.id)}
                            >
                              {copiedId === inv.id ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                              Копіювати
                            </Button>
                          ) : null}
                          {!used ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteId(inv.id)}
                              title="Видалити запрошення"
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити запрошення?</AlertDialogTitle>
            <AlertDialogDescription>
              Запрошення буде видалено назавжди. Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteId) return;
                deleteInv.mutate(deleteId, {
                  onSuccess: () => setDeleteId(null),
                });
              }}
              disabled={deleteInv.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInv.isPending ? "Видалення..." : "Видалити"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
