"use client";

import { useState } from "react";
import { useSummaries, useDeleteSummary } from "@/hooks/use-summaries";
import { useAuth } from "@/hooks/use-auth";
import { useTable } from "@/hooks/use-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TableToolbar,
  TablePagination,
  SortableHeader,
} from "@/components/ui/data-table-controls";
import { Trash2 } from "lucide-react";

const callTypeLabels: Record<string, string> = {
  HR: "HR",
  TECH: "Tech",
  CLIENT: "Client",
  PM: "PM",
  CLIENT_TECH: "Client Tech",
};

const outcomeLabels: Record<string, string> = {
  SUCCESS: "Успіх",
  UNSUCCESSFUL: "Неуспіх",
  PENDING: "Очікує",
};

function formatDuration(startedAt: string, endedAt: string | null | undefined) {
  if (!endedAt) return "—";
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const remaining = mins % 60;
  return hrs > 0 ? `${hrs}г ${remaining}хв` : `${remaining}хв`;
}

export function SummaryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteSummary();

  const { data: summaries, isLoading } = useSummaries();

  const colSpan = isAdmin ? 10 : 9;

  const table = useTable({
    data: summaries,
    searchableFields: [
      "company",
      "accountName",
      "callType",
      "interviewerName",
      "outcome",
      "devFeedback",
      "callerFirstName",
      "callerLastName",
      "notes",
    ],
    defaultSort: { column: "callStartedAt", direction: "desc" },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Підсумки</h2>

      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        placeholder="Пошук підсумків..."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="company" label="Компанія" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader
                column="interviewerName"
                label="Інтерв'юер"
                sort={table.sort}
                onSort={table.toggleSort}
              />
              <SortableHeader column="callType" label="Тип" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="accountName" label="Акаунт" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>DEV</TableHead>
              <SortableHeader column="callStartedAt" label="Тривалість" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="outcome" label="Результат" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>Наступний етап</TableHead>
              <TableHead>DEV Фідбек</TableHead>
              {isAdmin && <TableHead className="w-14" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : !table.rows.length ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                  {table.isFiltered ? "Нічого не знайдено" : "Немає завершених дзвінків"}
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.company}</TableCell>
                  <TableCell>{s.interviewerName?.trim() || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{callTypeLabels[s.callType]}</Badge>
                  </TableCell>
                  <TableCell>{s.accountName || "—"}</TableCell>
                  <TableCell>
                    {s.callerFirstName} {s.callerLastName}
                  </TableCell>
                  <TableCell>
                    {formatDuration(s.callStartedAt, s.callEndedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.outcome === "SUCCESS"
                          ? "default"
                          : s.outcome === "UNSUCCESSFUL"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {outcomeLabels[s.outcome]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.nextStep ? callTypeLabels[s.nextStep] : "—"}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {s.devFeedback || "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити підсумок?</AlertDialogTitle>
            <AlertDialogDescription>
              Запис буде видалено з історії. Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteId) return;
                deleteMutation.mutate(deleteId, {
                  onSuccess: () => setDeleteId(null),
                });
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Видалення..." : "Видалити"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
