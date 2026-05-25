import twemoji from "twemoji";

const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/";

export const twemojiOptions = {
  base: TWEMOJI_BASE,
  folder: "svg",
  ext: ".svg",
} as const;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Unicode → HTML з <img class="emoji"> для коректного відображення прапорів на Windows. */
export function plainTextToEmojiHtml(text: string): string {
  // twemoji.parse не зберігає \n — розбиваємо рядки і з'єднуємо через <br>.
  return text
    .split("\n")
    .map((line) => twemoji.parse(escapeHtml(line), twemojiOptions))
    .join("<br>");
}

/** Зчитує plain text з DOM після twemoji (img.alt зберігає оригінальний emoji). */
export function extractPlainTextFromEmojiHtml(root: HTMLElement): string {
  let result = "";

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    if (el.tagName === "IMG" && el.classList.contains("emoji")) {
      result += el.getAttribute("alt") ?? "";
      return;
    }
    if (el.tagName === "BR") {
      result += "\n";
      return;
    }
    if (el.tagName === "DIV") {
      if (result.length > 0 && !result.endsWith("\n")) {
        result += "\n";
      }
      if (el.childNodes.length === 0) {
        result += "\n";
        return;
      }
      el.childNodes.forEach(walk);
      return;
    }
    el.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  return result.replace(/\n$/, "");
}

/** Довжина в plain text для вузла (узгоджено з extractPlainTextFromEmojiHtml). */
function nodePlainLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length ?? 0;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return 0;

  const el = node as HTMLElement;
  if (el.tagName === "IMG" && el.classList.contains("emoji")) {
    return el.getAttribute("alt")?.length ?? 0;
  }
  if (el.tagName === "BR") return 1;
  if (el.tagName === "DIV") {
    let len = 0;
    el.childNodes.forEach((child) => {
      len += nodePlainLength(child);
    });
    return len;
  }
  let len = 0;
  el.childNodes.forEach((child) => {
    len += nodePlainLength(child);
  });
  return len;
}

/** Позиція курсора в plain text contenteditable. */
export function getCaretCharacterOffset(root: HTMLElement): { start: number; end: number } {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { start: 0, end: 0 };
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return { start: 0, end: 0 };
  }

  return {
    start: getNodePlainOffset(root, range.startContainer, range.startOffset),
    end: getNodePlainOffset(root, range.endContainer, range.endOffset),
  };
}

function getNodePlainOffset(root: HTMLElement, targetNode: Node, targetOffset: number): number {
  let offset = 0;
  let found = false;

  const walk = (node: Node): boolean => {
    if (found) return true;

    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += targetOffset;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const children = node.childNodes;
        for (let i = 0; i < targetOffset && i < children.length; i++) {
          offset += nodePlainLength(children[i]!);
        }
      }
      found = true;
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length ?? 0;
      return false;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const el = node as HTMLElement;
    if (el.tagName === "IMG" && el.classList.contains("emoji")) {
      offset += el.getAttribute("alt")?.length ?? 0;
      return false;
    }
    if (el.tagName === "BR") {
      offset += 1;
      return false;
    }
    if (el.tagName === "DIV" && node !== root && node.parentNode === root) {
      if (offset > 0) offset += 1;
    }

    for (const child of Array.from(node.childNodes)) {
      if (walk(child)) return true;
    }
    return false;
  };

  for (const child of Array.from(root.childNodes)) {
    if (walk(child)) break;
  }

  return offset;
}

/** Ставить курсор у contenteditable за позицією в plain text. */
export function setCaretCharacterOffset(root: HTMLElement, position: number) {
  const selection = window.getSelection();
  if (!selection) return;

  let count = 0;
  let target: { node: Node; offset: number } | null = null;

  const place = (node: Node, offset: number) => {
    if (!target) target = { node, offset };
  };

  const walk = (node: Node): void => {
    if (target) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0;
      if (position <= count + len) {
        place(node, position - count);
        return;
      }
      count += len;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    if (el.tagName === "IMG" && el.classList.contains("emoji")) {
      const len = el.getAttribute("alt")?.length ?? 0;
      const parent = el.parentNode;
      if (!parent) return;
      const index = Array.from(parent.childNodes).indexOf(el);
      if (position <= count) {
        place(parent, index);
        return;
      }
      if (position <= count + len) {
        place(parent, index + 1);
        return;
      }
      count += len;
      return;
    }

    if (el.tagName === "BR") {
      const parent = el.parentNode;
      if (!parent) return;
      const index = Array.from(parent.childNodes).indexOf(el);
      if (position <= count) {
        place(parent, index);
        return;
      }
      if (position <= count + 1) {
        place(parent, index + 1);
        return;
      }
      count += 1;
      return;
    }

    if (el.tagName === "DIV" && node !== root && node.parentNode === root && count > 0) {
      if (position <= count) {
        place(root, Array.from(root.childNodes).indexOf(node as ChildNode));
        return;
      }
      count += 1;
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child);
    }
  };

  for (const child of Array.from(root.childNodes)) {
    walk(child);
  }

  if (!target) {
    if (root.lastChild?.nodeType === Node.TEXT_NODE) {
      place(root.lastChild, root.lastChild.textContent?.length ?? 0);
    } else {
      place(root, root.childNodes.length);
    }
  }

  const range = document.createRange();
  range.setStart(target!.node, target!.offset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Прапор = пара regional indicator (🇺🇦 тощо). */
export function isFlagEmoji(emoji: string): boolean {
  const codePoints = [...emoji].map((ch) => ch.codePointAt(0)!);
  return (
    codePoints.length === 2 &&
    codePoints.every((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
  );
}
