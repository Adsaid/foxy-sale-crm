"use client";

import { Badge } from "@/components/ui/badge";
import { assigneeSpecLabelsUk, callerRoleShortEn } from "@/lib/roles";
import type { DevUser } from "@/types/crm";

/** Розмітка пункту списку виконавців: ПІБ зліва, роль і спеціалізація справа; стек — окремим рядком під лінією. */
export function AssigneeOptionContent({ dev }: { dev: DevUser }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
      <div className="flex min-w-0 w-full flex-row items-start justify-between gap-2">
        <span className="min-w-0 flex-1 text-left font-medium leading-snug">
          {dev.firstName} {dev.lastName}
        </span>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {callerRoleShortEn(dev.role)}
          </Badge>
          {dev.specialization ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {assigneeSpecLabelsUk[dev.specialization] ?? dev.specialization}
            </Badge>
          ) : null}
        </div>
      </div>
      {dev.technologies.length > 0 ? (
        <div className="flex min-w-0 w-full flex-wrap content-start items-center gap-1 border-t border-border/40 pt-1">
          {dev.technologies.map((t) => (
            <Badge key={t.id} variant="outline" className="px-1.5 py-0 text-[10px]">
              {t.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
