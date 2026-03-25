"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CallEditForm } from "@/components/forms/call-edit-form";
import type { CallEvent, UpdateCallInput } from "@/types/crm";

interface CallEditDialogProps {
  call: CallEvent | null;
  onClose: () => void;
  isPending: boolean;
  onSubmit: (data: UpdateCallInput) => void;
}

export function CallEditDialog({
  call,
  onClose,
  isPending,
  onSubmit,
}: CallEditDialogProps) {
  return (
    <Dialog open={!!call} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Редагувати дзвінок</DialogTitle>
        </DialogHeader>
        {call && (
          <CallEditForm call={call} isPending={isPending} onSubmit={onSubmit} />
        )}
      </DialogContent>
    </Dialog>
  );
}
