"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ManagerBadgeProps {
  name: string;
  bgColor?: string | null;
  textColor?: string | null;
  className?: string;
  withLabel?: boolean;
}

export function ManagerBadge({
  name,
  bgColor,
  textColor,
  className,
  withLabel = false,
}: ManagerBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("h-6 px-2.5 text-sm whitespace-nowrap", className)}
      style={{
        backgroundColor: bgColor ?? "#EEF2FF",
        color: textColor ?? "#3730A3",
        borderColor: textColor ?? "#3730A3",
      }}
    >
      {withLabel ? `Сейл: ${name}` : name}
    </Badge>
  );
}
