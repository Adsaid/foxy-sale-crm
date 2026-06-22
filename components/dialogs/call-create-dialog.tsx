"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CallCreateForm } from "@/components/forms/call-create-form";
import type { AdminUser, CreateCallInput } from "@/types/crm";

interface CallCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  isAdmin?: boolean;
  salesUsers?: AdminUser[];
  onSubmit: (data: CreateCallInput) => void;
}

export function CallCreateDialog({
  open,
  onOpenChange,
  isPending,
  isAdmin,
  salesUsers,
  onSubmit,
}: CallCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новий дзвінок</DialogTitle>
        </DialogHeader>
        {open ? (
          <CallCreateForm
            isPending={isPending}
            isAdmin={isAdmin}
            salesUsers={salesUsers}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
