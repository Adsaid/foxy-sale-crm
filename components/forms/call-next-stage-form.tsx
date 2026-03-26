"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { CallType, AdvanceCallStageInput } from "@/types/crm";

const callTypeLabels: Record<string, string> = {
  HR: "HR",
  TECH: "Tech",
  CLIENT: "Client",
  PM: "PM",
  CLIENT_TECH: "Client Tech",
};

interface CallNextStageFormProps {
  isPending: boolean;
  onSubmit: (data: AdvanceCallStageInput) => void;
}

export function CallNextStageForm({ isPending, onSubmit }: CallNextStageFormProps) {
  const [callType, setCallType] = useState<CallType>("HR");
  const [callStartedAt, setCallStartedAt] = useState("");

  const valid = Boolean(callStartedAt);

  return (
    <div className="grid gap-4 py-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Наступний етап (тип дзвінка)</label>
        <Select value={callType} onValueChange={(v) => setCallType(v as CallType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(callTypeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Дата та час нового дзвінка</label>
        <DateTimePicker
          value={callStartedAt}
          onChange={setCallStartedAt}
          placeholder="Оберіть дату та час"
        />
      </div>
      <Button disabled={!valid || isPending} onClick={() => onSubmit({ callType, callStartedAt })}>
        Створити та закрити попередній
      </Button>
    </div>
  );
}
