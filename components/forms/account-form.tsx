"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, AccountType, AdminUser } from "@/types/crm";
import { ManagerBadge } from "@/components/ui/manager-badge";

interface AccountFormProps {
  initial?: Account | null;
  isAdmin: boolean;
  salesUsers?: AdminUser[];
  isPending: boolean;
  onSubmit: (data: { account: string; type: AccountType; ownerId?: string }) => void;
}

export function AccountForm({
  initial,
  isAdmin,
  salesUsers,
  isPending,
  onSubmit,
}: AccountFormProps) {
  const [account, setAccount] = useState(initial?.account ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "UPWORK");
  const [ownerId, setOwnerId] = useState(initial?.ownerId ?? "");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const selectedOwner = salesUsers?.find((s) => s.id === ownerId);

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
      {isAdmin && (
        <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal">
              {selectedOwner
                ? `${selectedOwner.firstName} ${selectedOwner.lastName}`
                : "Оберіть менеджера"}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Пошук менеджера..." />
              <CommandList>
                <CommandEmpty>Не знайдено</CommandEmpty>
                <CommandGroup>
                  {salesUsers?.map((sales) => (
                    <CommandItem
                      key={sales.id}
                      value={`${sales.firstName} ${sales.lastName} ${sales.email}`}
                      data-checked={ownerId === sales.id}
                      onSelect={() => {
                        setOwnerId(sales.id);
                        setOwnerOpen(false);
                      }}
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
      <Button
        onClick={() => onSubmit({ account, type, ownerId: isAdmin ? ownerId : undefined })}
        disabled={!account || isPending || (isAdmin && !ownerId)}
      >
        {initial ? "Зберегти" : "Створити"}
      </Button>
    </div>
  );
}
