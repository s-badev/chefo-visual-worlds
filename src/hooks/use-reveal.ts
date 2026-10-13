import { useRouterState } from "@tanstack/react-router";
import { useEffect, type CSSProperties } from "react";

/**
 * Fades `[data-reveal]` elements up as they scroll into view. Only elements that start
 * below the viewport are hidden, and only on the client, so server HTML, the first screen
 * and reduced-motion visitors always see content immediately.
 */
export function useReveal() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset["reveal"] = "shown";
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    // Wait a frame so scroll restoration has placed the page before measuring.
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>("main [data-reveal='']").forEach((el) => {
        if (el.getBoundingClientRect().top <= window.innerHeight) return;
        el.dataset["reveal"] = "pending";
        observer.observe(el);
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      // Never leave content hidden when the page changes underneath.
      document.querySelectorAll<HTMLElement>("[data-reveal='pending']").forEach((el) => {
        el.dataset["reveal"] = "";
      });
    };
  }, [pathname]);
}

/** Props for an element that should reveal on scroll; `index` staggers siblings. */
export const reveal = (index = 0) =>
  ({
    "data-reveal": "",
    style: { "--reveal-i": index % 6 } as CSSProperties,
  }) as const;
