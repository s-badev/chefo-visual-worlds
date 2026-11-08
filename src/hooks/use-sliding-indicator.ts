import { useEffect, type RefObject } from "react";

/**
 * A cream pill that slides behind the current item of a row (tabs, segmented switch). The row
 * holds one `[data-slide-indicator]` element; this measures the current item and writes
 * --ind-x / --ind-w / --ind-h on the row (no React state). Until the first measure the current
 * item paints its own pill, so server HTML and the first client render already show it; the row
 * then gets data-indicator="on" and the CSS moves the paint to the indicator. Movement is CSS
 * (transform + width), switched off under reduced motion.
 */
export function useSlidingIndicator(
  ref: RefObject<HTMLElement | null>,
  active: number,
  itemSelector: string,
) {
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    let raf = 0;
    const place = () => {
      const item = row.querySelectorAll<HTMLElement>(itemSelector)[active];
      if (!item || !item.offsetWidth) return false;
      row.style.setProperty("--ind-x", `${item.offsetLeft}px`);
      row.style.setProperty("--ind-y", `${item.offsetTop}px`);
      row.style.setProperty("--ind-w", `${item.offsetWidth}px`);
      row.style.setProperty("--ind-h", `${item.offsetHeight}px`);
      return true;
    };
    if (row.dataset["indicator"] === "on") {
      place();
    } else if (place()) {
      // First placement without travel; transitions start one frame later.
      row.dataset["indicator"] = "placed";
      raf = requestAnimationFrame(() => {
        row.dataset["indicator"] = "on";
      });
    }
    // Resizes and late fonts move the items: re-place without animating from a stale spot.
    const replace = () => {
      const was = row.dataset["indicator"];
      if (!was) return;
      row.dataset["indicator"] = "placed";
      place();
      requestAnimationFrame(() => {
        if (row.dataset["indicator"] === "placed") row.dataset["indicator"] = was;
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(replace);
    observer?.observe(row);
    let alive = true;
    document.fonts?.ready.then(() => alive && replace()).catch(() => {});
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [ref, active, itemSelector]);
}
