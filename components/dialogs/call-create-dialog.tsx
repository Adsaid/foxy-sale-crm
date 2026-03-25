"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CallCreateForm } from "@/components/forms/call-create-form";
import type { CreateCallInput } from "@/types/crm";

interface CallCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (data: CreateCallInput) => void;
}

export function CallCreateDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: CallCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новий дзвінок</DialogTitle>
        </DialogHeader>
        <CallCreateForm isPending={isPending} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
