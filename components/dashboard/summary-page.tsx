"use client";

import { useMemo } from "react";
import { useCalls } from "@/hooks/use-calls";
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
import {
  TableToolbar,
  TablePagination,
  SortableHeader,
} from "@/components/ui/data-table-controls";

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
  const { data: calls, isLoading } = useCalls();
  const completedCalls = useMemo(
    () => calls?.filter((c) => c.status === "COMPLETED") ?? [],
    [calls]
  );

  const table = useTable({
    data: completedCalls,
    searchableFields: ["company", "callType", "outcome", "devFeedback", "notes"],
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
              <TableHead>Акаунт</TableHead>
              <SortableHeader column="callType" label="Тип" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>DEV</TableHead>
              <SortableHeader column="callStartedAt" label="Тривалість" sort={table.sort} onSort={table.toggleSort} />
              <SortableHeader column="outcome" label="Результат" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>Наступний етап</TableHead>
              <TableHead>DEV Фідбек</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Завантаження...
                </TableCell>
              </TableRow>
            ) : !table.rows.length ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {table.isFiltered ? "Нічого не знайдено" : "Немає завершених дзвінків"}
                </TableCell>
              </TableRow>
            ) : (
              table.rows.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-medium">{call.company}</TableCell>
                  <TableCell>{call.account?.account ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{callTypeLabels[call.callType]}</Badge>
                  </TableCell>
                  <TableCell>
                    {call.caller
                      ? `${call.caller.firstName} ${call.caller.lastName}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {formatDuration(call.callStartedAt, call.callEndedAt)}
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
                  <TableCell>
                    {call.nextStep ? callTypeLabels[call.nextStep] : "—"}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {call.devFeedback || "—"}
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
