"use client";

import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPickerPopoverProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export function ColorPickerPopover({
  value,
  onChange,
  ariaLabel,
  className,
}: ColorPickerPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "h-9 w-9 shrink-0 cursor-pointer rounded-md border transition hover:scale-105 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          style={{ backgroundColor: value || "#000000" }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-2 rounded-xl p-3">
        <HexColorPicker
          color={value || "#000000"}
          onChange={(next) => onChange(next.toUpperCase())}
          style={{ width: 220, height: 150 }}
        />
      </PopoverContent>
    </Popover>
  );
}
