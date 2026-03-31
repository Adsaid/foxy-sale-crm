"use client";

import { useState } from "react";
import { useTechnologies } from "@/hooks/use-technologies";
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
import type { AdminUser, UpdateUserInput } from "@/types/crm";
import { cn } from "@/lib/utils";
import { ColorPickerPopover } from "@/components/ui/color-picker-popover";

const SALES_BADGE_PRESETS = [
  { bg: "#EEF2FF", text: "#3730A3" },
  { bg: "#ECFDF3", text: "#166534" },
  { bg: "#FFF7ED", text: "#9A3412" },
  { bg: "#FDF2F8", text: "#9D174D" },
  { bg: "#F0F9FF", text: "#0C4A6E" },
  { bg: "#F5F3FF", text: "#5B21B6" },
];

interface UserEditFormProps {
  user: AdminUser;
  isPending: boolean;
  onSubmit: (data: UpdateUserInput) => void;
}

export function UserEditForm({ user, isPending, onSubmit }: UserEditFormProps) {
  const techAudience = user.role === "DESIGNER" ? "DESIGNER" : "DEV";
  const { data: technologies } = useTechnologies(techAudience, {
    enabled: user.role === "DEV" || user.role === "DESIGNER",
  });

  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    specialization: user.specialization ?? "",
    technologyIds: user.technologies.map((t) => t.id),
    badgeBgColor: user.badgeBgColor ?? "#EEF2FF",
    badgeTextColor: user.badgeTextColor ?? "#3730A3",
  });

  function toggleTechnology(techId: string) {
    setForm((f) => ({
      ...f,
      technologyIds: f.technologyIds.includes(techId)
        ? f.technologyIds.filter((id) => id !== techId)
        : [...f.technologyIds, techId],
    }));
  }

  function handleSubmit() {
    onSubmit({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      specialization: form.specialization || null,
      technologyIds: form.technologyIds,
      badgeBgColor: user.role === "SALES" ? form.badgeBgColor : null,
      badgeTextColor: user.role === "SALES" ? form.badgeTextColor : null,
    });
  }

  return (
    <div className="grid gap-3 py-4">
      <Input
        placeholder="Ім'я"
        value={form.firstName}
        onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
      />
      <Input
        placeholder="Прізвище"
        value={form.lastName}
        onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
      />
      <Input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
      />
      {(user.role === "DEV" || user.role === "DESIGNER") && (
        <>
          <Select
            value={form.specialization}
            onValueChange={(v) => setForm((f) => ({ ...f, specialization: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Спеціалізація" />
            </SelectTrigger>
            <SelectContent>
              {user.role === "DEV" ? (
                <>
                  <SelectItem value="FRONTEND">Frontend</SelectItem>
                  <SelectItem value="BACKEND">Backend</SelectItem>
                  <SelectItem value="FULLSTACK">Fullstack</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="UX_UI">UX/UI</SelectItem>
                  <SelectItem value="UI">UI</SelectItem>
                  <SelectItem value="UX">UX</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <div className="space-y-2">
            <p className="text-sm font-medium">Технології</p>
            <div className="flex flex-wrap gap-1.5">
              {technologies?.map((t) => (
                  <Badge
                    key={t.id}
                    variant={form.technologyIds.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTechnology(t.id)}
                  >
                    {t.name}
                  </Badge>
                ))}
            </div>
          </div>
        </>
      )}
      {user.role === "SALES" && (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Стиль бейджа сейла</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Приклад:</span>
            <Badge
              variant="outline"
              className="h-6 px-2.5 text-sm"
              style={{
                backgroundColor: form.badgeBgColor,
                color: form.badgeTextColor,
                borderColor: form.badgeTextColor,
              }}
            >
              Сейл: {form.firstName} {form.lastName}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Колір фону</p>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="#EEF2FF"
                  value={form.badgeBgColor}
                  onChange={(e) => setForm((f) => ({ ...f, badgeBgColor: e.target.value }))}
                />
                <ColorPickerPopover
                  value={form.badgeBgColor || "#EEF2FF"}
                  onChange={(value) => setForm((f) => ({ ...f, badgeBgColor: value }))}
                  ariaLabel="Вибрати колір фону"
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Колір тексту</p>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="#3730A3"
                  value={form.badgeTextColor}
                  onChange={(e) => setForm((f) => ({ ...f, badgeTextColor: e.target.value }))}
                />
                <ColorPickerPopover
                  value={form.badgeTextColor || "#3730A3"}
                  onChange={(value) => setForm((f) => ({ ...f, badgeTextColor: value }))}
                  ariaLabel="Вибрати колір тексту"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Готові стилі</p>
            <div className="flex flex-wrap gap-2">
              {SALES_BADGE_PRESETS.map((preset) => {
                const active =
                  form.badgeBgColor.toLowerCase() === preset.bg.toLowerCase() &&
                  form.badgeTextColor.toLowerCase() === preset.text.toLowerCase();
                return (
                  <button
                    key={`${preset.bg}-${preset.text}`}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        badgeBgColor: preset.bg,
                        badgeTextColor: preset.text,
                      }))
                    }
                    className={cn(
                      "h-7 w-7 rounded-full border transition",
                      active ? "ring-2 ring-primary ring-offset-2" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: preset.bg, borderColor: preset.text }}
                    aria-label={`preset ${preset.bg}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
      <Button onClick={handleSubmit} disabled={isPending}>
        Зберегти
      </Button>
    </div>
  );
}
