/** Pure helpers behind the Home "One face, four worlds" scene; the component measures and applies. */
import { clamp01, smoothstep } from "@/lib/motion";

export type Box = { width: number; height: number };
export type Eyes = { mx: number; my: number; d: number };

/** Where the face is held in the portrait box: the pupils' midpoint and the pupil distance. */
export const faceAnchor = ({ width, height }: Box) => ({
  ax: width * 0.5,
  ay: height * 0.38,
  D: width * 0.108,
});

/**
 * Scales and places one portrait so its pupils' midpoint lands on the anchor and its pupils sit D
 * apart. No cropping or distortion: one uniform scale, then a translation.
 */
export function computeFaceLayout(
  box: Box,
  image: { naturalWidth: number; naturalHeight: number; eyes: Eyes },
) {
  const { ax, ay, D } = faceAnchor(box);
  const s = D / image.eyes.d;
  return {
    scale: s,
    width: image.naturalWidth * s,
    height: image.naturalHeight * s,
    left: ax - image.eyes.mx * s,
    top: ay - image.eyes.my * s,
    originX: image.eyes.mx * s,
    originY: image.eyes.my * s,
  };
}

/** Gold viewfinder brackets around the held face. */
export function viewfinderRect(box: Box) {
  const { ax, ay, D } = faceAnchor(box);
  const width = D * 2.9;
  const height = D * 3.7;
  return { left: ax - width / 2, top: ay - height * 0.36, width, height };
}

export const WORLD_COUNT = 4;
const LAST = WORLD_COUNT - 1;

/**
 * Scroll progress through the pinned track. f runs 0..3; each step holds the current world, then
 * crossfades to the next between 22% and 78% of the step (smoothstep t).
 */
export function worldsProgress(sectionTop: number, sectionHeight: number, viewportHeight: number) {
  const p = clamp01(-sectionTop / Math.max(1, sectionHeight - viewportHeight));
  return progressAt(p * LAST);
}

export function progressAt(f: number) {
  const p = clamp01(f / LAST);
  f = p * LAST;
  const i0 = Math.min(LAST, Math.floor(f));
  const i1 = Math.min(LAST, i0 + 1);
  const raw = clamp01((f - i0 - 0.22) / 0.56);
  const t = i0 === LAST ? 0 : smoothstep(raw);
  return { p, f, i0, i1, t };
}

/**
 * Portrait and background layers: the current one stays fully opaque under the incoming one
 * (stacked above by index), so the stage never shows a gap. Opacities do not sum to 1.
 */
export function layerOpacities(i0: number, t: number): number[] {
  return Array.from({ length: WORLD_COUNT }, (_, i) => {
    if (i0 >= LAST) return i === LAST ? 1 : 0;
    if (i === i0) return 1;
    if (i === i0 + 1) return t;
    return 0;
  });
}

/** Softening of the two portraits while they cross: up to 4px blur at t = 0.5. */
export function crossBlur(t: number) {
  const blur = 4 * (1 - Math.abs(2 * clamp01(t) - 1));
  return { blur, scale: 1 + blur * 0.009 };
}

/** Title and description groups: a short overlap so the column is never empty. */
export function textStates(i0: number, t: number) {
  return Array.from({ length: WORLD_COUNT }, (_, i) => {
    if (i0 >= LAST) return { opacity: i === LAST ? 1 : 0, y: 0 };
    if (i === i0) return { opacity: 1 - clamp01(t / 0.6), y: -8 * t };
    if (i === i0 + 1) return { opacity: clamp01((t - 0.4) / 0.6), y: 18 * (1 - t) };
    return { opacity: 0, y: 0 };
  });
}

/** The group that is readable and interactive: the outgoing one until halfway, then the next. */
export const exposedIndex = (i0: number, t: number) => (i0 >= LAST ? LAST : t < 0.5 ? i0 : i0 + 1);

/** Must match the CSS media query that shows the pinned stage (see styles.css). */
export const WORLDS_PIN_QUERY =
  "(min-width: 900px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)";

/** Phones, short windows and reduced motion get the plain stacked layout. */
export const isStackedWorlds = ({
  width,
  height,
  reducedMotion,
}: {
  width: number;
  height: number;
  reducedMotion: boolean;
}) => width < 900 || height < 600 || reducedMotion;

/** Scroll position at which world i is shown steadily (one pixel in, so floor() lands on i). */
export const worldScrollTarget = (
  i: number,
  sectionDocTop: number,
  sectionHeight: number,
  viewportHeight: number,
) => sectionDocTop + (i / LAST) * Math.max(0, sectionHeight - viewportHeight) + 1;
