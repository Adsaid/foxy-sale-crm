"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  extractPlainTextFromEmojiHtml,
  plainTextToEmojiHtml,
} from "@/lib/twemoji";

export type EmojiTextareaRef = HTMLDivElement;

interface EmojiTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

function useMergedRef<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return React.useCallback(
    (node: T | null) => {
      for (const ref of refs) {
        if (!ref) continue;
        if (typeof ref === "function") ref(node);
        else (ref as React.MutableRefObject<T | null>).current = node;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable enough for merge
    refs,
  );
}

function syncDomFromValue(el: HTMLDivElement, value: string) {
  const current = extractPlainTextFromEmojiHtml(el);
  if (current !== value) {
    el.innerHTML = plainTextToEmojiHtml(value);
  }
}

export const EmojiTextarea = React.forwardRef<EmojiTextareaRef, EmojiTextareaProps>(
  function EmojiTextarea(
    { value, onChange, placeholder, rows = 3, className, disabled },
    ref,
  ) {
    const innerRef = React.useRef<HTMLDivElement>(null);
    const mergedRef = useMergedRef(ref, innerRef);
    const isFocusedRef = React.useRef(false);

    React.useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el || isFocusedRef.current) return;
      syncDomFromValue(el, value);
    }, [value]);

    function handleInput() {
      const el = innerRef.current;
      if (!el) return;
      onChange(extractPlainTextFromEmojiHtml(el));
    }

    function handleBlur() {
      isFocusedRef.current = false;
      const el = innerRef.current;
      if (!el) return;
      const plain = extractPlainTextFromEmojiHtml(el);
      el.innerHTML = plainTextToEmojiHtml(plain);
      if (plain !== value) onChange(plain);
    }

    function handleFocus() {
      isFocusedRef.current = true;
    }

    const minHeight = `calc(${rows} * 1.5rem + 1.5rem)`;

    return (
      <div
        ref={mergedRef}
        role="textbox"
        aria-multiline
        aria-placeholder={placeholder}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleBlur}
        onFocus={handleFocus}
        style={{ minHeight }}
        className={cn(
          "field-sizing-content no-scrollbar w-full min-w-0 max-w-full resize-none overflow-y-auto overflow-x-hidden break-words rounded-xl border border-input bg-input/30 px-3 py-3 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
          "[&_img.emoji]:mx-0.5 [&_img.emoji]:inline-block [&_img.emoji]:h-[1.125em] [&_img.emoji]:w-[1.125em] [&_img.emoji]:align-[-0.15em]",
          className,
        )}
      />
    );
  },
);
