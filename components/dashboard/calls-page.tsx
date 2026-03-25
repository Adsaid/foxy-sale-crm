"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCalls, useCreateCall, useUpdateCall, useCompleteCall } from "@/hooks/use-calls";
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
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, CheckCircle } from "lucide-react";
import { CallCreateDialog } from "@/components/dialogs/call-create-dialog";
import { CallEditDialog } from "@/components/dialogs/call-edit-dialog";
import { CallCompleteDialog } from "@/components/dialogs/call-complete-dialog";
import {
  TableToolbar,
  TablePagination,
  SortableHeader,
} from "@/components/ui/data-table-controls";
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
  PENDING: "Очікує",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Заплановано",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

export function CallsPage() {
  const { user } = useAuth();
  const isSales = user?.role === "SALES";

  const { data: calls, isLoading } = useCalls();
  const createMutation = useCreateCall();
  const updateMutation = useUpdateCall();
  const completeMutation = useCompleteCall();

  const table = useTable({
    data: calls,
    searchableFields: ["company", "interviewerName", "callType", "status", "outcome", "notes"],
    defaultSort: { column: "callStartedAt", direction: "desc" },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editCall, setEditCall] = useState<CallEvent | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);

  function canComplete(callStartedAt: string, callEndedAt: string | null | undefined) {
    if (callEndedAt) return false;
    return new Date() >= new Date(callStartedAt);
  }

  const colSpan = isSales ? 9 : 8;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Дзвінки</h2>
        {isSales && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Створити
          </Button>
        )}
      </div>

      {isSales && (
        <>
          <CallCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            isPending={createMutation.isPending}
            onSubmit={(data) => {
              createMutation.mutate(data, { onSuccess: () => setCreateOpen(false) });
            }}
          />
          <CallEditDialog
            call={editCall}
            onClose={() => setEditCall(null)}
            isPending={updateMutation.isPending}
            onSubmit={(data) => {
              if (!editCall) return;
              updateMutation.mutate(
                { id: editCall.id, data },
                { onSuccess: () => setEditCall(null) }
              );
            }}
          />
        </>
      )}

      {!isSales && (
        <CallCompleteDialog
          open={!!completeId}
          onOpenChange={(o) => !o && setCompleteId(null)}
          isPending={completeMutation.isPending}
          onSubmit={(devFeedback) => {
            if (!completeId) return;
            completeMutation.mutate(
              { id: completeId, data: { devFeedback } },
              { onSuccess: () => setCompleteId(null) }
            );
          }}
        />
      )}

      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        placeholder="Пошук дзвінків..."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="company" label="Компанія" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="interviewerName" label="Інтерв'юер" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="callType" label="Тип" sort={table.sort} onSort={table.toggleSort} />
              {isSales && <TableHead>DEV</TableHead>}
              <SortableHeader column="callStartedAt" label="Дата" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="status" label="Статус" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="outcome" label="Результат" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>Нотатки</TableHead>
              <TableHead className="w-12" />
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
                  {table.isFiltered ? "Нічого не знайдено" : "Немає дзвінків"}
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-medium">{call.company}</TableCell>
                  <TableCell>{call.interviewerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{callTypeLabels[call.callType]}</Badge>
                  </TableCell>
                  {isSales && (
                    <TableCell>
                      {call.caller
                        ? `${call.caller.firstName} ${call.caller.lastName}`
                        : "—"}
                    </TableCell>
                  )}
                  <TableCell>
                    {new Date(call.callStartedAt).toLocaleString("uk-UA", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{statusLabels[call.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        call.outcome === "SUCCESS"
                          ? "default"
                          : call.outcome === "UNSUCCESSFUL"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {outcomeLabels[call.outcome]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {call.notes || "—"}
                  </TableCell>
                  <TableCell>
                    {isSales ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditCall(call)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    ) : (
                      canComplete(call.callStartedAt, call.callEndedAt) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setCompleteId(call.id)}
                        >
                          <CheckCircle className="size-4" />
                        </Button>
                      )
                    )}
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
