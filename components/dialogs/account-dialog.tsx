"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountForm } from "@/components/forms/account-form";
import type { Account, AccountType } from "@/types/crm";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  isPending: boolean;
  onSubmit: (data: { account: string; type: AccountType }) => void;
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
  isPending,
  onSubmit,
}: AccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {account ? "Редагувати акаунт" : "Новий акаунт"}
          </DialogTitle>
        </DialogHeader>
        <AccountForm initial={account} isPending={isPending} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
