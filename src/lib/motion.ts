/** Pure helpers behind the scroll-driven Home motion; the components only measure and apply. */

export const clamp01 = (value: number) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/** Smooth start and end: 3p² − 2p³. */
export const smoothstep = (p: number) => p * p * (3 - 2 * p);

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Wide screens that fit the whole hero pin it for an extra 70svh of scrolling (see styles.css).
 * Taller, shorter and narrower screens scroll the hero normally and shift the colours over the
 * first 45% of its height instead.
 */
export const HERO_PIN_QUERY = "(min-width: 900px) and (min-height: 640px) and (max-height: 1000px)";

export function heroProgress({
  wrapperTop,
  wrapperHeight,
  heroHeight,
  pinned,
  reducedMotion,
}: {
  wrapperTop: number;
  wrapperHeight: number;
  heroHeight: number;
  pinned: boolean;
  reducedMotion: boolean;
}) {
  if (reducedMotion) return 0;
  const p = pinned
    ? -wrapperTop / Math.max(1, wrapperHeight - heroHeight)
    : -wrapperTop / Math.max(1, heroHeight * 0.45);
  return smoothstep(clamp01(p));
}

export const COUNT_UP_MS = 1000;
export const CARD_STAGGER_MS = 150;

/** Whole-number count from 0 to `target`; `delay` lets each card start with its reveal. */
export function countUpValue(
  target: number,
  elapsedMs: number,
  { duration = COUNT_UP_MS, delay = 0, reducedMotion = false } = {},
) {
  if (reducedMotion) return target;
  return Math.round(target * easeOutCubic(clamp01((elapsedMs - delay) / duration)));
}
