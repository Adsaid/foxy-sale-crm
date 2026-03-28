"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account, AccountType, AdminUser } from "@/types/crm";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";

interface AccountFormProps {
  initial?: Account | null;
  isAdmin: boolean;
  salesUsers?: AdminUser[];
  isPending: boolean;
  onSubmit: (data: {
    account: string;
    type: AccountType;
    profileLinks?: string[];
    description?: string | null;
    ownerId?: string;
  }) => void;
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
  const [profileLinks, setProfileLinks] = useState<string[]>(
    initial?.profileLinks?.length ? initial.profileLinks : [""]
  );
  const [description, setDescription] = useState(initial?.description ?? "");
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
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Тип платформи" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="UPWORK">
            <AccountTypeBadge type="UPWORK" />
          </SelectItem>
          <SelectItem value="LINKEDIN">
            <AccountTypeBadge type="LINKEDIN" />
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="space-y-2">
        <Label>Посилання на акаунт</Label>
        {profileLinks.map((link, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="https://..."
              value={link}
              onChange={(e) => {
                const next = [...profileLinks];
                next[i] = e.target.value;
                setProfileLinks(next);
              }}
            />
            {profileLinks.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => setProfileLinks(profileLinks.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setProfileLinks([...profileLinks, ""])}
        >
          <Plus className="size-3.5" />
          Додати посилання
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Опис</Label>
        <Textarea
          placeholder="Опис акаунту..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

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
        onClick={() =>
          onSubmit({
            account,
            type,
            profileLinks: profileLinks.filter((l) => l.trim()),
            description: initial
              ? description.trim() || null
              : description.trim() || undefined,
            ownerId: isAdmin ? ownerId : undefined,
          })
        }
        disabled={!account || isPending || (isAdmin && !ownerId)}
      >
        {initial ? "Зберегти" : "Створити"}
      </Button>
    </div>
  );
}
