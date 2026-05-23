"use client";

import { Fragment, type ReactNode } from "react";
import { plainTextToEmojiHtml } from "@/lib/twemoji";

/** http(s) URL до першого пробілу. */
const URL_RE = /(https?:\/\/[^\s<>"'`()[\]{}]+)/gi;

function hrefFromRaw(raw: string): { href: string; suffix: string } {
  let href = raw;
  let suffix = "";
  while (href.length > "https://a".length) {
    try {
      const u = new URL(href);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return { href, suffix };
      }
    } catch {
      /* continue stripping */
    }
    suffix = href.slice(-1) + suffix;
    href = href.slice(0, -1);
  }
  return { href: raw, suffix: "" };
}

function renderTextWithEmojis(text: string, keyPrefix: string): ReactNode {
  return (
    <span
      key={keyPrefix}
      className="[&_img.emoji]:mx-0.5 [&_img.emoji]:inline-block [&_img.emoji]:h-[1.125em] [&_img.emoji]:w-[1.125em] [&_img.emoji]:align-[-0.15em]"
      dangerouslySetInnerHTML={{ __html: plainTextToEmojiHtml(text) }}
    />
  );
}

export function TextWithLinks({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: ReactNode[] = [];
  let last = 0;
  const re = new RegExp(URL_RE.source, URL_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(renderTextWithEmojis(text.slice(last, m.index), `t-${last}`));
    }
    const raw = m[1];
    const { href, suffix } = hrefFromRaw(raw);
    try {
      const u = new URL(href);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        parts.push(renderTextWithEmojis(raw, `u-${m.index}`));
      } else {
        parts.push(
          <a
            key={`${m.index}-${href.slice(0, 32)}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-medium text-primary underline-offset-2 hover:underline"
          >
            {href}
          </a>
        );
        if (suffix) parts.push(renderTextWithEmojis(suffix, `s-${m.index}`));
      }
    } catch {
      parts.push(renderTextWithEmojis(raw, `e-${m.index}`));
    }
    last = m.index + raw.length;
  }
  if (last < text.length) {
    parts.push(renderTextWithEmojis(text.slice(last), `t-${last}`));
  }

  return (
    <p className={className}>
      {parts.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </p>
  );
}
