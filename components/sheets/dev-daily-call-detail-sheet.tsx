"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Link2, Repeat, StickyNote, User } from "lucide-react";
import type { DevDailyCall } from "@/types/crm";
import { formatCallTableDateTime } from "@/lib/date-kyiv";
import { TextWithLinks } from "@/components/ui/text-with-links";
import { ensureUrlProtocol } from "@/lib/normalize-call-link";
import { cn } from "@/lib/utils";

interface DevDailyCallDetailSheetProps {
  call: DevDailyCall | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return formatCallTableDateTime(value);
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  const Icon = icon;
  return (
    <section className="rounded-2xl border border-border/60 bg-muted/25 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-background/80 text-primary ring-1 ring-border/60">
          <Icon className="size-4" />
        </span>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
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
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/40 py-3.5 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:py-3">
      <span className="shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-base leading-snug text-foreground sm:text-right">
        {children}
      </div>
    </div>
  );
}

const badgeSheet = "h-7 px-3 text-sm font-medium";

export function DevDailyCallDetailSheet({
  call,
  open,
  onOpenChange,
}: DevDailyCallDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full max-lg:data-[side=right]:!max-w-[100vw] lg:data-[side=right]:max-w-[40rem] xl:data-[side=right]:max-w-[48rem]">
        <SheetHeader className="space-y-1 border-b border-border/50 px-6 pb-5 text-left">
          <SheetTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
            {call?.title ?? "Деталі дейліка"}
          </SheetTitle>
          {call ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="secondary" className={badgeSheet}>
                {call.isActive ? "Заплановано" : "Неактивний"}
              </Badge>
              <Badge variant="outline" className={badgeSheet}>
                {call.recurrenceType === "WEEKLY" ? "Щотижня" : "Разовий"}
              </Badge>
            </div>
          ) : null}
        </SheetHeader>

        {call ? (
          <div className="space-y-6 px-6 pb-8 pt-4">
            <Section title="Час" icon={CalendarClock}>
              <DetailRow label="Початок">{formatDateTime(call.callStartedAt)}</DetailRow>
              <DetailRow label="Завершення">{formatDateTime(call.callEndedAt)}</DetailRow>
            </Section>

            <Section title="Деталі" icon={Repeat}>
              <DetailRow label="Повторюваність">
                <Badge variant="outline" className={cn(badgeSheet, "justify-center")}>
                  {call.recurrenceType === "WEEKLY" ? "Щотижня" : "Разовий"}
                </Badge>
              </DetailRow>
              <DetailRow label="Повтор до">
                {call.recurrenceEndDate ? formatDateTime(call.recurrenceEndDate) : "Без обмеження"}
              </DetailRow>
              {call.caller ? (
                <DetailRow label="Виконавець">
                  <span className="font-medium">
                    <User className="mr-1 inline size-4 align-text-bottom text-muted-foreground" />
                    {call.caller.firstName} {call.caller.lastName}
                  </span>
                </DetailRow>
              ) : null}
            </Section>

            {call.callLink ? (
              <Section title="Посилання" icon={Link2}>
                <a
                  href={ensureUrlProtocol(call.callLink)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm font-medium text-primary hover:underline"
                >
                  {call.callLink}
                </a>
              </Section>
            ) : null}

            {call.description ? (
              <Section title="Опис" icon={StickyNote}>
                <TextWithLinks text={call.description} className="whitespace-pre-wrap text-sm" />
              </Section>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
