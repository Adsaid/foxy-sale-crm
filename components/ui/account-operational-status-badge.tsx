import { Badge } from "@/components/ui/badge";
import { accountOperationalStatusLabelUk } from "@/lib/account-fields";
import type { AccountOperationalStatus } from "@/types/crm";
import { cn } from "@/lib/utils";

/**
 * Той самий мовний стиль, що й `AccountTypeBadge`: outline, легкий фон і бордер з палітри теми.
 */
const STATUS_CLASS: Record<AccountOperationalStatus, string> = {
  ACTIVE:
    "border-primary/45 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/16 dark:text-primary",
  WARMING:
    "border-chart-1/50 bg-chart-1/12 text-foreground dark:border-chart-1/42 dark:bg-chart-1/18 dark:text-foreground",
  SETUP:
    "border-chart-3/48 bg-chart-3/10 text-foreground dark:border-chart-3/40 dark:bg-chart-3/16 dark:text-foreground",
  PAUSED:
    "border-orange-400/55 bg-orange-100/80 text-orange-800 dark:border-orange-500/40 dark:bg-orange-950/45 dark:text-orange-200",
  LIMITED:
    "border-border bg-muted/80 text-muted-foreground dark:border-border dark:bg-muted/60 dark:text-muted-foreground",
};

export function AccountOperationalStatusBadge({
  status,
  className,
}: {
  status: AccountOperationalStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 shrink-0 px-2 text-sm font-medium whitespace-nowrap",
        STATUS_CLASS[status],
        className
      )}
    >
      {accountOperationalStatusLabelUk[status]}
    </Badge>
  );
}
