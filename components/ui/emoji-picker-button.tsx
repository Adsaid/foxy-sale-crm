"use client";

import "./emoji-picker-overrides.css";

import * as React from "react";
import dynamic from "next/dynamic";
import { SmilePlus } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Theme,
  EmojiStyle,
  type EmojiClickData,
} from "emoji-picker-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  extractPlainTextFromEmojiHtml,
  getCaretCharacterOffset,
  plainTextToEmojiHtml,
  setCaretCharacterOffset,
} from "@/lib/twemoji";
import type { EmojiTextareaRef } from "@/components/ui/emoji-textarea";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="space-y-2 p-2">
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 32 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>
    </div>
  ),
});

type Align = "start" | "center" | "end";
type Side = "top" | "bottom" | "left" | "right";

type EmojiFieldElement =
  | HTMLTextAreaElement
  | HTMLInputElement
  | EmojiTextareaRef;

interface SavedSelection {
  start: number;
  end: number;
}

interface EmojiPickerButtonProps {
  fieldRef?: React.RefObject<EmojiFieldElement | null>;
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
  className?: string;
  side?: Side;
  align?: Align;
  disabled?: boolean;
}

function readNativeSelection(field: HTMLTextAreaElement | HTMLInputElement): SavedSelection {
  return {
    start: field.selectionStart ?? field.value.length,
    end: field.selectionEnd ?? field.value.length,
  };
}

function insertInNativeField(
  value: string,
  insert: string,
  selection: SavedSelection,
): { next: string; caret: number } {
  const start = Math.min(selection.start, value.length);
  const end = Math.min(selection.end, value.length);
  const next = value.slice(0, start) + insert + value.slice(end);
  return { next, caret: start + insert.length };
}

function insertInContentEditableAtSelection(
  field: EmojiTextareaRef,
  insert: string,
  selection: SavedSelection,
): { next: string; caret: number } {
  const plain = extractPlainTextFromEmojiHtml(field);
  const start = Math.min(selection.start, plain.length);
  const end = Math.min(selection.end, plain.length);
  const next = plain.slice(0, start) + insert + plain.slice(end);
  const caret = start + insert.length;

  field.innerHTML = plainTextToEmojiHtml(next);

  return { next, caret };
}

export function EmojiPickerButton({
  fieldRef,
  value,
  onChange,
  ariaLabel = "Додати емодзі",
  className,
  side = "top",
  align = "end",
  disabled,
}: EmojiPickerButtonProps) {
  const [open, setOpen] = React.useState(false);
  const savedSelectionRef = React.useRef<SavedSelection | null>(null);
  /** Позиція курсора після вставки — відновлюємо в onCloseAutoFocus, не на кнопці-тригері. */
  const pendingCaretRef = React.useRef<number | null>(null);
  const { resolvedTheme } = useTheme();

  const pickerTheme: Theme =
    resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  const pickerEmojiStyle = EmojiStyle.GOOGLE;

  function saveSelection() {
    const field = fieldRef?.current;
    if (!field) return;

    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      savedSelectionRef.current = readNativeSelection(field);
      return;
    }

    savedSelectionRef.current = getCaretCharacterOffset(field);
  }

  React.useEffect(() => {
    if (!open) return;

    const onSelectionChange = () => {
      const field = fieldRef?.current;
      if (!field) return;
      if (document.activeElement !== field) return;
      saveSelection();
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [open, fieldRef]);

  function handleOpenChange(next: boolean) {
    if (next) {
      saveSelection();
      // Фокус у contenteditable поза popover — Radix закриває його при кліку в пікер.
      fieldRef?.current?.blur();
    }
    setOpen(next);
  }

  function handleTriggerMouseDown(e: React.MouseEvent) {
    // Не забираємо фокус з поля — інакше губиться позиція курсора.
    e.preventDefault();
    saveSelection();
  }

  function restoreFieldFocus() {
    const field = fieldRef?.current;
    const caret = pendingCaretRef.current;
    pendingCaretRef.current = null;
    if (!field || caret == null) return;

    requestAnimationFrame(() => {
      field.focus();
      try {
        if (
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLInputElement
        ) {
          field.setSelectionRange(caret, caret);
        } else {
          setCaretCharacterOffset(field, caret);
        }
      } catch {
        /* ignore */
      }
    });
  }

  function handleEmojiClick(data: EmojiClickData) {
    const field = fieldRef?.current ?? null;
    const selection = savedSelectionRef.current ?? {
      start: value.length,
      end: value.length,
    };

    if (!field) {
      const { next, caret } = insertInNativeField(value, data.emoji, selection);
      pendingCaretRef.current = caret;
      onChange(next);
      setOpen(false);
      return;
    }

    if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
      const plain = field.value;
      const { next, caret } = insertInNativeField(plain, data.emoji, selection);
      pendingCaretRef.current = caret;
      onChange(next);
      setOpen(false);
      return;
    }

    const { next, caret } = insertInContentEditableAtSelection(
      field,
      data.emoji,
      selection,
    );
    pendingCaretRef.current = caret;
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover modal={false} open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={ariaLabel}
          disabled={disabled}
          onMouseDown={handleTriggerMouseDown}
          className={cn("text-muted-foreground hover:text-foreground", className)}
        >
          <SmilePlus />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="z-[60] w-auto rounded-2xl border border-border bg-popover p-0 shadow-2xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          // Radix за замовчуванням фокусує кнопку 😀 — повертаємо фокус у поле опису.
          e.preventDefault();
          restoreFieldFocus();
        }}
        onFocusOutside={(e) => {
          // Пікер у порталі dialog — не закривати при перемиканні фокусу з поля опису.
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest(".EmojiPickerReact")) {
            e.preventDefault();
          }
        }}
      >
        <EmojiPicker
          className="foxy-emoji-picker"
          onEmojiClick={handleEmojiClick}
          theme={pickerTheme}
          emojiStyle={pickerEmojiStyle}
          lazyLoadEmojis
          searchPlaceholder="Пошук емодзі..."
          width={320}
          height={400}
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
        />
      </PopoverContent>
    </Popover>
  );
}
