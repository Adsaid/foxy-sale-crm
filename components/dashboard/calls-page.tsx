"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useCalls,
  useCreateCall,
  useUpdateCall,
  useDeleteCall,
  useAdvanceCallStage,
  useCompleteCall,
} from "@/hooks/use-calls";
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
  Pencil,
  Plus,
  CheckCircle,
  Trash2,
  Clock,
  CalendarDays,
  StepForward,
  Video,
  Banknote,
} from "lucide-react";
import { CallCreateDialog } from "@/components/dialogs/call-create-dialog";
import { CallEditDialog } from "@/components/dialogs/call-edit-dialog";
import { CallCompleteDialog } from "@/components/dialogs/call-complete-dialog";
import { CallNextStageDialog } from "@/components/dialogs/call-next-stage-dialog";
import { CallDetailSheet } from "@/components/sheets/call-detail-sheet";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  TableToolbar,
  TablePagination,
  SortableHeader,
} from "@/components/ui/data-table-controls";
import type { CallEvent } from "@/types/crm";
import { cn } from "@/lib/utils";

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

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeUntil(dateStr: string, nowMs: number) {
  const diff = new Date(dateStr).getTime() - nowMs;
  if (diff < 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  const secs = totalSeconds % 60;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `через ${mins}хв ${secs}с`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `через ${hrs}г ${remainMins}хв ${secs}с`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return undefined;
  const intVal = Number.parseInt(normalized, 16);
  if (Number.isNaN(intVal)) return undefined;
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Мінімальна «цільова» ширина картки; фактична = min(контейнер каруселі, це значення) — скільки влізе в ряд, стільки й видно. */
const TODAY_CALLS_SLIDE_CLASS = "basis-[min(100%,32rem)]";

/** На мобільних мінімальна висота слайдів (без стрибків стрілок між картками). */
const TODAY_CALLS_CAROUSEL_ITEM_CLASS = cn(
  TODAY_CALLS_SLIDE_CLASS,
  "flex max-md:min-h-[19.6rem]"
);

interface TodayCallCardProps {
  call: CallEvent;
  isSalesLike: boolean;
  showCreatedBy: boolean;
  nowMs: number;
  onEdit: (call: CallEvent) => void;
  onComplete: (id: string) => void;
  canComplete: boolean;
  /** Розтягнути картку по висоті батька (карусель з min-height). */
  fillHeight?: boolean;
  /** Клік по картці (крім кнопок і зовнішніх посилань) — наприклад відкрити sheet з деталями. */
  onOpenDetails?: () => void;
}

function TodayCallCard({
  call,
  isSalesLike,
  showCreatedBy,
  nowMs,
  onEdit,
  onComplete,
  canComplete,
  fillHeight = false,
  onOpenDetails,
}: TodayCallCardProps) {
  const timeUntil = getTimeUntil(call.callStartedAt, nowMs);
  const isPast = new Date(call.callStartedAt) <= new Date();
  const isCompleted = call.status === "COMPLETED";
  const isCancelled = call.status === "CANCELLED";
  const isActive = !isCompleted && !isCancelled;
  const accentBg = call.createdBy?.badgeBgColor ?? "#EEF2FF";
  const accentText = call.createdBy?.badgeTextColor ?? "#3730A3";
  const cardStyle =
    !isCompleted && !isCancelled && call.createdBy && showCreatedBy
      ? {
          backgroundColor: hexToRgba(accentBg, 0.4) ?? accentBg,
          borderColor: hexToRgba(accentText, 0.7) ?? accentText,
        }
      : undefined;

  const linkHref = call.callLink?.trim();
  const showSalary =
    call.salaryFrom != null || call.salaryTo != null;
  const showMetaBlock = !!(linkHref || showSalary);

  const participantLabelClass =
    "text-[10px] font-medium uppercase tracking-wide text-muted-foreground";

  return (
    <div
      role={onOpenDetails ? "button" : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      aria-label={onOpenDetails ? `Деталі дзвінка: ${call.company}` : undefined}
      onClick={onOpenDetails ? () => onOpenDetails() : undefined}
      onKeyDown={
        onOpenDetails
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenDetails();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-xl border p-3",
        onOpenDetails && "cursor-pointer transition-[box-shadow,transform] hover:bg-muted/20 hover:shadow-sm active:scale-[0.99]",
        fillHeight && "flex h-full min-h-0 flex-col",
        isCompleted && "opacity-50 bg-muted/30",
        isCancelled && "opacity-30"
      )}
      style={cardStyle}
    >
      <div
        className={cn(
          "flex flex-col gap-2.5",
          fillHeight && "min-h-0 flex-1"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 ring-1 ring-border/40">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-lg font-bold tabular-nums leading-none tracking-tight">
                {formatTime(call.callStartedAt)}
              </span>
            </span>
            {isActive && timeUntil && (
              <span className="inline-flex min-w-[6rem] justify-center rounded-md bg-primary/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/15">
                {timeUntil}
              </span>
            )}
            {isActive && isPast && !call.callEndedAt && (
              <span className="rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900/50">
                Йде зараз
              </span>
            )}
            {isCompleted && (
              <Badge variant="secondary" className="h-6 px-2 text-xs font-medium">
                Завершено
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center">
            {isSalesLike && isActive && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Редагувати"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(call);
                }}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {!isSalesLike && canComplete && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Завершити"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(call.id);
                }}
              >
                <CheckCircle className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-stretch sm:gap-x-0">
          <div className="min-w-0 space-y-1.5 sm:col-span-4 sm:pr-2">
            <h3 className="font-heading w-full min-w-0 break-words text-base font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
              {call.company}
            </h3>
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5">
              <Badge variant="outline" className="h-6 w-fit max-w-full shrink-0 px-2 text-xs font-medium">
                {callTypeLabels[call.callType]}
              </Badge>
              {showCreatedBy && call.createdBy && (
                <ManagerBadge
                  name={`${call.createdBy.firstName} ${call.createdBy.lastName}`}
                  bgColor={call.createdBy.badgeBgColor}
                  textColor={call.createdBy.badgeTextColor}
                  className="h-auto min-h-6 max-w-full min-w-0 shrink py-0.5 text-xs leading-tight whitespace-normal sm:text-sm"
                />
              )}
            </div>
          </div>

          <div
            className={cn(
              "min-w-0 border-t border-border/60 pt-3 sm:border-t-0 sm:border-l sm:border-border/60 sm:pt-0 sm:pl-5",
              showMetaBlock ? "sm:col-span-4" : "sm:col-span-8"
            )}
          >
            <div className="flex flex-col gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className={participantLabelClass}>Інтерв&apos;юер</p>
                <p className="text-sm font-medium leading-snug text-foreground">{call.interviewerName}</p>
              </div>
              {isSalesLike && call.caller && (
                <div className="min-w-0 space-y-0.5">
                  <p className={participantLabelClass}>DEV</p>
                  <p className="text-sm font-medium leading-snug text-foreground">
                    {call.caller.firstName} {call.caller.lastName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {showMetaBlock && (
            <div
              className={cn(
                "flex flex-col justify-center gap-2.5 border-t border-border/60 pt-3 text-sm sm:col-span-4",
                "sm:border-t-0 sm:border-l sm:border-border/60 sm:pt-0 sm:pl-5"
              )}
            >
              {linkHref && (
                <a
                  href={linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-semibold text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Video className="size-4" />
                  </span>
                  Відкрити дзвінок
                </a>
              )}
              {showSalary && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Banknote className="size-4 opacity-80" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[11px] font-medium leading-none text-muted-foreground">Зарплата ($)</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                      {call.salaryFrom != null ? call.salaryFrom : "—"}
                      {call.salaryTo != null ? ` – ${call.salaryTo}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CallsPage() {
  const { user } = useAuth();
  const isSalesLike = user?.role === "SALES" || user?.role === "ADMIN";
  const showCreatedByColumn = user?.role === "DEV" || user?.role === "ADMIN";

  const { data: calls, isLoading } = useCalls();
  const createMutation = useCreateCall();
  const updateMutation = useUpdateCall();
  const deleteMutation = useDeleteCall();
  const advanceStageMutation = useAdvanceCallStage();
  const completeMutation = useCompleteCall();

  const todayCalls = useMemo(() => {
    if (!calls) return [];
    return calls
      .filter((c) => isToday(c.callStartedAt))
      .sort((a, b) => new Date(a.callStartedAt).getTime() - new Date(b.callStartedAt).getTime());
  }, [calls]);

  const table = useTable({
    data: calls,
    searchableFields: [
      "company",
      "interviewerName",
      "callType",
      "account.account",
      "account.type",
      "createdBy.firstName",
      "createdBy.lastName",
      "createdBy.email",
      "status",
      "outcome",
      "notes",
    ],
    defaultSort: { column: "callStartedAt", direction: "desc" },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editCall, setEditCall] = useState<CallEvent | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [nextStageCall, setNextStageCall] = useState<CallEvent | null>(null);
  const [sheetCall, setSheetCall] = useState<CallEvent | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  function canComplete(callStartedAt: string, callEndedAt: string | null | undefined) {
    if (callEndedAt) return false;
    return new Date() >= new Date(callStartedAt);
  }

  const colSpan = (isSalesLike ? 11 : 9) + (showCreatedByColumn ? 1 : 0);

  function canAdvanceToNextStage(call: CallEvent) {
    return call.status === "COMPLETED" && call.outcome === "SUCCESS";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Дзвінки</h2>
        {isSalesLike && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Створити
          </Button>
        )}
      </div>

      {isSalesLike && (
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
          <CallNextStageDialog
            call={nextStageCall}
            onClose={() => setNextStageCall(null)}
            isPending={advanceStageMutation.isPending}
            onSubmit={(data) => {
              if (!nextStageCall) return;
              advanceStageMutation.mutate(
                { id: nextStageCall.id, data },
                { onSuccess: () => setNextStageCall(null) }
              );
            }}
          />
        </>
      )}

      {!isSalesLike && (
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

      {/* Today's calls */}
      {todayCalls.length > 0 && (
        <Carousel
          opts={{ align: "start", loop: false }}
          className="w-full"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <h3 className="text-sm font-semibold">
              Дзвінки на сьогодні
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({todayCalls.length})
              </span>
            </h3>
          </div>
          <div className="mt-3 flex items-center gap-3 sm:gap-4">
            {todayCalls.length > 1 && (
              <CarouselPrevious
                hideWhenDisabled
                variant="outline"
                size="icon-sm"
                className="static z-10 shrink-0 translate-y-0 bg-background shadow-sm"
              />
            )}
            <div className="min-w-0 min-h-0 flex-1 max-md:pl-1 max-md:pr-3">
              <CarouselContent>
                {todayCalls.map((call) => (
                  <CarouselItem key={call.id} className={TODAY_CALLS_CAROUSEL_ITEM_CLASS}>
                    <div className="flex h-full w-full min-w-0 flex-col">
                      <TodayCallCard
                        fillHeight
                        call={call}
                        isSalesLike={isSalesLike}
                        showCreatedBy={showCreatedByColumn || user?.role === "SALES"}
                        nowMs={nowMs}
                        onEdit={setEditCall}
                        onComplete={setCompleteId}
                        canComplete={canComplete(call.callStartedAt, call.callEndedAt)}
                        onOpenDetails={() => setSheetCall(call)}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </div>
            {todayCalls.length > 1 && (
              <CarouselNext
                hideWhenDisabled
                variant="outline"
                size="icon-sm"
                className="static z-10 shrink-0 translate-y-0 bg-background shadow-sm"
              />
            )}
          </div>
        </Carousel>
      )}

      {/* All calls table */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Всі дзвінки</h3>

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
                <SortableHeader
                  column="account.account"
                  label="Акаунт"
                  sort={table.sort}
                  onSort={table.toggleSort}
                />
                {showCreatedByColumn && (
                  <SortableHeader
                    column="createdBy.firstName"
                    label="Менеджер"
                    sort={table.sort}
                    onSort={table.toggleSort}
                  />
                )}
                {isSalesLike && <TableHead>DEV</TableHead>}
                <SortableHeader column="callStartedAt" label="Дата" sort={table.sort} onSort={table.toggleSort} />
                <SortableHeader column="status" label="Статус" sort={table.sort} onSort={table.toggleSort} />
                <SortableHeader column="outcome" label="Результат" sort={table.sort} onSort={table.toggleSort} />
              <TableHead>Нотатки</TableHead>
              {isSalesLike && <TableHead className="w-28 text-center">Наступний етап</TableHead>}
              <TableHead className="w-20" />
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
                  <TableRow
                    key={call.id}
                    className="cursor-pointer"
                    onClick={() => setSheetCall(call)}
                  >
                    <TableCell className="font-medium">{call.company}</TableCell>
                    <TableCell>{call.interviewerName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{callTypeLabels[call.callType]}</Badge>
                    </TableCell>
                    <TableCell>
                      {call.account ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{call.account.account}</span>
                          <AccountTypeBadge type={call.account.type} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {showCreatedByColumn && (
                      <TableCell>
                        {call.createdBy
                          ? (
                            <ManagerBadge
                              name={`${call.createdBy.firstName} ${call.createdBy.lastName}`}
                              bgColor={call.createdBy.badgeBgColor}
                              textColor={call.createdBy.badgeTextColor}
                            />
                          )
                          : "—"}
                      </TableCell>
                    )}
                    {isSalesLike && (
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
                    {isSalesLike && (
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        {canAdvanceToNextStage(call) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setNextStageCall(call)}
                          >
                            <StepForward className="size-3.5" />
                            Далі
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {isSalesLike ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditCall(call)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteId(call.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити дзвінок?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Дзвінок буде видалено назавжди.
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

      <CallDetailSheet
        call={sheetCall}
        open={!!sheetCall}
        onOpenChange={(o) => !o && setSheetCall(null)}
      />
    </div>
  );
}
