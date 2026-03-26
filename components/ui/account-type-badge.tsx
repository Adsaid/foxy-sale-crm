"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AccountType } from "@/types/crm";

/** Бренд-кольори: Upwork — зелений, LinkedIn — синій */
const VARIANT: Record<
  AccountType,
  { label: string; className: string }
> = {
  UPWORK: {
    label: "Upwork",
    className:
      "border-[#14a800]/40 bg-[#14a800]/12 text-[#0d6600] dark:border-[#6fda44]/35 dark:bg-[#14a800]/20 dark:text-[#b8f5a0]",
  },
  LINKEDIN: {
    label: "LinkedIn",
    className:
      "border-[#0A66C2]/45 bg-[#0A66C2]/10 text-[#0A66C2] dark:border-[#70b5f9]/40 dark:bg-[#0A66C2]/25 dark:text-[#b3d9ff]",
  },
};

export function AccountTypeBadge({
  type,
  className,
}: {
  type: AccountType | string;
  className?: string;
}) {
  const v = VARIANT[type as AccountType];
  const label = v?.label ?? String(type);
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 shrink-0 px-2 text-sm whitespace-nowrap",
        v?.className,
        !v && "border-border bg-muted/50 text-muted-foreground",
        className
      )}
    >
      {label}
    </Badge>
  );
}
