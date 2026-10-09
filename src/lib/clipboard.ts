export type CopyResult = "ok" | "empty" | "error";

type ClipboardLike = { writeText: (text: string) => Promise<void> };

/** Copies text; resolves "ok" only after the clipboard write succeeded. */
export async function copyText(text: string | undefined | null, clipboard?: ClipboardLike): Promise<CopyResult> {
  if (!text || !text.trim()) return "empty";
  const clip = clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
  if (!clip?.writeText) return "error";
  try {
    await clip.writeText(text);
    return "ok";
  } catch {
    return "error";
  }
}
