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

interface UserEditFormProps {
  user: AdminUser;
  isPending: boolean;
  onSubmit: (data: UpdateUserInput) => void;
}

export function UserEditForm({ user, isPending, onSubmit }: UserEditFormProps) {
  const { data: technologies } = useTechnologies();

  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    specialization: user.specialization ?? "",
    technologyIds: user.technologies.map((t) => t.id),
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
      {user.role === "DEV" && (
        <>
          <Select
            value={form.specialization}
            onValueChange={(v) => setForm((f) => ({ ...f, specialization: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Спеціалізація" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FRONTEND">Frontend</SelectItem>
              <SelectItem value="BACKEND">Backend</SelectItem>
              <SelectItem value="FULLSTACK">Fullstack</SelectItem>
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
      <Button onClick={handleSubmit} disabled={isPending}>
        Зберегти
      </Button>
    </div>
  );
}
