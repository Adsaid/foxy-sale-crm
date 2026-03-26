"use client";

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface UseTableOptions<T> {
  data: T[] | undefined;
  /** Шляхи полів; крапка — вкладеність, напр. `account.account` */
  searchableFields: readonly string[];
  defaultSort?: SortState;
  defaultPageSize?: number;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function useTable<T>({
  data,
  searchableFields,
  defaultSort,
  defaultPageSize = 10,
}: UseTableOptions<T>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;

    const q = search.toLowerCase();
    return data.filter((item) =>
      searchableFields.some((field) => {
        const val = getNestedValue(item as Record<string, unknown>, field);
        if (val == null) return false;
        if (typeof val === "string") return val.toLowerCase().includes(q);
        if (typeof val === "number") return String(val).includes(q);
        if (typeof val === "object") return JSON.stringify(val).toLowerCase().includes(q);
        return false;
      })
    );
  }, [data, search, searchableFields]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = getNestedValue(a as Record<string, unknown>, sort.column);
      const bVal = getNestedValue(b as Record<string, unknown>, sort.column);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        cmp = aVal.localeCompare(bVal, "uk");
      } else if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), "uk");
      }

      return sort.direction === "desc" ? -cmp : cmp;
    });
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  function toggleSort(column: string) {
    setSort((prev) => {
      if (prev?.column === column) {
        if (prev.direction === "asc") return { column, direction: "desc" };
        return null;
      }
      return { column, direction: "asc" };
    });
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return {
    search,
    setSearch: handleSearchChange,
    sort,
    toggleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalPages,
    totalItems: sorted.length,
    rows: paginated,
    isFiltered: search.trim().length > 0,
  };
}
