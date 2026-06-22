"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmojiTextareaField } from "@/components/ui/emoji-textarea-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Building2, User, Clock, MessageSquare, ChevronsUpDown } from "lucide-react";
import type { CallEvent, CallStatus, CallOutcome, UpdateCallInput } from "@/types/crm";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDevs } from "@/hooks/use-devs";
import { assigneeSpecLabelsUk } from "@/lib/roles";
import {
  defaultPlannedDurationLabelUk,
  defaultPlannedEndIso,
  resolveFormPlannedEndIso,
  shiftPlannedEndByStartChange,
} from "@/lib/call-planned-end";
import { AssigneeOptionContent } from "@/components/ui/assignee-option-content";

const callTypeLabels: Record<string, string> = {
  HR: "HR",
  TECH: "Tech",
  CLIENT: "Client",
  PM: "PM",
  CLIENT_TECH: "Client Tech",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Заплановано",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

const outcomeLabels: Record<string, string> = {
  SUCCESS: "Успіх",
  UNSUCCESSFUL: "Неуспіх",
  PENDING: "Очікує",
  CANCELLED: "Скасовано",
};

interface CallEditFormProps {
  call: CallEvent;
  isPending: boolean;
  onSubmit: (data: UpdateCallInput) => void;
}

export function CallEditForm({ call, isPending, onSubmit }: CallEditFormProps) {
  const initialEndManuallySet =
    !!call.callEndedAt &&
    !!call.callStartedAt &&
    new Date(call.callEndedAt).getTime() !==
      new Date(defaultPlannedEndIso(call.callStartedAt, call.callType)).getTime();

  const [form, setForm] = useState({
    status: call.status,
    outcome: call.outcome,
    callStartedAt: call.callStartedAt,
    callEndedAt: initialEndManuallySet ? (call.callEndedAt ?? "") : "",
    expectedFeedbackDate: call.expectedFeedbackDate ?? "",
    notes: call.notes ?? "",
    salaryFrom: call.salaryFrom ?? 0,
    salaryTo: call.salaryTo as number | undefined,
    callLink: call.callLink ?? "",
    description: call.description ?? "",
  });

  const { data: devs, isLoading: devsLoading } = useDevs({
    enabled: form.status === "SCHEDULED",
  });

  const [callerId, setCallerId] = useState(call.callerId);
  const [devOpen, setDevOpen] = useState(false);
  const [specFilter, setSpecFilter] = useState("");

  const [markTransferred, setMarkTransferred] = useState(false);
  const [transferredReason, setTransferredReason] = useState("");
  const endManuallySetRef = useRef(initialEndManuallySet);

  const isRescheduled = useMemo(() => {
    const prev = new Date(call.callStartedAt).getTime();
    const next = new Date(form.callStartedAt).getTime();
    return prev !== next;
  }, [call.callStartedAt, form.callStartedAt]);

  useEffect(() => {
    // Если дата/час не змінені — прибираємо чекбокс
    if (!isRescheduled) setMarkTransferred(false);
  }, [isRescheduled]);

  useEffect(() => {
    // Якщо зняли чек — чистимо reason, щоб не відправляти зайві дані
    if (!markTransferred) setTransferredReason("");
  }, [markTransferred]);

  const isCompleted = form.status === "COMPLETED";
  const isCancelled = form.status === "CANCELLED";
  const isScheduled = form.status === "SCHEDULED";

  const hasEndBeforeStart = useMemo(() => {
    if (!isScheduled || !form.callStartedAt || !form.callEndedAt) return false;
    return new Date(form.callEndedAt).getTime() <= new Date(form.callStartedAt).getTime();
  }, [form.callEndedAt, form.callStartedAt, isScheduled]);

  const selectedDev = devs?.find((d) => d.id === callerId);
  const filteredDevs = devs?.filter((d) => {
    if (specFilter && d.specialization !== specFilter) return false;
    return true;
  });

  const headerDev = isScheduled
    ? selectedDev ?? call.caller ?? null
    : call.caller ?? null;

  function handleSubmit() {
    if (hasEndBeforeStart) return;
    onSubmit({
      status: form.status,
      outcome: form.outcome,
      callStartedAt: form.callStartedAt,
      ...(isScheduled && form.callStartedAt
        ? {
            callEndedAt: resolveFormPlannedEndIso(
              form.callStartedAt,
              form.callEndedAt,
              call.callType,
              endManuallySetRef.current,
            ),
          }
        : {}),
      expectedFeedbackDate: form.expectedFeedbackDate || null,
      notes: form.notes || null,
      salaryFrom: form.salaryFrom || undefined,
      salaryTo: form.salaryTo || null,
      callLink: form.callLink || null,
      description: form.description || null,
      transferred: markTransferred || undefined,
      transferredReason: markTransferred
        ? transferredReason.trim() || null
        : undefined,
      ...(isScheduled ? { callerId } : {}),
    });
  }

  return (
    <div className="min-w-0 space-y-4 py-2">
      <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{call.company}</span>
          <Badge variant="outline">{callTypeLabels[call.callType]}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {call.interviewerName}
          </span>
          {headerDev && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {headerDev.firstName} {headerDev.lastName}
            </span>
          )}
          {call.account && (
            <span className="flex flex-wrap items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              <span className="font-medium">{call.account.account}</span>
              <AccountTypeBadge type={call.account.type} />
            </span>
          )}
        </div>
      </div>

      <Separator />

      {isScheduled && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">
              Виконавець (розробник або дизайнер)
            </label>
            <div className="ml-auto flex max-w-[min(100%,14rem)] flex-wrap justify-end gap-1">
              <Badge
                variant={specFilter === "" ? "default" : "outline"}
                className="cursor-pointer px-1.5 py-0 text-[10px]"
                onClick={() => setSpecFilter("")}
              >
                Всі
              </Badge>
              {Object.entries(assigneeSpecLabelsUk).map(([k, v]) => (
                <Badge
                  key={k}
                  variant={specFilter === k ? "default" : "outline"}
                  className="cursor-pointer px-1.5 py-0 text-[10px]"
                  onClick={() => setSpecFilter(specFilter === k ? "" : k)}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </div>
          <Popover modal={false} open={devOpen} onOpenChange={setDevOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal">
                {selectedDev
                  ? `${selectedDev.firstName} ${selectedDev.lastName}`
                  : "Оберіть виконавця"}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[--radix-popover-trigger-width] max-w-[calc(100vw-1.5rem)] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Пошук виконавця..." />
                <CommandList>
                  {devsLoading ? (
                    <div className="space-y-2 p-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>Не знайдено</CommandEmpty>
                      <CommandGroup>
                        {filteredDevs?.map((d) => (
                          <CommandItem
                            key={d.id}
                            value={`${d.firstName} ${d.lastName} ${d.specialization ?? ""} ${d.technologies.map((t) => t.name).join(" ")}`}
                            data-checked={callerId === d.id}
                            onSelect={() => {
                              setCallerId(d.id);
                              setDevOpen(false);
                            }}
                          >
                            <AssigneeOptionContent dev={d} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Дата та час дзвінка</label>
        <DateTimePicker
          value={form.callStartedAt}
          onChange={(v) => {
            setForm((f) => {
              const next = { ...f, callStartedAt: v };
              if (isScheduled) {
                if (v && endManuallySetRef.current && f.callEndedAt && f.callStartedAt) {
                  next.callEndedAt = shiftPlannedEndByStartChange(
                    new Date(f.callStartedAt),
                    new Date(v),
                    new Date(f.callEndedAt),
                    call.callType,
                  ).toISOString();
                } else if (!endManuallySetRef.current) {
                  next.callEndedAt = "";
                }
              }
              return next;
            });
          }}
        />
      </div>

      {isScheduled && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Орієнтовне завершення</label>
          <DateTimePicker
            value={form.callEndedAt}
            onChange={(v) => {
              endManuallySetRef.current = true;
              setForm((f) => ({ ...f, callEndedAt: v }));
            }}
            placeholder={`За замовчуванням ${defaultPlannedDurationLabelUk(call.callType)}`}
          />
          {hasEndBeforeStart && (
            <p className="mt-1 text-xs text-destructive">
              Час завершення має бути пізніше за час початку.
            </p>
          )}
        </div>
      )}

      {isRescheduled && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
          <Checkbox
            checked={markTransferred}
            onCheckedChange={(v) => setMarkTransferred(Boolean(v))}
            id="mark-transferred"
          />
          <label htmlFor="mark-transferred" className="text-sm text-foreground cursor-pointer">
            Записати як перенесений
          </label>
        </div>
      )}

      {markTransferred && (
        <EmojiTextareaField
          label="Причина переносу (опційно)"
          placeholder="Наприклад: клієнт попросив перенести час..."
          value={transferredReason}
          onChange={setTransferredReason}
          rows={3}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Статус</label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              setForm((f) => {
                const status = v as CallStatus;
                let outcome = f.outcome;
                if (status === "CANCELLED") outcome = "CANCELLED";
                else if (status === "SCHEDULED") outcome = "PENDING";
                else if (status === "COMPLETED") {
                  const ok =
                    f.outcome === "SUCCESS" ||
                    f.outcome === "UNSUCCESSFUL" ||
                    f.outcome === "PENDING";
                  if (!ok) outcome = "PENDING";
                }
                return { ...f, status, outcome };
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Результат дзвінка</label>
          {isCompleted ? (
            <Select
              value={form.outcome}
              onValueChange={(v) => setForm((f) => ({ ...f, outcome: v as CallOutcome }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(outcomeLabels)
                  .filter(([k]) => k !== "CANCELLED")
                  .map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isCancelled
                ? "Результат «Скасовано» встановлюється автоматично."
                : "Успіх / неуспіх можна вибрати лише після статусу «Завершено»."}
            </p>
          )}
        </div>
      </div>

      {isCompleted && call.devFeedback && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            <MessageSquare className="size-3.5" />
            Фідбек від виконавця
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{call.devFeedback}</p>
        </div>
      )}

      {isCompleted && !call.devFeedback && (
        <p className="text-xs text-muted-foreground">
          Виконавець ще не залишив фідбек або він порожній.
        </p>
      )}

      {isCompleted && form.outcome === "SUCCESS" && (
        <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
          Перехід на наступний етап — у таблиці дзвінків натисніть кнопку «Далі» (після збереження з результатом «Успіх»).
        </p>
      )}

      {isCancelled && (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          Дзвінок скасовано. Можна змінити статус назад або видалити запис у таблиці.
        </p>
      )}

      {!isCancelled && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Очікуваний фідбек від клієнта
          </label>
          <p className="mb-1.5 text-xs text-muted-foreground">
            Не плутати з фідбеком виконавця — це дата, коли очікуєте відповідь від клієнта / замовника.
          </p>
          <DateTimePicker
            value={form.expectedFeedbackDate}
            onChange={(v) => setForm((f) => ({ ...f, expectedFeedbackDate: v }))}
            placeholder="Оберіть дату"
          />
        </div>
      )}

      <EmojiTextareaField
        label="Нотатки"
        placeholder="Додайте нотатки..."
        value={form.notes}
        onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
        rows={3}
      />

      <div className="space-y-2">
        <Label>Зарплата ($)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Від"
            min={0}
            value={form.salaryFrom || ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, salaryFrom: Number(e.target.value) || 0 }))
            }
          />
          <Input
            type="number"
            placeholder="До (опційно)"
            min={0}
            value={form.salaryTo ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({ ...f, salaryTo: v ? Number(v) : undefined }));
            }}
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5">Посилання на дзвінок</Label>
        <Input
          placeholder="https://..."
          value={form.callLink}
          onChange={(e) => setForm((f) => ({ ...f, callLink: e.target.value }))}
        />
      </div>

      <EmojiTextareaField
        placeholder="Опис дзвінка..."
        value={form.description}
        onChange={(v) => setForm((f) => ({ ...f, description: v }))}
        rows={3}
        textareaClassName="max-h-[min(50vh,22rem)] min-h-20 overflow-y-auto overflow-x-hidden no-scrollbar"
      />

      <Separator />

      <Button onClick={handleSubmit} disabled={isPending || hasEndBeforeStart} className="w-full">
        Зберегти
      </Button>
    </div>
  );
}
