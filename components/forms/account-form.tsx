"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, AccountType } from "@/types/crm";

interface AccountFormProps {
  initial?: Account | null;
  isPending: boolean;
  onSubmit: (data: { account: string; type: AccountType }) => void;
}

export function AccountForm({ initial, isPending, onSubmit }: AccountFormProps) {
  const [account, setAccount] = useState(initial?.account ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "UPWORK");

  return (
    <div className="grid gap-4 py-4">
      <Input
        placeholder="Назва / handle акаунту"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
      />
      <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="UPWORK">Upwork</SelectItem>
          <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
        </SelectContent>
      </Select>
      <Button
        onClick={() => onSubmit({ account, type })}
        disabled={!account || isPending}
      >
        {initial ? "Зберегти" : "Створити"}
      </Button>
    </div>
  );
}
