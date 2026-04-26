"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DevDailyCallForm } from "@/components/forms/dev-daily-call-form";
import type { CreateDevDailyCallInput, DevDailyCall } from "@/types/crm";

interface DevDailyCallEditDialogProps {
  call: DevDailyCall | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDevDailyCallInput) => void;
}

export function DevDailyCallEditDialog({
  call,
  isPending,
  onClose,
  onSubmit,
}: DevDailyCallEditDialogProps) {
  return (
    <Dialog open={!!call} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Редагувати дейлік</DialogTitle>
          <DialogDescription>
            Оновіть час або параметри повторюваності дейліка
          </DialogDescription>
        </DialogHeader>
        {call ? (
          <DevDailyCallForm
            isPending={isPending}
            submitLabel="Зберегти"
            initialValue={{
              title: call.title,
              description: call.description ?? "",
              callStartedAt: call.callStartedAt,
              callEndedAt: call.callEndedAt ?? "",
              callLink: call.callLink ?? "",
              recurrenceType: call.recurrenceType,
              recurrenceEndDate: call.recurrenceEndDate ?? "",
            }}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
