"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CallCompleteForm } from "@/components/forms/call-complete-form";

interface CallCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (devFeedback: string) => void;
}

export function CallCompleteDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: CallCompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Завершити дзвінок</DialogTitle>
        </DialogHeader>
        <CallCompleteForm isPending={isPending} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
