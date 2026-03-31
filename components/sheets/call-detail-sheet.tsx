"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AccountTypeBadge } from "@/components/ui/account-type-badge";
import { ManagerBadge } from "@/components/ui/manager-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Users, CalendarClock, Link2, FileText, StickyNote, MessageSquare } from "lucide-react";
import type { CallEvent } from "@/types/crm";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TextWithLinks } from "@/components/ui/text-with-links";
import { formatCallTableDateTime } from "@/lib/date-kyiv";
import { assigneeFieldLabelEn } from "@/lib/roles";

const callTypeLabels: Record<string, string> = {
  HR: "HR",
  TECH: "Tech",
  CLIENT: "Client",
  PM: "PM",
  CLIENT_TECH: "Client Tech",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Заплановано",
  COMPLETED: "Завершено",
  CANCELLED: "Скасовано",
};

const outcomeLabels: Record<string, string> = {
  SUCCESS: "Успіх",
  UNSUCCESSFUL: "Неуспіх",
  PENDING: "Очікує",
};

interface CallDetailSheetProps {
  call: CallEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading?: boolean;
}

function formatDateTime(value: string) {
  return formatCallTableDateTime(value);
}

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
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

function TextBlock({
  title,
  icon: Icon,
  children,
  variant = "default",
}: {
  title: string;
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  variant?: "default" | "accent";
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        variant === "accent"
          ? "border-primary/20 bg-primary/5"
          : "border-border/60 bg-background/80"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {Icon ? (
          <Icon className="size-5 shrink-0 text-muted-foreground" />
        ) : null}
        <h3 className="font-heading text-base font-semibold text-foreground">
          {title}
        </h3>
      </div>
      <div className="text-base leading-relaxed text-foreground">{children}</div>
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
      <span className="shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-base leading-snug text-foreground sm:text-right">
        {children}
      </div>
    </div>
  );
}

const badgeSheet = "h-7 px-3 text-sm font-medium";

export function CallDetailSheet({
  call,
  open,
  onOpenChange,
  isLoading,
}: CallDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full max-lg:data-[side=right]:!max-w-[100vw] max-lg:data-[side=right]:sm:!max-w-[100vw] lg:data-[side=right]:max-w-[40rem] xl:data-[side=right]:max-w-[48rem] 2xl:data-[side=right]:max-w-[56rem]">
        <SheetHeader className="space-y-1 border-b border-border/50 px-6 pb-5 text-left">
          <SheetTitle className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            {call?.company ?? "Деталі дзвінка"}
          </SheetTitle>
          {call && !isLoading ? (
            <p className="text-base text-muted-foreground">
              {callTypeLabels[call.callType]} ·{" "}
              {formatDateTime(call.callStartedAt)}
            </p>
          ) : null}
        </SheetHeader>

        {isLoading && (
          <div className="space-y-4 px-6 pt-2">
            <Skeleton className="h-8 w-4/5 rounded-lg" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        )}

        {!isLoading && call && (
          <div className="space-y-6 px-6 pb-8 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={badgeSheet}>
                {statusLabels[call.status]}
              </Badge>
              <Badge
                variant={
                  call.outcome === "SUCCESS"
                    ? "default"
                    : call.outcome === "UNSUCCESSFUL"
                      ? "destructive"
                      : "outline"
                }
                className={badgeSheet}
              >
                {outcomeLabels[call.outcome]}
              </Badge>
              {call.transferInfo?.isTransferred ? (
                <Badge variant="outline" className={badgeSheet}>
                  Перенесено
                  {call.transferInfo.transfers.length > 1
                    ? ` (${call.transferInfo.transfers.length})`
                    : ""}
                </Badge>
              ) : null}
            </div>

            <Section title="Учасники та контекст" icon={Users}>
              <DetailRow label="Інтерв'юер">
                <span className="font-medium">{call.interviewerName}</span>
              </DetailRow>

              <DetailRow label="Тип дзвінка">
                <Badge variant="outline" className={badgeSheet}>
                  {callTypeLabels[call.callType]}
                </Badge>
              </DetailRow>

              {call.account && (
                <div className="border-b border-border/40 last:border-0">
                  <Accordion
                    type="single"
                    collapsible
                    className="rounded-none border-0 bg-transparent shadow-none"
                  >
                    <AccordionItem value="account" className="border-0 data-open:bg-transparent">
                      <AccordionTrigger className="items-center gap-3 px-0 py-3.5 hover:no-underline sm:py-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="shrink-0 text-sm font-medium text-muted-foreground">
                            Акаунт
                          </span>
                          <span className="inline-flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 text-base font-medium text-foreground">
                            {call.account.account}
                            <AccountTypeBadge type={call.account.type} />
                          </span>
                        </div>
                      </AccordionTrigger>
                        <AccordionContent className="px-0 pb-1 pt-0">
                          <div className="space-y-4 border-t border-border/40 pt-3 text-left">
                            {call.account.profileLinks.filter((l) => l.trim()).length > 0 ? (
                              <div>
                                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  <Link2 className="size-3.5" />
                                  Посилання
                                </p>
                                <ul className="space-y-2">
                                  {call.account.profileLinks
                                    .filter((l) => l.trim())
                                    .map((link, i) => (
                                      <li key={i}>
                                        <a
                                          href={link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-start gap-2 break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                          <ExternalLink className="mt-0.5 size-4 shrink-0" />
                                          {link}
                                        </a>
                                      </li>
                                    ))}
                                </ul>
                              </div>
                            ) : null}
                            {call.account.description?.trim() ? (
                              <div>
                                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  <FileText className="size-3.5" />
                                  Опис
                                </p>
                                <TextWithLinks
                                  text={call.account.description}
                                  className="text-sm leading-relaxed text-foreground whitespace-pre-wrap"
                                />
                              </div>
                            ) : null}
                            {!call.account.description?.trim() &&
                            call.account.profileLinks.filter((l) => l.trim()).length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                Немає опису та посилань.
                              </p>
                            ) : null}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                </div>
              )}

              {call.createdBy && (
                <DetailRow label="Сейл">
                  <ManagerBadge
                    name={`${call.createdBy.firstName} ${call.createdBy.lastName}`}
                    bgColor={call.createdBy.badgeBgColor}
                    textColor={call.createdBy.badgeTextColor}
                    className="h-7 px-3 text-sm"
                  />
                </DetailRow>
              )}

              {call.caller && (
                <DetailRow label={assigneeFieldLabelEn(call.caller.role)}>
                  <span className="font-medium">
                    {call.caller.firstName} {call.caller.lastName}
                  </span>
                </DetailRow>
              )}

              {(call.salaryFrom != null || call.salaryTo != null) && (
                <DetailRow label="Зарплата ($)">
                  <span className="font-semibold tabular-nums">
                    {call.salaryFrom != null ? call.salaryFrom : "—"}
                    {call.salaryTo != null ? ` – ${call.salaryTo}` : ""}
                  </span>
                </DetailRow>
              )}
            </Section>

            <Section title="Дата та час" icon={CalendarClock}>
              <DetailRow label="Час початку">
                {formatDateTime(call.callStartedAt)}
              </DetailRow>

              {call.transferInfo?.isTransferred &&
                call.transferInfo.transfers.length > 0 && (
                  <>
                    <DetailRow label="Перенесено">
                      <Badge variant="secondary" className={badgeSheet}>
                        Так
                      </Badge>
                    </DetailRow>
                    <div className="mt-1 -mx-1">
                      <Accordion
                        type="multiple"
                        defaultValue={
                          call.transferInfo.transfers.length === 1
                            ? ["transfer-0"]
                            : []
                        }
                        className="rounded-xl border border-border/60 bg-background/60 shadow-sm"
                      >
                        {call.transferInfo.transfers.map((t, i) => (
                          <AccordionItem
                            key={`${t.transferredFromAt}-${t.transferredToAt}-${i}`}
                            value={`transfer-${i}`}
                            className="border-border/50 px-0"
                          >
                            <AccordionTrigger className="px-4 py-3.5 hover:no-underline">
                              <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
                                <span className="text-sm font-semibold text-foreground">
                                  Перенос {i + 1}
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  {formatDateTime(t.transferredFromAt)} →{" "}
                                  {formatDateTime(t.transferredToAt)}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-0 pb-0">
                              <div className="space-y-0 border-t border-border/40 px-4 pb-4 pt-1">
                                <DetailRow label="Було заплановано на">
                                  {formatDateTime(t.transferredFromAt)}
                                </DetailRow>
                                <DetailRow label="Перенесено на">
                                  {formatDateTime(t.transferredToAt)}
                                </DetailRow>
                                {t.transferredByName ? (
                                  <DetailRow label="Переніс">
                                    <ManagerBadge
                                      name={t.transferredByName}
                                      bgColor={t.transferredByBadgeBgColor}
                                      textColor={t.transferredByBadgeTextColor}
                                      className="h-7 px-3 text-sm"
                                    />
                                  </DetailRow>
                                ) : null}
                                {t.transferredReason ? (
                                  <div className="border-t border-border/40 pt-3">
                                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                                      Причина переносу
                                    </p>
                                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                                      {t.transferredReason}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </>
                )}

              {call.expectedFeedbackDate && (
                <DetailRow label="Очікуваний фідбек">
                  {formatDateTime(call.expectedFeedbackDate)}
                </DetailRow>
              )}

              {call.nextStep && (
                <DetailRow label="Наступний етап">
                  <Badge variant="outline" className={badgeSheet}>
                    {callTypeLabels[call.nextStep]}
                  </Badge>
                </DetailRow>
              )}

              {call.nextStepDate && (
                <DetailRow label="Дата наступного етапу">
                  {formatDateTime(call.nextStepDate)}
                </DetailRow>
              )}
            </Section>

            {call.callLink && (
              <TextBlock title="Посилання на дзвінок" icon={Link2} variant="accent">
                <a
                  href={call.callLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-2 break-all text-base font-medium text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="mt-0.5 size-5 shrink-0" />
                  {call.callLink}
                </a>
              </TextBlock>
            )}

            {call.description && (
              <TextBlock title="Опис" icon={FileText}>
                <TextWithLinks text={call.description} className="whitespace-pre-wrap" />
              </TextBlock>
            )}

            {call.notes && (
              <TextBlock title="Нотатки" icon={StickyNote}>
                <TextWithLinks text={call.notes} className="whitespace-pre-wrap" />
              </TextBlock>
            )}

            {call.devFeedback && (
              <TextBlock title="Фідбек від виконавця" icon={MessageSquare}>
                <TextWithLinks text={call.devFeedback} className="whitespace-pre-wrap" />
              </TextBlock>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
