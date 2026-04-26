"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { CreateDevDailyCallInput, RecurrenceType } from "@/types/crm";

const recurrenceLabels: Record<RecurrenceType, string> = {
  NONE: "Одноразовий",
  WEEKLY: "Щотижня",
};

interface DevDailyCallFormProps {
  isPending: boolean;
  initialValue?: Partial<CreateDevDailyCallInput>;
  submitLabel?: string;
  onSubmit: (data: CreateDevDailyCallInput) => void;
}

function normalizeEndByStart(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return endIso;

  // If picker gave time on another day, keep the picked HH:mm but align date to start day.
  if (start.toDateString() !== end.toDateString()) {
    const aligned = new Date(start);
    aligned.setHours(end.getHours(), end.getMinutes(), 0, 0);
    return aligned.toISOString();
  }

  return endIso;
}

export function DevDailyCallForm({
  isPending,
  initialValue,
  submitLabel = "Створити",
  onSubmit,
}: DevDailyCallFormProps) {
  const [form, setForm] = useState<CreateDevDailyCallInput>({
    title: initialValue?.title ?? "",
    description: initialValue?.description ?? "",
    callStartedAt: initialValue?.callStartedAt ?? "",
    callEndedAt: initialValue?.callEndedAt ?? "",
    callLink: initialValue?.callLink ?? "",
    recurrenceType: initialValue?.recurrenceType ?? "WEEKLY",
    recurrenceEndDate: initialValue?.recurrenceEndDate ?? "",
  });

  const isValid = form.title.trim() && form.callStartedAt;
  const hasEndBeforeStart = useMemo(() => {
    if (!form.callStartedAt || !form.callEndedAt) return false;
    return new Date(form.callEndedAt).getTime() <= new Date(form.callStartedAt).getTime();
  }, [form.callEndedAt, form.callStartedAt]);

  function handleSubmit() {
    if (!isValid || isPending) return;
    const payload: CreateDevDailyCallInput = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      callLink: form.callLink?.trim() || undefined,
      callEndedAt:
        form.callEndedAt && form.callStartedAt
          ? normalizeEndByStart(form.callStartedAt, form.callEndedAt)
          : form.callEndedAt || undefined,
      recurrenceEndDate: form.recurrenceEndDate || undefined,
    };
    onSubmit(payload);
  }

  return (
    <div className="grid min-w-0 gap-3 py-4">
      <div className="space-y-2">
        <Label>Назва дзвінка *</Label>
        <Input
          placeholder="Наприклад: Daily з клієнтом"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Повторюваність</Label>
        <Select
          value={form.recurrenceType}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, recurrenceType: v as RecurrenceType }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(recurrenceLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Дата та час початку *
        </label>
        <DateTimePicker
          value={form.callStartedAt}
          onChange={(v) =>
            setForm((f) => {
              const next = { ...f, callStartedAt: v };
              if (next.callEndedAt) {
                next.callEndedAt = normalizeEndByStart(v, next.callEndedAt);
              }
              return next;
            })
          }
          placeholder="Оберіть дату та час"
        />
        {form.recurrenceType === "WEEKLY" && form.callStartedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Повторюватиметься щотижня в цей день та час
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Час завершення (опціонально)
        </label>
        <DateTimePicker
          value={form.callEndedAt ?? ""}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              callEndedAt: f.callStartedAt ? normalizeEndByStart(f.callStartedAt, v) : v,
            }))
          }
          placeholder="За замовчуванням +1 година"
        />
        {hasEndBeforeStart && (
          <p className="mt-1 text-xs text-destructive">
            Час завершення має бути пізніше за час початку.
          </p>
        )}
      </div>

      {form.recurrenceType === "WEEKLY" && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Повтор до (опціонально)
          </label>
          <DateTimePicker
            value={form.recurrenceEndDate ?? ""}
            onChange={(v) =>
              setForm((f) => ({ ...f, recurrenceEndDate: v }))
            }
            placeholder="Без обмеження"
          />
        </div>
      )}

      <Input
        placeholder="Посилання на дзвінок (Zoom / Meet)"
        value={form.callLink ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, callLink: e.target.value }))}
      />

      <div className="min-w-0 space-y-2">
        <Label>Опис</Label>
        <Textarea
          placeholder="Нотатки по дзвінку..."
          value={form.description ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          rows={3}
          className="max-h-[min(50vh,22rem)] min-h-20 overflow-y-auto overflow-x-hidden no-scrollbar"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || isPending || hasEndBeforeStart}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
