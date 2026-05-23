"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { EmojiTextarea } from "@/components/ui/emoji-textarea";
import { EmojiPickerButton } from "@/components/ui/emoji-picker-button";
import { cn } from "@/lib/utils";

interface EmojiTextareaFieldProps {
  /** За замовчуванням «Опис»; передайте `null`, щоб приховати лейбл. */
  label?: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  textareaClassName?: string;
  disabled?: boolean;
}

export function EmojiTextareaField({
  label = "Опис",
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  textareaClassName,
  disabled,
}: EmojiTextareaFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      {label !== null ? <Label>{label ?? "Опис"}</Label> : null}
      <div className="relative">
        <EmojiTextarea
          ref={fieldRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn("pb-10 pe-10", textareaClassName)}
        />
        <EmojiPickerButton
          fieldRef={fieldRef}
          value={value}
          onChange={onChange}
          disabled={disabled}
          side="top"
          align="end"
          className="absolute bottom-2 right-2 z-10 bg-background/80 shadow-sm backdrop-blur-sm hover:bg-muted/80"
        />
      </div>
    </div>
  );
}
