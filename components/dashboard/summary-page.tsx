"use client";

import { useSummaries } from "@/hooks/use-summaries";
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
  const { data: summaries, isLoading } = useSummaries();

  const table = useTable({
    data: summaries,
    searchableFields: ["company", "accountName", "callType", "outcome", "devFeedback", "callerFirstName", "callerLastName", "notes"],
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
              <SortableHeader column="accountName" label="Акаунт" sort={table.sort} onSort={table.toggleSort} />
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
              table.rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.company}</TableCell>
                  <TableCell>{s.accountName || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{callTypeLabels[s.callType]}</Badge>
                  </TableCell>
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
