"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordForm } from "@/components/forms/password-form";
import type { AdminUser } from "@/types/crm";

interface PasswordDialogProps {
  user: AdminUser | null;
  onClose: () => void;
  isPending: boolean;
  onSubmit: (password: string) => void;
}

export function PasswordDialog({
  user,
  onClose,
  isPending,
  onSubmit,
}: PasswordDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Змінити пароль</DialogTitle>
        </DialogHeader>
        {user && (
          <PasswordForm
            userName={`${user.firstName} ${user.lastName} (${user.email})`}
            isPending={isPending}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
