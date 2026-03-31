"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { useTechnologies } from "@/hooks/use-technologies";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Обмежити список стеком розробника або дизайнера. */
  audience?: "DEV" | "DESIGNER";
}

export function TechnologyMultiSelect({ value, onChange, audience }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: technologies = [], isLoading } = useTechnologies(audience);

  const filtered = useMemo(
    () =>
      technologies.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) &&
          !value.includes(t.id)
      ),
    [technologies, search, value]
  );

  const selectedTechnologies = useMemo(
    () => technologies.filter((t) => value.includes(t.id)),
    [technologies, value]
  );

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
      setSearch("");
    }
  };

  return (
    <div className="space-y-2">
      {selectedTechnologies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTechnologies.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1">
              {t.name}
              <button
                type="button"
                onClick={() => toggle(t.id)}
                className="ml-0.5 rounded-full hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          placeholder={isLoading ? "Завантаження..." : "Пошук технологій..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          disabled={isLoading}
        />
        {open && !isLoading && filtered.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
            {filtered.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(t.id);
                }}
              >
                {t.name}
              </Button>
            ))}
          </div>
        )}
        {isLoading && (
          <div className="mt-2 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
