"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountForm } from "@/components/forms/account-form";
import type { Account, AccountFormPayload, AdminUser } from "@/types/crm";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  isAdmin: boolean;
  salesUsers?: AdminUser[];
  isPending: boolean;
  onSubmit: (data: AccountFormPayload) => void;
}

export function AccountDialog({
  open,
  onOpenChange,
  account,
  isAdmin,
  salesUsers,
  isPending,
  onSubmit,
}: AccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? "Редагувати акаунт" : "Новий акаунт"}
          </DialogTitle>
        </DialogHeader>
        <AccountForm
          key={account?.id ?? "new-account"}
          initial={account}
          isAdmin={isAdmin}
          salesUsers={salesUsers}
          isPending={isPending}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
