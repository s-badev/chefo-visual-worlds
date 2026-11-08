// Geometry and gesture rules of the full-screen viewer, taken from the approved mock (v12:
// lbRect, lbFit, zAt, zClamp, zToggle and the pointer handlers in lbInit). Pure functions, so
// they are unit-tested without a browser; the Lightbox component only measures and paints.

/** The mock's numbers. */
export const LB = {
  /** Largest upscale when an image is fitted to the stage. */
  fitMax: 1.6,
  zoomMin: 1,
  zoomMax: 4,
  /** Double-click / double-tap and the zoom button toggle to this scale. */
  zoomToggle: 2.4,
  /** The + and - keys multiply or divide the scale by this. */
  zoomStep: 1.4,
  /** Wheel zoom: scale *= exp(-deltaY * wheel). */
  wheel: 0.0022,
  /** Below this the image counts as not zoomed. */
  zoomEpsilon: 0.001,
  doubleTapMs: 320,
  /** A press that moved less than this (sum of |dx| + |dy|) is a tap. */
  tapSlop: 8,
  /** A swipe needs at least this much total movement... */
  swipeMove: 40,
  /** ...a horizontal distance over this and over `swipeRatio` times the vertical one. */
  swipeX: 50,
  swipeRatio: 1.3,
  /** Touch only: a downward swipe over `closeY` with a horizontal drift under `closeMaxX` closes. */
  closeY: 110,
  closeMaxX: 70,
  /** Portrait images use the floating side card from this viewport width. */
  sideMinWidth: 900,
  /** The side card must clear the fitted image by the gutter (32) plus this gap (20). */
  sideClearance: 52,
  flyInMs: 420,
  flyOutMs: 240,
  /** The fly-back hands focus back and starts fading the layer after this long. */
  flyOutDoneMs: 150,
  /** The viewer layer fades out over this long. */
  fadeOutMs: 230,
  slideFadeMs: 260,
  slideMoveMs: 320,
  slidePx: 24,
  slideFrom: 0.3,
  zoomAnimMs: 280,
} as const;

export const EASE_OUT = "cubic-bezier(.22,1,.36,1)";
export const EASE_IN = "cubic-bezier(.4,0,1,1)";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Zoom {
  s: number;
  x: number;
  y: number;
}

export const NO_ZOOM: Zoom = { s: 1, x: 0, y: 0 };

export const isZoomed = (z: Zoom) => z.s > 1 + LB.zoomEpsilon;

/** The image's box when fitted (centred, never upscaled beyond `fitMax`) into the stage. */
export function fitRect(stage: Box, width: number, height: number, max = LB.fitMax): Box {
  if (!(width > 0 && height > 0)) return { ...stage, width: 0, height: 0 };
  const k = Math.max(0, Math.min(stage.width / width, stage.height / height, max));
  const w = Math.round(width * k);
  const h = Math.round(height * k);
  return {
    left: stage.left + (stage.width - w) / 2,
    top: stage.top + (stage.height - h) / 2,
    width: w,
    height: h,
  };
}

/** Portrait images on wide screens get the side card, unless the fitted image would run into it. */
export function wantsSideCard(width: number, height: number, viewportWidth: number) {
  return height > width && viewportWidth >= LB.sideMinWidth;
}
export function sideCardFits(image: Box, viewportWidth: number, cardWidth: number) {
  return image.left + image.width <= viewportWidth - LB.sideClearance - cardWidth;
}

/** Keeps a zoomed image covering the stage: the pan never shows more than the image's edge. */
export function clampPan(z: Zoom, image: { width: number; height: number }, stage: Box): Zoom {
  const mx = Math.max(0, (image.width * z.s - stage.width) / 2);
  const my = Math.max(0, (image.height * z.s - stage.height) / 2);
  return {
    s: z.s,
    // `|| 0` turns -0 into 0.
    x: Math.max(-mx, Math.min(mx, z.x)) || 0,
    y: Math.max(-my, Math.min(my, z.y)) || 0,
  };
}

/** Zooms to `scale` keeping the point (cx, cy) under the pointer; back at 1 it recentres. */
export function zoomAt(
  z: Zoom,
  scale: number,
  cx: number,
  cy: number,
  stage: Box,
  image: { width: number; height: number },
): Zoom {
  const s = Math.max(LB.zoomMin, Math.min(LB.zoomMax, scale));
  if (s <= 1 + LB.zoomEpsilon) return NO_ZOOM;
  const ox = stage.left + stage.width / 2;
  const oy = stage.top + stage.height / 2;
  const k = s / z.s;
  return clampPan(
    { s, x: cx - ox - (cx - ox - z.x) * k, y: cy - oy - (cy - oy - z.y) * k },
    image,
    stage,
  );
}

/** Double-click, double-tap and the zoom button: fit <-> `zoomToggle`. */
export const toggleScale = (z: Zoom) => (isZoomed(z) ? 1 : LB.zoomToggle);

export const wheelFactor = (deltaY: number) => Math.exp(-deltaY * LB.wheel);

export const zoomTransform = (z: Zoom) =>
  `translate(${z.x.toFixed(1)}px, ${z.y.toFixed(1)}px) scale(${z.s.toFixed(3)})`;

/** The transform (origin 0 0) that lays the box `to` exactly over `from`: the fly-in start. */
export const flyTransform = (from: Box, to: Box) =>
  to.width > 0 && to.height > 0
    ? `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`
    : "none";

export type SwipeResult = "next" | "prev" | "close" | null;

/** What a finished one-finger drag means when the image is not zoomed. */
export function classifySwipe(g: {
  dx: number;
  dy: number;
  moved: number;
  pointerType: string;
  zoomed: boolean;
}): SwipeResult {
  if (g.zoomed || g.moved <= LB.swipeMove) return null;
  if (Math.abs(g.dx) > LB.swipeX && Math.abs(g.dx) > Math.abs(g.dy) * LB.swipeRatio)
    return g.dx < 0 ? "next" : "prev";
  if (g.pointerType === "touch" && g.dy > LB.closeY && Math.abs(g.dx) < LB.closeMaxX)
    return "close";
  return null;
}

/** A second tap on the image within the window makes a double tap. */
export const isDoubleTap = (previousTapAt: number | null, now: number) =>
  previousTapAt !== null && now - previousTapAt < LB.doubleTapMs;

/* ---------- gesture state machine ---------- */

export type GesturePhase = "idle" | "tap" | "pan" | "pinch" | "swipe";

export interface GestureState {
  phase: GesturePhase;
  pointers: Record<number, { x: number; y: number }>;
  startX: number;
  startY: number;
  /** Total movement of the gesture, as the sum of |dx| + |dy| of every pointer step. */
  moved: number;
  pointerType: string;
  /** A pinch happened during this gesture: its end is never a swipe or a tap. */
  pinched: boolean;
  pinchDistance: number;
  pinchScale: number;
}

export const IDLE: GestureState = {
  phase: "idle",
  pointers: {},
  startX: 0,
  startY: 0,
  moved: 0,
  pointerType: "mouse",
  pinched: false,
  pinchDistance: 1,
  pinchScale: 1,
};

export type GestureEvent =
  | { type: "down"; id: number; x: number; y: number; pointerType: string; scale: number }
  | { type: "move"; id: number; x: number; y: number; zoomed: boolean }
  | { type: "up"; id: number; x: number; y: number; zoomed: boolean }
  | { type: "cancel"; id: number };

export type GestureIntent =
  | { type: "pan"; dx: number; dy: number }
  | { type: "pinch"; scale: number; cx: number; cy: number }
  | { type: "tap"; x: number; y: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "close" }
  | null;

const firstTwo = (pointers: GestureState["pointers"]) => {
  const ids = Object.keys(pointers).map(Number).slice(0, 2);
  return ids.length === 2 ? [pointers[ids[0]!]!, pointers[ids[1]!]!] : null;
};

/**
 * One step of the viewer's gestures. Phases: idle -> tap (one pointer down) -> pan (zoomed and
 * moving) or swipe (not zoomed, moved past the tap slop); two pointers -> pinch. A third pointer
 * is tracked but ignored by the pinch; pan and pinch never end in a swipe, a swipe never zooms.
 */
export function gestureStep(
  state: GestureState,
  event: GestureEvent,
): { state: GestureState; intent: GestureIntent } {
  if (event.type === "down") {
    const pointers = { ...state.pointers, [event.id]: { x: event.x, y: event.y } };
    const count = Object.keys(pointers).length;
    if (count === 1) {
      return {
        state: {
          ...IDLE,
          phase: "tap",
          pointers,
          startX: event.x,
          startY: event.y,
          pointerType: event.pointerType,
        },
        intent: null,
      };
    }
    const pair = firstTwo(pointers)!;
    const pinchDistance =
      count === 2
        ? Math.hypot(pair[0]!.x - pair[1]!.x, pair[0]!.y - pair[1]!.y) || 1
        : state.pinchDistance;
    return {
      state: {
        ...state,
        pointers,
        phase: "pinch",
        pinched: true,
        moved: 0,
        pinchDistance,
        pinchScale: count === 2 ? event.scale : state.pinchScale,
      },
      intent: null,
    };
  }

  if (event.type === "move") {
    const previous = state.pointers[event.id];
    if (!previous) return { state, intent: null };
    const dx = event.x - previous.x;
    const dy = event.y - previous.y;
    const pointers = { ...state.pointers, [event.id]: { x: event.x, y: event.y } };
    const moved = state.moved + Math.abs(dx) + Math.abs(dy);
    const count = Object.keys(pointers).length;
    if (count >= 2) {
      const [a, b] = firstTwo(pointers)!;
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      return {
        state: { ...state, pointers, moved, phase: "pinch", pinched: true },
        intent: {
          type: "pinch",
          scale: (state.pinchScale * distance) / state.pinchDistance,
          cx: (a!.x + b!.x) / 2,
          cy: (a!.y + b!.y) / 2,
        },
      };
    }
    if (event.zoomed) {
      return {
        state: { ...state, pointers, moved, phase: "pan" },
        intent: { type: "pan", dx, dy },
      };
    }
    const phase = state.phase === "tap" && moved >= LB.tapSlop ? "swipe" : state.phase;
    return { state: { ...state, pointers, moved, phase }, intent: null };
  }

  if (event.type === "cancel") {
    const pointers = { ...state.pointers };
    delete pointers[event.id];
    return {
      state: Object.keys(pointers).length ? { ...state, pointers } : IDLE,
      intent: null,
    };
  }

  // up
  if (!state.pointers[event.id]) return { state, intent: null };
  const pointers = { ...state.pointers };
  delete pointers[event.id];
  if (Object.keys(pointers).length) return { state: { ...state, pointers }, intent: null };
  if (state.pinched || state.phase === "pan") return { state: IDLE, intent: null };
  if (state.moved < LB.tapSlop)
    return { state: IDLE, intent: { type: "tap", x: event.x, y: event.y } };
  const swipe = classifySwipe({
    dx: event.x - state.startX,
    dy: event.y - state.startY,
    moved: state.moved,
    pointerType: state.pointerType,
    zoomed: event.zoomed,
  });
  return { state: IDLE, intent: swipe ? { type: swipe } : null };
}

/** A grid's thumbnail for an item, marked with data-thumb-index by the grid. */
export const thumbAt = (root: ParentNode | null | undefined, index: number) =>
  root?.querySelector<HTMLElement>(`[data-thumb-index="${index}"]`) ?? null;

/**
 * Album pages can show a photograph twice (a curated figure and the full grid), each button
 * marked with data-full-index. The item's thumbnail is the opener while it shows that item,
 * otherwise the nearest button for the item around the opener (the same grid first).
 */
export function albumThumb(opener: HTMLElement | null | undefined, index: number) {
  if (!opener?.isConnected) return null;
  if (opener.dataset["fullIndex"] === String(index)) return opener;
  for (let scope = opener.parentElement; scope; scope = scope.parentElement) {
    const hit = scope.querySelector<HTMLElement>(`button[data-full-index="${index}"]`);
    if (hit) return hit;
  }
  return null;
}
