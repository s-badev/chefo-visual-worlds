export type CopyResult = "ok" | "empty" | "error";

type ClipboardLike = { writeText: (text: string) => Promise<void> };

/** Copies text; resolves "ok" only after the clipboard write succeeded. */
export async function copyText(text: string | undefined | null, clipboard?: ClipboardLike): Promise<CopyResult> {
  if (!text || !text.trim()) return "empty";
  const clip = clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
  if (!clip?.writeText) return copyWithoutClipboardApi(text);
  try {
    await clip.writeText(text);
    return "ok";
  } catch {
    return "error";
  }
}

/** Local-only fallback for browsers without the secure Clipboard API. */
function copyWithoutClipboardApi(text: string): CopyResult {
  if (typeof document === "undefined" || !document.body || !document.execCommand) return "error";
  const active = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index))
    : [];
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.tabIndex = -1;
  field.setAttribute("aria-hidden", "true");
  field.style.cssText = "position:fixed;inset:0;opacity:0;width:1px;height:1px;pointer-events:none";
  try {
    document.body.appendChild(field);
    field.select();
    return document.execCommand("copy") ? "ok" : "error";
  } catch {
    return "error";
  } finally {
    field.remove();
    if (active instanceof HTMLElement) active.focus({ preventScroll: true });
    if (selection) {
      selection.removeAllRanges();
      for (const range of ranges) selection.addRange(range);
    }
  }
}
