"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Building2, User, Clock, MessageSquare } from "lucide-react";
import type { CallEvent, CallStatus, CallOutcome, UpdateCallInput } from "@/types/crm";

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
};

interface CallEditFormProps {
  call: CallEvent;
  isPending: boolean;
  onSubmit: (data: UpdateCallInput) => void;
}

export function CallEditForm({ call, isPending, onSubmit }: CallEditFormProps) {
  const [form, setForm] = useState({
    status: call.status,
    outcome: call.outcome,
    callStartedAt: call.callStartedAt,
    expectedFeedbackDate: call.expectedFeedbackDate ?? "",
    notes: call.notes ?? "",
  });

  const isCompleted = form.status === "COMPLETED";
  const isCancelled = form.status === "CANCELLED";

  function handleSubmit() {
    onSubmit({
      status: form.status,
      outcome: form.outcome,
      callStartedAt: form.callStartedAt,
      expectedFeedbackDate: form.expectedFeedbackDate || null,
      notes: form.notes || null,
    });
  }

  return (
    <div className="space-y-4 py-2">
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
          {call.caller && (
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {call.caller.firstName} {call.caller.lastName}
            </span>
          )}
          {call.account && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {call.account.account} ({call.account.type})
            </span>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <label className="mb-1.5 block text-sm font-medium">Дата та час дзвінка</label>
        <DateTimePicker
          value={form.callStartedAt}
          onChange={(v) => setForm((f) => ({ ...f, callStartedAt: v }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Статус</label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                status: v as CallStatus,
                outcome: v === "COMPLETED" ? f.outcome : v === "SCHEDULED" ? "PENDING" : f.outcome,
              }))
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
          <Select
            value={form.outcome}
            onValueChange={(v) => setForm((f) => ({ ...f, outcome: v as CallOutcome }))}
            disabled={!isCompleted}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(outcomeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isCompleted && (
            <p className="mt-1 text-xs text-muted-foreground">
              Успіх / неуспіх можна вибрати лише після статусу «Завершено» (SALES).
            </p>
          )}
        </div>
      </div>

      {isCompleted && call.devFeedback && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            <MessageSquare className="size-3.5" />
            Фідбек від DEV
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{call.devFeedback}</p>
        </div>
      )}

      {isCompleted && !call.devFeedback && (
        <p className="text-xs text-muted-foreground">
          DEV ще не залишив фідбек або він порожній.
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
            Не плутати з фідбеком DEV — це дата, коли очікуєте відповідь від клієнта / замовника.
          </p>
          <DateTimePicker
            value={form.expectedFeedbackDate}
            onChange={(v) => setForm((f) => ({ ...f, expectedFeedbackDate: v }))}
            placeholder="Оберіть дату"
          />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Нотатки</label>
        <Textarea
          placeholder="Додайте нотатки..."
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
        />
      </div>

      <Separator />

      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        Зберегти
      </Button>
    </div>
  );
}
