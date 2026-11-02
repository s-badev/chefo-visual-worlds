import { useEffect, type CSSProperties, type RefObject } from "react";

/*
 * Tuning, in one place: the Home AI cards rise once, staggered, when their grid first enters the
 * viewport. styles.css ([data-grid-rise]) reads these through the custom properties below.
 */
export const AI_CARDS_RISE = {
  /** Start offset in px. */
  distance: 28,
  /** Delay step per card in seconds: 0.12, 0.24, 0.36 ... */
  staggerS: 0.12,
  opacityS: 0.8,
  transformS: 0.9,
  ease: "cubic-bezier(.2,.7,.2,1)",
  /** Share of the grid that must be visible before it rises (capped at this share of the viewport). */
  threshold: 0.2,
} as const;

/**
 * The observer threshold for a grid of this height: 20% of the grid, but never more than 20% of
 * the viewport, so a tall stacked grid on a phone does not keep its first cards hidden on screen.
 */
export const riseThreshold = (gridHeight: number, viewportHeight: number) =>
  Math.min(
    AI_CARDS_RISE.threshold,
    (viewportHeight * AI_CARDS_RISE.threshold) / Math.max(1, gridHeight),
  );

/** Start delay of card `index` in seconds. */
export const riseDelay = (index: number) =>
  Math.round((index + 1) * AI_CARDS_RISE.staggerS * 1000) / 1000;

/** Timing for the whole grid. */
export const riseGridStyle = {
  "--rise-distance": `${AI_CARDS_RISE.distance}px`,
  "--rise-opacity-s": `${AI_CARDS_RISE.opacityS}s`,
  "--rise-transform-s": `${AI_CARDS_RISE.transformS}s`,
  "--rise-ease": AI_CARDS_RISE.ease,
} as CSSProperties;

/** Each card's own delay. */
export const riseItemStyle = (index: number) =>
  ({ "--rise-delay": `${riseDelay(index)}s` }) as CSSProperties;

/**
 * Hides the grid's cards only when the grid starts below the viewport, on the client, with motion
 * allowed; they rise once when `threshold` of it is visible and never hide again. Server HTML, a
 * grid already on screen and reduced motion all show the cards at rest. Same pattern as the Home
 * photo cards (useCardsReveal): no observer at mount, only after a frame and only if needed.
 */
export function useGridRise(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const grid = ref.current;
    if (!grid || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let observer: IntersectionObserver | undefined;
    // Wait a frame so scroll restoration has placed the page before measuring.
    const raf = requestAnimationFrame(() => {
      const rect = grid.getBoundingClientRect();
      if (rect.top <= window.innerHeight) return;
      grid.dataset["gridRise"] = "pending";
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          observer?.disconnect();
          grid.dataset["gridRise"] = "shown";
        },
        { threshold: riseThreshold(rect.height, window.innerHeight) },
      );
      observer.observe(grid);
    });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      // Never leave cards hidden when the page changes underneath.
      if (grid.dataset["gridRise"] === "pending") grid.dataset["gridRise"] = "";
    };
  }, [ref]);
}
