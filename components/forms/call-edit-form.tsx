"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { CallEvent, CallStatus, CallOutcome, CallStage, UpdateCallInput } from "@/types/crm";

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

const stageLabels: Record<string, string> = {
  HR: "HR",
  TECH: "Tech",
  CLIENT: "Client",
  PM: "PM",
  CLIENT_TECH: "Client Tech",
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
    movingToNextStage: call.movingToNextStage,
    nextStep: (call.nextStep ?? "") as CallStage | "",
    nextStepDate: call.nextStepDate ?? "",
    expectedFeedbackDate: call.expectedFeedbackDate ?? "",
    notes: call.notes ?? "",
  });

  function handleSubmit() {
    onSubmit({
      status: form.status,
      outcome: form.outcome,
      movingToNextStage: form.movingToNextStage,
      nextStep: form.nextStep || null,
      nextStepDate: form.nextStepDate || null,
      expectedFeedbackDate: form.expectedFeedbackDate || null,
      notes: form.notes || null,
    });
  }

  return (
    <div className="grid gap-3 py-4">
      <Select
        value={form.status}
        onValueChange={(v) => setForm((f) => ({ ...f, status: v as CallStatus }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={form.outcome}
        onValueChange={(v) => setForm((f) => ({ ...f, outcome: v as CallOutcome }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Результат" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(outcomeLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Checkbox
          id="movingToNextStage"
          checked={form.movingToNextStage}
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, movingToNextStage: Boolean(checked) }))
          }
        />
        <label htmlFor="movingToNextStage" className="text-sm leading-none cursor-pointer">
          Перехід на наступний етап
        </label>
      </div>
      {form.movingToNextStage && (
        <>
          <Select
            value={form.nextStep}
            onValueChange={(v) => setForm((f) => ({ ...f, nextStep: v as CallStage }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Наступний етап" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(stageLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Дата наступного етапу</label>
            <DateTimePicker
              value={form.nextStepDate}
              onChange={(v) => setForm((f) => ({ ...f, nextStepDate: v }))}
              placeholder="Оберіть дату"
            />
          </div>
        </>
      )}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Очікувана дата фідбеку</label>
        <DateTimePicker
          value={form.expectedFeedbackDate}
          onChange={(v) => setForm((f) => ({ ...f, expectedFeedbackDate: v }))}
          placeholder="Оберіть дату"
        />
      </div>
      <Textarea
        placeholder="Нотатки"
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
      />
      <Button onClick={handleSubmit} disabled={isPending}>
        Зберегти
      </Button>
    </div>
  );
}
