/*
 * Albums map and mobile route bar: pure geometry and timing, no map data (this module ships with
 * the Photography page; pin lookups live in album-map-pins.ts, inside the lazy map chunk).
 */
import type { MapPoint } from "@/content/album-map";

export const ALBUM_MAP = {
  /** Map zone and passport zone: container widths of the albums section (styles.css matches). */
  mapMinWidth: 1680,
  passportMinWidth: 1500,
  /** Mobile model (route bar, two taps) at this container width and below. */
  mobileMaxWidth: 767,
  finePointer: "(hover: hover) and (pointer: fine)",
  coarsePointer: "(pointer: coarse)",
  /** Hover/focus this long on one row before the map selects it and the plane flies. */
  dwellMs: 350,
  /** Landing ring at the pin and the second ring in the lens. */
  ringMs: 900,
  lensRingDelayMs: 250,
  /** A fading puff every `puffStep` viewBox units of flight. */
  puffStep: 9,
  puffMs: 1600,
  /** Route bar (viewBox 0 0 358 48): first dot, span between first and last dot, baseline. */
  routeStartX: 14,
  routeSpan: 330,
  routeY: 34,
  routeLift: 22,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Map flight duration for a distance in viewBox units. */
export const flightDuration = (distance: number): number => clamp(700 + distance * 3, 900, 1800);

/** Quadratic control point: above the midpoint by min(90, d * .35) + 10. */
export function flightControlPoint(p0: MapPoint, p1: MapPoint): MapPoint {
  const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  return [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - Math.min(90, d * 0.35) - 10];
}

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export function quadPoint(p0: MapPoint, c: MapPoint, p1: MapPoint, e: number): MapPoint {
  const u = 1 - e;
  return [
    u * u * p0[0] + 2 * u * e * c[0] + e * e * p1[0],
    u * u * p0[1] + 2 * u * e * c[1] + e * e * p1[1],
  ];
}

/** Heading in degrees from a to b. */
export const headingDeg = (a: MapPoint, b: MapPoint): number =>
  (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;

/** Route bar dot positions: x = 14 + k * (330 / (total - 1)). */
export const routeDotX = (index: number, total: number): number =>
  ALBUM_MAP.routeStartX + index * (ALBUM_MAP.routeSpan / Math.max(1, total - 1));

/** Route bar flight duration for a horizontal distance. */
export const routeFlightDuration = (dx: number): number =>
  clamp(800 + Math.abs(dx) * 5, 1100, 2000);

/** Route bar plane: an arc over the baseline. */
export const routeArcPoint = (x0: number, x1: number, e: number): MapPoint => [
  x0 + (x1 - x0) * e,
  ALBUM_MAP.routeY - Math.sin(e * Math.PI) * ALBUM_MAP.routeLift,
];
