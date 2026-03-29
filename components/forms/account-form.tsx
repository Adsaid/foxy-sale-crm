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
import type {
  Account,
  AccountDesktopType,
  AccountFormPayload,
  AccountOperationalStatus,
  AccountType,
  AccountWarmUpStage,
  AdminUser,
} from "@/types/crm";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import {
  ACCOUNT_DESKTOP_TYPE_VALUES,
  ACCOUNT_OPERATIONAL_STATUS_VALUES,
  ACCOUNT_WARM_UP_STAGE_VALUES,
  accountDesktopTypeLabelUk,
  accountOperationalStatusLabelUk,
  accountWarmUpStageLabelUk,
} from "@/lib/account-fields";

const NONE = "__none__";

function toCount(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

interface AccountFormProps {
  initial?: Account | null;
  isAdmin: boolean;
  salesUsers?: AdminUser[];
  isPending: boolean;
  onSubmit: (data: AccountFormPayload) => void;
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
  const [operationalStatus, setOperationalStatus] = useState<AccountOperationalStatus | null>(
    initial?.operationalStatus ?? null
  );
  const [warmUpStage, setWarmUpStage] = useState<AccountWarmUpStage | null>(() =>
    initial?.operationalStatus === "WARMING" ? (initial.warmUpStage ?? null) : null
  );
  const [desktopType, setDesktopType] = useState<AccountDesktopType | null>(
    initial?.desktopType ?? null
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [contactsCount, setContactsCount] = useState(
    initial?.contactsCount != null ? String(initial.contactsCount) : ""
  );
  const [profileViewsCount, setProfileViewsCount] = useState(
    initial?.profileViewsCount != null ? String(initial.profileViewsCount) : ""
  );
  const [ownerId, setOwnerId] = useState(initial?.ownerId ?? "");
  const [ownerOpen, setOwnerOpen] = useState(false);
  const selectedOwner = salesUsers?.find((s) => s.id === ownerId);

  const countsInvalid =
    (type === "LINKEDIN" &&
      contactsCount.trim() !== "" &&
      toCount(contactsCount) === null) ||
    (profileViewsCount.trim() !== "" && toCount(profileViewsCount) === null);

  return (
    <div className="grid gap-4 py-4">
      <Input
        placeholder="Назва / handle акаунту"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
      />
      <Select
        value={type}
        onValueChange={(v) => {
          const next = v as AccountType;
          setType(next);
          if (next === "UPWORK") setContactsCount("");
        }}
      >
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

      <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">Статус і метрики для звітів</p>

        <div className="space-y-2">
          <Label>Операційний статус</Label>
          <Select
            value={operationalStatus ?? NONE}
            onValueChange={(v) => {
              const next = v === NONE ? null : (v as AccountOperationalStatus);
              setOperationalStatus(next);
              if (next !== "WARMING") setWarmUpStage(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Не обрано" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Не обрано</SelectItem>
              {ACCOUNT_OPERATIONAL_STATUS_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {accountOperationalStatusLabelUk[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {operationalStatus === "WARMING" && (
          <div className="space-y-2">
            <Label>Етап прогріву</Label>
            <Select
              value={warmUpStage ?? NONE}
              onValueChange={(v) => setWarmUpStage(v === NONE ? null : (v as AccountWarmUpStage))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Не обрано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Не обрано</SelectItem>
                {ACCOUNT_WARM_UP_STAGE_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {accountWarmUpStageLabelUk[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Місцезнаходження</Label>
          <Input
            placeholder="Напр. Україна, UK, регіон / IP…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Робоче оточення</Label>
          <Select
            value={desktopType ?? NONE}
            onValueChange={(v) => setDesktopType(v === NONE ? null : (v as AccountDesktopType))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Не обрано" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Не обрано</SelectItem>
              {ACCOUNT_DESKTOP_TYPE_VALUES.map((v) => (
                <SelectItem key={v} value={v}>
                  {accountDesktopTypeLabelUk[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={
            type === "LINKEDIN" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"
          }
        >
          {type === "LINKEDIN" && (
            <div className="space-y-2">
              <Label>Контакти</Label>
              <Input
                inputMode="numeric"
                placeholder="Кількість"
                value={contactsCount}
                onChange={(e) => setContactsCount(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Перегляди</Label>
            <Input
              inputMode="numeric"
              placeholder="Кількість"
              value={profileViewsCount}
              onChange={(e) => setProfileViewsCount(e.target.value)}
            />
          </div>
        </div>
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
            description: initial ? description.trim() || null : description.trim() || undefined,
            ownerId: isAdmin ? ownerId : undefined,
            operationalStatus,
            warmUpStage: operationalStatus === "WARMING" ? warmUpStage : null,
            desktopType,
            location: location.trim() || null,
            contactsCount: type === "UPWORK" ? null : toCount(contactsCount),
            profileViewsCount: toCount(profileViewsCount),
          })
        }
        disabled={!account || isPending || (isAdmin && !ownerId) || countsInvalid}
      >
        {initial ? "Зберегти" : "Створити"}
      </Button>
    </div>
  );
}
