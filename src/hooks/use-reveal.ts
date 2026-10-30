import type { CSSProperties } from "react";

let observer: IntersectionObserver | undefined;

const getObserver = () =>
  (observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.dataset["reveal"] = "shown";
        observer?.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  ));

/**
 * Fades `[data-reveal]` elements up as they scroll into view. Only elements that start
 * below the viewport are hidden, and only on the client, so server HTML, the first screen
 * and reduced-motion visitors always see content immediately.
 *
 * It runs as a ref because React attaches refs only after hydrating the element. A root
 * effect could reach markup of a lazily loaded route before React hydrated it, so the
 * client props no longer matched the attribute.
 */
const observeReveal = (el: HTMLElement | null) => {
  if (!el || typeof IntersectionObserver === "undefined") return undefined;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
  const io = getObserver();

  // Wait a frame so scroll restoration has placed the page before measuring.
  const raf = requestAnimationFrame(() => {
    if (el.getBoundingClientRect().top <= window.innerHeight) return;
    el.dataset["reveal"] = "pending";
    io.observe(el);
  });

  return () => {
    cancelAnimationFrame(raf);
    io.unobserve(el);
    // Never leave content hidden when the page changes underneath.
    if (el.dataset["reveal"] === "pending") el.dataset["reveal"] = "";
  };
};

/** Props for an element that should reveal on scroll; `index` staggers siblings. */
export const reveal = (index = 0) =>
  ({
    "data-reveal": "",
    style: { "--reveal-i": index % 6 } as CSSProperties,
    ref: observeReveal,
  }) as const;
