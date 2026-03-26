"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CallNextStageForm } from "@/components/forms/call-next-stage-form";
import type { CallEvent, AdvanceCallStageInput } from "@/types/crm";

interface CallNextStageDialogProps {
  call: CallEvent | null;
  onClose: () => void;
  isPending: boolean;
  onSubmit: (data: AdvanceCallStageInput) => void;
}

export function CallNextStageDialog({
  call,
  onClose,
  isPending,
  onSubmit,
}: CallNextStageDialogProps) {
  return (
    <Dialog open={!!call} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Наступний етап</DialogTitle>
          <DialogDescription>
            Буде створено новий дзвінок з тими ж акаунтом, компанією, інтерв&apos;юером та DEV.
            Попередній запис буде видалено з активного списку (історія в підсумках збережена).
          </DialogDescription>
        </DialogHeader>
        {call && (
          <CallNextStageForm
            key={call.id}
            isPending={isPending}
            onSubmit={(data) => onSubmit(data)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
