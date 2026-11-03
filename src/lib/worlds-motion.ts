/** Pure helpers behind the AI Worlds "One face, four worlds" scene; the component measures and applies. */
import { clamp01, smoothstep } from "@/lib/motion";

export const WORLD_COUNT = 4;
const LAST = WORLD_COUNT - 1;

/*
 * Tuning, in one place:
 * - WORLD_HOLDS: share of the track's travel each world is held steady (first and last longer).
 *   The three transitions split what is left equally (WORLD_FADE, 0.16 each with these holds).
 * - TEXT_OUT_END / TEXT_IN_START: within a transition (t 0..1) the outgoing text fades out over
 *   0..TEXT_OUT_END, the column stays empty, then the incoming text fades in over TEXT_IN_START..1.
 *   The two texts never overlap; the exposed group switches at t = 0.5, inside the empty gap.
 */
export const WORLD_HOLDS = [0.14, 0.12, 0.12, 0.14] as const;
export const WORLD_FADE = (1 - WORLD_HOLDS.reduce((a, b) => a + b, 0)) / LAST;
export const TEXT_OUT_END = 0.4;
export const TEXT_IN_START = 0.6;

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

/** Where world i's hold starts on the 0..1 track. */
const holdStart = (i: number) =>
  WORLD_HOLDS.slice(0, i).reduce((a: number, b) => a + b, 0) + i * WORLD_FADE;

/** Scroll progress through the pinned track (see progressAt). */
export function worldsProgress(sectionTop: number, sectionHeight: number, viewportHeight: number) {
  return progressAt(-sectionTop / Math.max(1, sectionHeight - viewportHeight));
}

/**
 * p runs 0..1 over the track. Inside a hold t is 0; inside a crossfade t eases 0..1 (smoothstep).
 * f is the continuous world position (i0 plus the linear share of the crossfade).
 */
export function progressAt(progress: number) {
  const p = clamp01(progress);
  let i0 = LAST;
  let raw = 0;
  for (let i = 0; i < LAST; i++) {
    const fadeStart = holdStart(i) + WORLD_HOLDS[i]!;
    if (p < fadeStart + WORLD_FADE) {
      i0 = i;
      raw = clamp01((p - fadeStart) / WORLD_FADE);
      break;
    }
  }
  const i1 = Math.min(LAST, i0 + 1);
  return { p, f: i0 + raw, i0, i1, t: smoothstep(raw) };
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

/** Share of the outgoing fade-out and the incoming fade-in done at t (each eased, 0..1). */
export const textFades = (t: number) => ({
  out: smoothstep(clamp01(clamp01(t) / TEXT_OUT_END)),
  in: smoothstep(clamp01((clamp01(t) - TEXT_IN_START) / (1 - TEXT_IN_START))),
});

/**
 * Title and description groups, in sequence: the outgoing one fades out (drifting up), the column
 * stays empty, then the incoming one fades in (rising into place). Never two texts at once.
 */
export function textStates(i0: number, t: number) {
  const fade = textFades(t);
  return Array.from({ length: WORLD_COUNT }, (_, i) => {
    if (i0 >= LAST) return { opacity: i === LAST ? 1 : 0, y: 0 };
    if (i === i0) return { opacity: 1 - fade.out, y: -8 * fade.out };
    if (i === i0 + 1) return { opacity: fade.in, y: 18 * (1 - fade.in) };
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

/** Where world i is shown steadily: the track's ends for the first and last, mid-hold between. */
export const steadyProgress = (i: number) =>
  i <= 0 ? 0 : i >= LAST ? 1 : holdStart(i) + WORLD_HOLDS[i]! / 2;

/** Scroll position at which world i is shown steadily (one pixel in, so the pin has started). */
export const worldScrollTarget = (
  i: number,
  sectionDocTop: number,
  sectionHeight: number,
  viewportHeight: number,
) => sectionDocTop + steadyProgress(i) * Math.max(0, sectionHeight - viewportHeight) + 1;
