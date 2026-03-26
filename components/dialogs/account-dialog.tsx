"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountForm } from "@/components/forms/account-form";
import type { Account, AccountType, AdminUser } from "@/types/crm";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  isAdmin: boolean;
  salesUsers?: AdminUser[];
  isPending: boolean;
  onSubmit: (data: { account: string; type: AccountType; ownerId?: string }) => void;
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {account ? "Редагувати акаунт" : "Новий акаунт"}
          </DialogTitle>
        </DialogHeader>
        <AccountForm
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
