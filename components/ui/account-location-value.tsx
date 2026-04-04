"use client";

import { CircleFlag } from "react-circle-flags";
import { cn } from "@/lib/utils";
import {
  formatAccountLocationLabel,
  resolveAccountLocationToAlpha2,
} from "@/lib/account-fields";

export function AccountLocationValue({
  location,
  className,
  emptyLabel = "—",
}: {
  location: string | null | undefined;
  className?: string;
  emptyLabel?: string;
}) {
  const label = formatAccountLocationLabel(location);
  const alpha2 = resolveAccountLocationToAlpha2(location);

  if (!label) {
    return (
      <span className={cn("text-muted-foreground", className)}>{emptyLabel}</span>
    );
  }

  if (!alpha2) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 align-middle",
        className
      )}
    >
      <span className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
        <CircleFlag countryCode={alpha2} height={20} />
      </span>
      <span className="min-w-0 truncate font-medium tabular-nums tracking-wide">
        {label}
      </span>
    </span>
  );
}
