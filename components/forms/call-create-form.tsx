"use client";

import { useMemo, useState } from "react";
import { useAccounts } from "@/hooks/use-accounts";
import { useDevs } from "@/hooks/use-devs";
import { callService } from "@/services/call-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmojiTextareaField } from "@/components/ui/emoji-textarea-field";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
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
import { formatCallTableDateTime } from "@/lib/date-kyiv";
import { DEFAULT_PLANNED_DURATION_MS, normalizeEndByStart } from "@/lib/call-planned-end";
import { assigneeSpecLabelsUk } from "@/lib/roles";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { AssigneeOptionContent } from "@/components/ui/assignee-option-content";
import { ChevronsUpDown, AlertTriangle } from "lucide-react";
import { ManagerBadge } from "@/components/ui/manager-badge";
import type { AdminUser, CallType, CreateCallInput, InterviewerDuplicateMatch } from "@/types/crm";

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

interface CallCreateFormProps {
  isPending: boolean;
  isAdmin?: boolean;
  salesUsers?: AdminUser[];
  onSubmit: (data: CreateCallInput) => void;
}

function formatCallWhen(iso: string) {
  return formatCallTableDateTime(iso);
}

export function CallCreateForm({ isPending, isAdmin = false, salesUsers, onSubmit }: CallCreateFormProps) {
  const { data: accounts, isLoading: accountsLoading } = useAccounts({ operationalStatus: "ACTIVE" });
  const { data: devs, isLoading: devsLoading } = useDevs();

  const [form, setForm] = useState<CreateCallInput>({
    accountId: "",
    company: "",
    interviewerName: "",
    callType: "HR",
    callStartedAt: "",
    callEndedAt: "",
    callerId: "",
    salaryFrom: 0,
    salaryTo: undefined,
    callLink: "",
    description: "",
  });

  const [salesId, setSalesId] = useState("");
  const [salesOpen, setSalesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const [specFilter, setSpecFilter] = useState<string>("");
  const [duplicateWarning, setDuplicateWarning] = useState<InterviewerDuplicateMatch[] | null>(
    null
  );
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const selectedSales = salesUsers?.find((s) => s.id === salesId);

  const sortedSalesUsers = useMemo(() => {
    if (!salesUsers?.length) return [];
    return [...salesUsers].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "uk"),
    );
  }, [salesUsers]);

  const visibleAccounts = useMemo(() => {
    if (!accounts) return [];
    if (!isAdmin) return accounts;
    if (!salesId) return [];
    return accounts.filter((a) => a.ownerId === salesId);
  }, [accounts, isAdmin, salesId]);

  const selectedAccount = accounts?.find((a) => a.id === form.accountId);
  const selectedDev = devs?.find((d) => d.id === form.callerId);

  const filteredDevs = devs?.filter((d) => {
    if (specFilter && d.specialization !== specFilter) return false;
    return true;
  });

  const hasEndBeforeStart = useMemo(() => {
    if (!form.callStartedAt || !form.callEndedAt) return false;
    return new Date(form.callEndedAt).getTime() <= new Date(form.callStartedAt).getTime();
  }, [form.callEndedAt, form.callStartedAt]);

  const isValid =
    form.accountId &&
    form.company &&
    form.interviewerName.trim() &&
    form.callStartedAt &&
    form.callerId &&
    form.salaryFrom > 0 &&
    !hasEndBeforeStart &&
    (!isAdmin || !!salesId);

  function handleSalesSelect(id: string) {
    setSalesId(id);
    setSalesOpen(false);
    setForm((f) =>
      f.accountId && accounts?.find((a) => a.id === f.accountId)?.ownerId !== id
        ? { ...f, accountId: "" }
        : f,
    );
  }

  function resetDuplicateState() {
    setDuplicateWarning(null);
  }

  function onInterviewerChange(value: string) {
    setForm((f) => ({ ...f, interviewerName: value }));
    resetDuplicateState();
  }

  async function handleCreateClick() {
    if (!isValid || isPending) return;

    if (duplicateWarning === null) {
      setCheckingDuplicates(true);
      try {
        const matches = await callService.checkInterviewerDuplicates(form.interviewerName);
        if (matches.length > 0) {
          setDuplicateWarning(matches);
          setCheckingDuplicates(false);
          return;
        }
      } catch {
        setCheckingDuplicates(false);
        return;
      }
      setCheckingDuplicates(false);
    } else if (duplicateWarning.length > 0) {
      return;
    }

    onSubmit(buildPayload());
    resetDuplicateState();
  }

  function buildPayload(): CreateCallInput {
    return {
      ...form,
      callEndedAt:
        form.callEndedAt && form.callStartedAt
          ? normalizeEndByStart(form.callStartedAt, form.callEndedAt)
          : form.callEndedAt || undefined,
      ...(isAdmin && salesId ? { createdById: salesId } : {}),
    };
  }

  function handleForceCreate() {
    onSubmit(buildPayload());
    resetDuplicateState();
  }

  return (
    <div className="grid min-w-0 gap-3 py-4">
      {isAdmin && (
        <Popover modal={false} open={salesOpen} onOpenChange={setSalesOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal">
              {selectedSales
                ? `${selectedSales.firstName} ${selectedSales.lastName}`
                : "Оберіть сейла"}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Пошук сейла..." />
              <CommandList>
                <CommandEmpty>Не знайдено</CommandEmpty>
                <CommandGroup>
                  {sortedSalesUsers.map((sales) => (
                    <CommandItem
                      key={sales.id}
                      value={`${sales.firstName} ${sales.lastName} ${sales.email}`}
                      data-checked={salesId === sales.id}
                      onSelect={() => handleSalesSelect(sales.id)}
                    >
                      <ManagerBadge
                        name={`${sales.firstName} ${sales.lastName}`}
                        bgColor={sales.badgeBgColor}
                        textColor={sales.badgeTextColor}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      <Popover modal={false} open={accountOpen} onOpenChange={setAccountOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={isAdmin && !salesId}
          >
            {selectedAccount
              ? `${selectedAccount.account} (${selectedAccount.type})`
              : isAdmin && !salesId
                ? "Спочатку оберіть сейла"
                : "Оберіть акаунт"}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Пошук акаунту..." />
            <CommandList>
              {accountsLoading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <CommandEmpty>Не знайдено</CommandEmpty>
                  <CommandGroup>
                    {visibleAccounts.map((a) => (
                      <CommandItem
                        key={a.id}
                        value={`${a.account} ${a.type}`}
                        data-checked={form.accountId === a.id}
                        onSelect={() => {
                          setForm((f) => ({ ...f, accountId: a.id }));
                          if (isAdmin && a.ownerId) {
                            setSalesId(a.ownerId);
                          }
                          setAccountOpen(false);
                        }}
                      >
                        <span className="font-medium">{a.account}</span>
                        <AccountTypeBadge type={a.type} className="ml-auto" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
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
        onChange={(e) => onInterviewerChange(e.target.value)}
      />

      {duplicateWarning && duplicateWarning.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
            <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
            Знайдено дзвінки з таким самим іменем інтерв&apos;юера
          </div>
          <ul className="max-h-40 space-y-2 overflow-y-auto text-muted-foreground">
            {duplicateWarning.map((m) => (
              <li key={`${m.source}-${m.id}`} className="rounded-md border border-border bg-background px-2 py-1.5">
                <div className="font-medium text-foreground">{m.company}</div>
                <div className="text-xs">
                  {formatCallWhen(m.callStartedAt)} · {callTypeLabels[m.callType]}
                  {m.devName ? <> · Dev/Design: {m.devName}</> : null}
                  {m.source === "active" && m.status && (
                    <> · {statusLabels[m.status] ?? m.status}</>
                  )}
                  {m.source === "history" && m.outcome && (
                    <> · {outcomeLabels[m.outcome] ?? m.outcome}</>
                  )}
                  <Badge variant="outline" className="ml-1.5 text-[10px]">
                    {m.source === "active" ? "У розкладі" : "Історія"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="default"
            className="mt-2 w-full"
            onClick={handleForceCreate}
            disabled={isPending}
          >
            Все одно створити
          </Button>
        </div>
      )}

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

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Дата та час дзвінка</label>
        <DateTimePicker
          value={form.callStartedAt}
          onChange={(v) =>
            setForm((f) => {
              const next = { ...f, callStartedAt: v };
              if (v) {
                if (next.callEndedAt) {
                  next.callEndedAt = normalizeEndByStart(v, next.callEndedAt);
                } else {
                  next.callEndedAt = new Date(
                    new Date(v).getTime() + DEFAULT_PLANNED_DURATION_MS,
                  ).toISOString();
                }
              }
              return next;
            })
          }
          placeholder="Оберіть дату та час"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Орієнтовне завершення
        </label>
        <DateTimePicker
          value={form.callEndedAt ?? ""}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              callEndedAt: f.callStartedAt ? normalizeEndByStart(f.callStartedAt, v) : v,
            }))
          }
          placeholder="За замовчуванням +30 хвилин"
        />
        {hasEndBeforeStart && (
          <p className="mt-1 text-xs text-destructive">
            Час завершення має бути пізніше за час початку.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">
            Виконавець (розробник або дизайнер)
          </label>
          <div className="ml-auto flex max-w-[min(100%,14rem)] flex-wrap justify-end gap-1">
            <Badge
              variant={specFilter === "" ? "default" : "outline"}
              className="cursor-pointer text-[10px] px-1.5 py-0"
              onClick={() => setSpecFilter("")}
            >
              Всі
            </Badge>
            {Object.entries(assigneeSpecLabelsUk).map(([k, v]) => (
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
        <Popover modal={false} open={devOpen} onOpenChange={setDevOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-normal"
            >
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
                          data-checked={form.callerId === d.id}
                          onSelect={() => {
                            setForm((f) => ({ ...f, callerId: d.id }));
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

      <div className="space-y-2">
        <Label>Зарплата ($)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Від *"
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

      <Input
        placeholder="Посилання на дзвінок (Zoom / Meet)"
        value={form.callLink ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, callLink: e.target.value }))}
      />

      <EmojiTextareaField
        placeholder="Опис дзвінка..."
        value={form.description ?? ""}
        onChange={(v) => setForm((f) => ({ ...f, description: v }))}
        rows={3}
        textareaClassName="max-h-[min(50vh,22rem)] min-h-20 overflow-y-auto overflow-x-hidden no-scrollbar"
      />

      {(!duplicateWarning || duplicateWarning.length === 0) && (
        <Button
          onClick={handleCreateClick}
          disabled={!isValid || isPending || checkingDuplicates}
        >
          {checkingDuplicates ? "Перевірка..." : "Створити"}
        </Button>
      )}
    </div>
  );
}
