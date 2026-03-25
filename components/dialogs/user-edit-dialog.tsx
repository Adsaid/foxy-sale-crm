"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserEditForm } from "@/components/forms/user-edit-form";
import type { AdminUser, UpdateUserInput } from "@/types/crm";

interface UserEditDialogProps {
  user: AdminUser | null;
  onClose: () => void;
  isPending: boolean;
  onSubmit: (data: UpdateUserInput) => void;
}

export function UserEditDialog({
  user,
  onClose,
  isPending,
  onSubmit,
}: UserEditDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Редагувати користувача</DialogTitle>
        </DialogHeader>
        {user && (
          <UserEditForm user={user} isPending={isPending} onSubmit={onSubmit} />
        )}
      </DialogContent>
    </Dialog>
  );
}
