"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DevDailyCallForm } from "@/components/forms/dev-daily-call-form";
import type { CreateDevDailyCallInput } from "@/types/crm";

interface DevDailyCallCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (data: CreateDevDailyCallInput) => void;
}

export function DevDailyCallCreateDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: DevDailyCallCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новий дейлік</DialogTitle>
          <DialogDescription>
            Додайте свій дейлік, щоб сейли бачили вашу зайнятість
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <DevDailyCallForm isPending={isPending} onSubmit={onSubmit} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
