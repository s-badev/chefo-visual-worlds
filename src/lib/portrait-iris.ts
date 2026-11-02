export type PortraitMode = "real" | "ai";

/*
 * Tuning, in one place: the "Реален кадър / AI версия" iris. The AI portrait lies over the real one,
 * clipped to a circle that opens from under the pressed button (x) at the frame's bottom edge, while
 * a thin gold ring expands from the same point. styles.css (.portrait-iris*) reads these values.
 */
export const IRIS = {
  durationMs: 900,
  ease: "cubic-bezier(.65,0,.25,1)",
  /** Clip radius when the AI portrait is fully shown. */
  openRadius: "150%",
  /** Ring end size, as a share of the frame width, and its start opacity. */
  ringTo: "260%",
  ringOpacity: 0.9,
  /** Origin height: the frame's bottom edge. */
  originY: "100%",
} as const;

/** Origin x (% of the frame width) under the centre of the pressed button, kept inside the frame. */
export const irisOriginX = (
  button: { left: number; width: number },
  frame: { left: number; width: number },
) => {
  if (!frame.width) return 50;
  const x = ((button.left + button.width / 2 - frame.left) / frame.width) * 100;
  return Math.min(100, Math.max(0, Math.round(x * 10) / 10));
};

/** The AI layer's clip: a closed or open circle around the current origin. */
export const irisClip = (open: boolean) =>
  `circle(${open ? IRIS.openRadius : "0%"} at var(--iris-x) var(--iris-y))`;

/**
 * Pressing a segment: nothing happens for the current mode; otherwise the mode switches and a new
 * ring starts (none under reduced motion). The last press always wins.
 */
export const pressIris = (
  current: PortraitMode,
  pressed: PortraitMode,
  ring: number | null,
  reducedMotion: boolean,
): { mode: PortraitMode; ring: number | null } | null =>
  current === pressed ? null : { mode: pressed, ring: reducedMotion ? null : (ring ?? 0) + 1 };
