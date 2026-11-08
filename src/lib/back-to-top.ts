/*
 * Tuning, in one place. A round back-to-top button (bottom right) with a ring that fills with the
 * page's scroll progress; it appears once the page has scrolled past `appearAt` viewport heights.
 * The diameters and offsets are mirrored in styles.css (.back-to-top).
 */
export const BACK_TO_TOP = {
  /** Visible once scrollY exceeds this many viewport heights. */
  appearAt: 0.8,
  /** Button diameter in px (desktop / at `mobileMax` px wide and below). */
  size: 52,
  mobileSize: 46,
  mobileMax: 600,
  /** Ring stroke width in px, the same at both sizes. */
  ringStroke: 2,
  fadeMs: 300,
  /** The final page segment that resolves the calm end state. */
  endFrom: 0.965,
  endSpan: 0.03,
} as const;

/** The ring sits on the button's edge: radius from the diameter and the stroke. */
export const ringRadius = (size: number) => (size - BACK_TO_TOP.ringStroke) / 2;
export const ringCircumference = (size: number) => 2 * Math.PI * ringRadius(size);

/** 0 at the top of the page, 1 at the bottom (0 when the page does not scroll). */
export const scrollProgress = (scrollY: number, scrollHeight: number, viewportHeight: number) => {
  const max = scrollHeight - viewportHeight;
  return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
};

/** stroke-dashoffset that shows `progress` (0..1) of a ring with this circumference. */
export const ringOffset = (progress: number, circumference: number) =>
  circumference * (1 - Math.min(1, Math.max(0, progress)));

/** 0 before the final page segment and 1 once that segment is complete. */
export const endFinish = (progress: number) =>
  Math.min(1, Math.max(0, (progress - BACK_TO_TOP.endFrom) / BACK_TO_TOP.endSpan));

export const isBackToTopVisible = (scrollY: number, viewportHeight: number) =>
  scrollY > viewportHeight * BACK_TO_TOP.appearAt;
