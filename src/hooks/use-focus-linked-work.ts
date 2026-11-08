import { useEffect } from "react";

/**
 * After the router has scrolled a collection to the work in the URL hash, moves focus to
 * that work's main link (the first element matching `target` inside the anchored tile) so
 * keyboard and screen-reader users continue from there. A restored Back/Forward position that
 * shows other works keeps focus where it was.
 */
export function useFocusLinkedWork(target: string) {
  // Detail pages are separate routes, so the wall mounts again on every return.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const raf = requestAnimationFrame(() => {
      const anchored = document.getElementById(hash);
      if (!anchored) return;
      const { top } = anchored.getBoundingClientRect();
      if (top < 0 || top >= window.innerHeight) return;
      anchored.querySelector<HTMLElement>(target)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, [target]);
}
