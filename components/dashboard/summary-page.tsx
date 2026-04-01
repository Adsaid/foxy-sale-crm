"use client";

import { useState, useCallback } from "react";
import { useSummaries, useDeleteSummary } from "@/hooks/use-summaries";
import { useAuth } from "@/hooks/use-auth";
import { useTable } from "@/hooks/use-table";
import { summaryService } from "@/services/summary-service";
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
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { CallDetailSheet } from "@/components/sheets/call-detail-sheet";
import { formatCallTableDateTime } from "@/lib/date-kyiv";
import { callerRoleShortEn } from "@/lib/roles";
import type { CallEvent } from "@/types/crm";

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
  CANCELLED: "Скасовано",
  PENDING: "Очікує",
};

function formatDateTime(value: string) {
  return formatCallTableDateTime(value);
}

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
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const showTransfer = isAdmin || user?.role === "SALES";
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteSummary();
  const [sheetCall, setSheetCall] = useState<CallEvent | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const handleRowClick = useCallback(async (summaryId: string) => {
    setSheetLoading(true);
    setSheetCall(null);
    try {
      const call = await summaryService.getDetailForSheet(summaryId);
      setSheetCall(call);
    } catch {
      setSheetLoading(false);
    } finally {
      setSheetLoading(false);
    }
  }, []);

  const { data: summaries, isLoading } = useSummaries();

  const colSpan = isAdmin ? 13 : 10;

  const table = useTable({
    data: summaries,
    searchableFields: [
      "company",
      "accountName",
      "accountType",
      "callType",
      "interviewerName",
      "outcome",
      "devFeedback",
      "callerFirstName",
      "callerLastName",
      "createdByName",
      "transferredByName",
      "transferredReason",
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
              {isAdmin && (
                <SortableHeader
                  column="createdByName"
                  label="Сейл"
                  sort={table.sort}
                  onSort={table.toggleSort}
                />
              )}
              <TableHead>Dev/Design</TableHead>
              {isAdmin && (
                <SortableHeader
                  column="callCreatedAt"
                  label="Створено"
                  sort={table.sort}
                  onSort={table.toggleSort}
                />
              )}
              {showTransfer && <TableHead>Дія</TableHead>}
              <SortableHeader column="callStartedAt" label="Тривалість" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="outcome" label="Результат" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>Наступний етап</TableHead>
              <TableHead>Фідбек виконавця</TableHead>
              {isAdmin && <TableHead className="w-14" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableBodySkeleton colSpan={colSpan} />
            ) : !table.rows.length ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                  {table.isFiltered ? "Нічого не знайдено" : "Немає завершених дзвінків"}
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(s.id)}
                >
                  <TableCell className="font-medium">{s.company}</TableCell>
                  <TableCell>{s.interviewerName?.trim() || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{callTypeLabels[s.callType]}</Badge>
                  </TableCell>
                  <TableCell>
                    {s.accountName ? (
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">{s.accountName}</span>
                        <AccountTypeBadge type={s.accountType} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {s.createdByName && s.createdByName !== "—" ? (
                        <ManagerBadge
                          name={s.createdByName}
                          bgColor={s.createdByBadgeBgColor}
                          textColor={s.createdByBadgeTextColor}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-row flex-wrap items-center gap-1.5">
                      <span className="font-medium">
                        {s.callerFirstName} {s.callerLastName}
                      </span>
                      {s.callerRole ? (
                        <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px]">
                          {callerRoleShortEn(s.callerRole)}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {s.callCreatedAt ? formatDateTime(s.callCreatedAt) : "—"}
                    </TableCell>
                  )}
                  {showTransfer && (
                    <TableCell>
                      {s.isTransferred ? (
                        <span className="text-sm font-bold text-destructive">
                          Перенесено
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {formatDuration(s.callStartedAt, s.callEndedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.outcome === "SUCCESS"
                          ? "default"
                          : s.outcome === "UNSUCCESSFUL" || s.outcome === "CANCELLED"
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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

      <CallDetailSheet
        call={sheetCall}
        open={sheetLoading || !!sheetCall}
        onOpenChange={(o) => {
          if (!o) {
            setSheetCall(null);
            setSheetLoading(false);
          }
        }}
        isLoading={sheetLoading}
      />
    </div>
  );
}
