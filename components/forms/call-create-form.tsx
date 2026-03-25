"use client";

import { useState } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { useDevs } from "@/hooks/use-devs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ChevronsUpDown } from "lucide-react";
import type { CallType, CreateCallInput } from "@/types/crm";

const callTypeLabels: Record<string, string> = {
  HR: "HR",
  TECH: "Tech",
  CLIENT: "Client",
  PM: "PM",
  CLIENT_TECH: "Client Tech",
};

const specLabels: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
};

interface CallCreateFormProps {
  isPending: boolean;
  onSubmit: (data: CreateCallInput) => void;
}

export function CallCreateForm({ isPending, onSubmit }: CallCreateFormProps) {
  const { data: accounts } = useAccounts();
  const { data: devs } = useDevs();

  const [form, setForm] = useState<CreateCallInput>({
    accountId: "",
    company: "",
    interviewerName: "",
    callType: "HR",
    callStartedAt: "",
    callerId: "",
  });

  const [accountOpen, setAccountOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [specFilter, setSpecFilter] = useState<string>("");

  const selectedAccount = accounts?.find((a) => a.id === form.accountId);
  const selectedDev = devs?.find((d) => d.id === form.callerId);

  const filteredDevs = devs?.filter((d) => {
    if (specFilter && d.specialization !== specFilter) return false;
    return true;
  });

  const isValid =
    form.accountId &&
    form.company &&
    form.interviewerName &&
    form.callStartedAt &&
    form.callerId;

  return (
    <div className="grid gap-3 py-4">
      {/* Account — searchable combobox */}
      <Popover open={accountOpen} onOpenChange={setAccountOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
          >
            {selectedAccount
              ? `${selectedAccount.account} (${selectedAccount.type})`
              : "Оберіть акаунт"}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Пошук акаунту..." />
            <CommandList>
              <CommandEmpty>Не знайдено</CommandEmpty>
              <CommandGroup>
                {accounts?.map((a) => (
                  <CommandItem
                    key={a.id}
                    value={`${a.account} ${a.type}`}
                    data-checked={form.accountId === a.id}
                    onSelect={() => {
                      setForm((f) => ({ ...f, accountId: a.id }));
                      setAccountOpen(false);
                    }}
                  >
                    <span className="font-medium">{a.account}</span>
                    <Badge variant="outline" className="ml-auto">
                      {a.type}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        placeholder="Компанія"
        value={form.company}
        onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
      />
      <Input
        placeholder="Ім'я інтерв'юера"
        value={form.interviewerName}
        onChange={(e) => setForm((f) => ({ ...f, interviewerName: e.target.value }))}
      />

      <Select
        value={form.callType}
        onValueChange={(v) => setForm((f) => ({ ...f, callType: v as CallType }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(callTypeLabels).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date — ShadCN Calendar + time */}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Дата та час дзвінка</label>
        <DateTimePicker
          value={form.callStartedAt}
          onChange={(v) => setForm((f) => ({ ...f, callStartedAt: v }))}
          placeholder="Оберіть дату та час"
        />
      </div>

      {/* DEV — searchable combobox with filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">DEV (який вийде на дзвінок)</label>
          <div className="ml-auto flex gap-1">
            <Badge
              variant={specFilter === "" ? "default" : "outline"}
              className="cursor-pointer text-[10px] px-1.5 py-0"
              onClick={() => setSpecFilter("")}
            >
              Всі
            </Badge>
            {Object.entries(specLabels).map(([k, v]) => (
              <Badge
                key={k}
                variant={specFilter === k ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-1.5 py-0"
                onClick={() => setSpecFilter(specFilter === k ? "" : k)}
              >
                {v}
              </Badge>
            ))}
          </div>
        </div>
        <Popover open={devOpen} onOpenChange={setDevOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
            >
              {selectedDev
                ? `${selectedDev.firstName} ${selectedDev.lastName}`
                : "Оберіть DEV"}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Пошук DEV..." />
              <CommandList>
                <CommandEmpty>Не знайдено</CommandEmpty>
                <CommandGroup>
                  {filteredDevs?.map((d) => (
                    <CommandItem
                      key={d.id}
                      value={`${d.firstName} ${d.lastName} ${d.specialization ?? ""} ${d.technologies.map((t) => t.name).join(" ")}`}
                      data-checked={form.callerId === d.id}
                      onSelect={() => {
                        setForm((f) => ({ ...f, callerId: d.id }));
                        setDevOpen(false);
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">
                            {d.firstName} {d.lastName}
                          </span>
                          {d.specialization && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {specLabels[d.specialization] ?? d.specialization}
                            </Badge>
                          )}
                        </div>
                        {d.technologies.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {d.technologies.map((t) => (
                              <Badge key={t.id} variant="outline" className="text-[10px] px-1.5 py-0">
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Button onClick={() => onSubmit(form)} disabled={!isValid || isPending}>
        Створити
      </Button>
    </div>
  );
}
