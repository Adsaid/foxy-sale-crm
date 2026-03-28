"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableBodySkeletonProps {
  colSpan: number;
  /** Кількість «рядків»-плейсхолдерів (за замовчуванням близько до типового page size) */
  rows?: number;
}

export function TableBodySkeleton({ colSpan, rows = 8 }: TableBodySkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan} className="py-2.5">
            <Skeleton className="h-5 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
