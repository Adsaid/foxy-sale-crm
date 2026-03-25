"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasswordFormProps {
  userName: string;
  isPending: boolean;
  onSubmit: (password: string) => void;
}

export function PasswordForm({ userName, isPending, onSubmit }: PasswordFormProps) {
  const [password, setPassword] = useState("");

  return (
    <div className="grid gap-3 py-4">
      <p className="text-sm text-muted-foreground">{userName}</p>
      <Input
        type="password"
        placeholder="Новий пароль (мін. 6 символів)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button
        onClick={() => onSubmit(password)}
        disabled={password.length < 6 || isPending}
      >
        Змінити пароль
      </Button>
    </div>
  );
}
