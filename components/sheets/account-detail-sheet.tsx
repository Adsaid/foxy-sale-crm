"use client";

import type { ComponentType } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { ExternalLink, UserCircle, Link2, FileText } from "lucide-react";
import type { Account } from "@/types/crm";
import { cn } from "@/lib/utils";

interface AccountDetailSheetProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/25 p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        {Icon ? (
          <span className="flex size-8 items-center justify-center rounded-lg bg-background/80 text-primary ring-1 ring-border/60">
            <Icon className="size-4" />
          </span>
        ) : null}
        <h3 className="font-heading text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-0">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/40 py-3.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:py-3">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-base leading-snug text-foreground sm:text-right">
        {children}
      </div>
    </div>
  );
}

export function AccountDetailSheet({
  account,
  open,
  onOpenChange,
}: AccountDetailSheetProps) {
  if (!account) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full max-lg:data-[side=right]:!max-w-[100vw] max-lg:data-[side=right]:sm:!max-w-[100vw] lg:data-[side=right]:max-w-[40rem] xl:data-[side=right]:max-w-[48rem] 2xl:data-[side=right]:max-w-[56rem]">
        <SheetHeader className="space-y-1 border-b border-border/50 px-6 pb-5 text-left">
          <SheetTitle className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {account.account}
          </SheetTitle>
          <p className="text-base text-muted-foreground">
            <AccountTypeBadge type={account.type} />
          </p>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-8 pt-4">
          <Section title="Загальне" icon={UserCircle}>
            <DetailRow label="Тип платформи">
              <AccountTypeBadge type={account.type} />
            </DetailRow>

            {account.owner && (
              <DetailRow label="Менеджер">
                <ManagerBadge
                  name={`${account.owner.firstName} ${account.owner.lastName}`}
                  bgColor={account.owner.badgeBgColor}
                  textColor={account.owner.badgeTextColor}
                  className="h-7 px-3 text-sm"
                />
              </DetailRow>
            )}

            <DetailRow label="Створено">
              {new Date(account.createdAt).toLocaleDateString("uk-UA", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </DetailRow>
          </Section>

          {account.profileLinks && account.profileLinks.length > 0 && (
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Link2 className="size-5 text-muted-foreground" />
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Посилання
                </h3>
              </div>
              <ul className="space-y-3">
                {account.profileLinks.map((link, i) => (
                  <li key={i}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-2 break-all text-base font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <ExternalLink className="mt-0.5 size-5 shrink-0" />
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {account.description && (
            <section className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="size-5 text-muted-foreground" />
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Опис
                </h3>
              </div>
              <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                {account.description}
              </p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
