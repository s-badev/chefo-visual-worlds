import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import {
  BACK_TO_TOP,
  endFinish,
  isBackToTopVisible,
  ringCircumference,
  ringOffset,
  ringRadius,
  scrollProgress,
} from "@/lib/back-to-top";

/**
 * Same hidden markup on the server and the client; scroll state applies after mount. One passive,
 * rAF-throttled scroll listener writes the ring straight to the DOM; React only re-renders when the
 * button shows or hides. Page height and button size are read only on resize.
 */
export function BackToTop() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let raf = 0;
    let scrollHeight = 0;
    let atEnd = false;
    let circumference = ringCircumference(BACK_TO_TOP.size);
    const node = button.current;
    const circles = () => Array.from(svg.current?.querySelectorAll("circle") ?? []);
    const clearPulse = () => node?.classList.remove("back-to-top-pulse");
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const progress = scrollProgress(window.scrollY, scrollHeight, vh);
      const finish = endFinish(progress);
      const offset = ringOffset(progress, circumference);
      circles()[1]?.setAttribute("stroke-dashoffset", offset.toFixed(2));
      node?.style.setProperty("--f", finish.toFixed(3));
      node?.toggleAttribute("data-complete", progress >= BACK_TO_TOP.completeAt);
      const nextEnd = finish >= 0.55;
      if (node && nextEnd !== atEnd) {
        atEnd = nextEnd;
        node.toggleAttribute("data-end", nextEnd);
        const label = nextEnd ? t.common.backToTopEnd : t.common.backToTop;
        node.setAttribute("aria-label", label);
        node.setAttribute("title", label);
        if (nextEnd && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          node.classList.add("back-to-top-pulse");
        } else if (!nextEnd) {
          node.classList.remove("back-to-top-pulse");
        }
      }
      setVisible(isBackToTopVisible(window.scrollY, vh));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const measure = () => {
      scrollHeight = document.documentElement.scrollHeight;
      const size = button.current?.offsetWidth || BACK_TO_TOP.size;
      circumference = ringCircumference(size);
      for (const c of circles()) {
        c.setAttribute("cx", String(size / 2));
        c.setAttribute("cy", String(size / 2));
        c.setAttribute("r", String(ringRadius(size)));
      }
      circles()[1]?.setAttribute("stroke-dasharray", circumference.toFixed(2));
      schedule();
    };
    // The page height changes as images and sections load.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    node?.addEventListener("animationend", clearPulse);
    observer?.observe(document.body);
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      node?.removeEventListener("animationend", clearPulse);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
    };
  }, [t.common.backToTop, t.common.backToTopEnd]);

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    // Hand focus to the start of the content (the skip-link target) without a second jump.
    document.getElementById("content")?.focus({ preventScroll: true });
  };

  const size = BACK_TO_TOP.size;
  const circumference = ringCircumference(size).toFixed(2);
  return (
    <button
      ref={button}
      type="button"
      aria-label={t.common.backToTop}
      title={t.common.backToTop}
      aria-hidden={visible ? undefined : true}
      tabIndex={visible ? undefined : -1}
      inert={!visible}
      data-visible={visible ? "" : undefined}
      onClick={toTop}
      data-theme="dark"
      className="back-to-top interaction-icon"
    >
      <svg ref={svg} aria-hidden="true" className="back-to-top-ring">
        <circle className="back-to-top-track" cx={size / 2} cy={size / 2} r={ringRadius(size)} />
        <circle
          className="back-to-top-progress"
          cx={size / 2}
          cy={size / 2}
          r={ringRadius(size)}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <svg aria-hidden="true" className="back-to-top-arrow" viewBox="0 0 24 24">
        <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
      </svg>
    </button>
  );
}
