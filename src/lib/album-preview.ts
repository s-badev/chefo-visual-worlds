/*
 * Tuning, in one place: the Photography page's albums list with a live preview (desktop, fine
 * pointer). Hovering or focusing a row makes it current; the preview wipes to its cover from the
 * side the pointer came from. styles.css (.photography-editorial-preview*) reads these values.
 */
export const ALBUM_PREVIEW = {
  /** Two columns and the preview only here; elsewhere the list stays as it always was. */
  query: "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
  /** Sticky offset: the header row's height (h-16) plus a gap, in rem. */
  headerRem: 4,
  stickyGapRem: 1.5,
  /** Wipe/iris of the incoming layer and the slow settle of its image. */
  wipeMs: 750,
  irisMs: 800,
  irisEase: "cubic-bezier(.5,0,.2,1)",
  ease: "cubic-bezier(.2,.7,.2,1)",
  zoomFrom: 1.07,
  zoomMs: 1400,
  /** Layers under the current one leave after this; never more than `maxLayers` at once. */
  removeAfterMs: 800,
  maxLayers: 3,
  /** Covers warmed on each side of the current row, when the browser is idle. */
  warmAround: 2,
  idleTimeoutMs: 1200,
  /** Selected row: indented by rowSlidePx; the arrow of the hovered/focused row moves arrowSlidePx. */
  rowSlidePx: 8,
  arrowSlidePx: 4,
} as const;

export type WipeDirection = "down" | "up" | null;

export type IrisOrigin = { x: string; y: string };

/** Moving down the list wipes up from the bottom; moving up wipes down from the top. */
export const wipeDirection = (fromIndex: number, toIndex: number): WipeDirection =>
  toIndex > fromIndex ? "down" : toIndex < fromIndex ? "up" : null;

export type PreviewLayer = {
  key: number;
  slug: string;
  dir: WipeDirection;
  origin?: IrisOrigin;
};

/**
 * Computes the iris origin (`X = 0%`, `Y` = vertical center of the hovered/focused row
 * relative to the preview frame). Falls back to `0% 50%` when layout metrics are zero.
 */
export function irisOriginFromRects(
  rowRect?: { top: number; height: number } | null,
  frameRect?: { top: number; height: number } | null,
): IrisOrigin {
  if (!rowRect || !frameRect || frameRect.height <= 0) {
    return { x: "0%", y: "50%" };
  }
  const rawPct = ((rowRect.top + rowRect.height / 2 - frameRect.top) / frameRect.height) * 100;
  const clamped = Math.max(0, Math.min(100, Number.isFinite(rawPct) ? rawPct : 50));
  return { x: "0%", y: `${Math.round(clamped * 10) / 10}%` };
}

/**
 * The stack after a new album becomes current. The last request always ends on top; an album
 * still in the stack is recycled (moved to the top with a fresh wipe) instead of duplicated; the
 * stack never grows past `max` (the oldest layers drop first).
 */
export function pushLayer(
  layers: PreviewLayer[],
  slug: string,
  dir: WipeDirection,
  key: number,
  max: number = ALBUM_PREVIEW.maxLayers,
  origin?: IrisOrigin,
): PreviewLayer[] {
  if (layers.at(-1)?.slug === slug) return layers;
  const entry: PreviewLayer = origin ? { key, slug, dir, origin } : { key, slug, dir };
  const next = [...layers.filter((layer) => layer.slug !== slug), entry];
  return next.slice(-Math.max(1, max));
}

/** After the wipe has finished only the current layer stays. */
export const settleLayers = (layers: PreviewLayer[]) => layers.slice(-1);

/** Slugs to warm around the current row: the next `around`, then the previous `around`. */
export function warmSlugs(
  slugs: string[],
  index: number,
  around: number = ALBUM_PREVIEW.warmAround,
) {
  const out: string[] = [];
  for (let d = 1; d <= around; d++) {
    if (slugs[index + d]) out.push(slugs[index + d]!);
    if (index - d >= 0 && slugs[index - d]) out.push(slugs[index - d]!);
  }
  return out;
}

/** What the preview shows for an album: its cover, else its first photo, else a typographic panel. */
export function previewSource<P>(cover: P | undefined, firstPhoto: P | undefined) {
  if (cover) return { kind: "photo" as const, photo: cover };
  if (firstPhoto) return { kind: "photo" as const, photo: firstPhoto };
  return { kind: "type" as const };
}
