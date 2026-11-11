import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/** Wait for the resolved Home route and menu unlock; settle motion/assets before one correction. */
export function HomeSectionScroll() {
  const { pathname, hash } = useRouterState({
    select: (state) => ({
      pathname: (state.resolvedLocation ?? state.location).pathname,
      hash: (state.resolvedLocation ?? state.location).hash,
    }),
  });
  useEffect(() => {
    let frame = 0;
    let stopped = false;
    let interrupted = false;
    const timers = new Set<number>();
    const events = new AbortController();
    const stopCorrection = () => {
      interrupted = true;
    };
    const listen = { passive: true, signal: events.signal };
    window.addEventListener("wheel", stopCorrection, listen);
    window.addEventListener("touchstart", stopCorrection, listen);
    window.addEventListener("keydown", stopCorrection, listen);
    const timeout = (resolve: () => void) => {
      timers.add(window.setTimeout(resolve, 2500));
    };
    const run = () => {
      interrupted = false;
      cancelAnimationFrame(frame);
      const started = performance.now();
      const wait = () => {
        if (stopped) return;
        const home = window.location.pathname.replace(/^\/en(?=\/|$)/, "") || "/";
        const target = document.getElementById("about");
        if (
          home !== "/" ||
          window.location.hash !== "#about" ||
          !target ||
          document.querySelector(".site-menu") ||
          document.body.hasAttribute("data-scroll-locked")
        ) {
          if (performance.now() - started < 8000) frame = requestAnimationFrame(wait);
          return;
        }
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const place = (behavior: ScrollBehavior) => {
          const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 80;
          window.scrollTo({ top: scrollY + target.getBoundingClientRect().top - margin, behavior });
        };
        const motion = reduced
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              window.addEventListener("scrollend", () => resolve(), {
                once: true,
                signal: events.signal,
              });
              timeout(resolve);
            });
        const images = [...document.images]
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), {
                  once: true,
                  signal: events.signal,
                });
                image.addEventListener("error", () => resolve(), {
                  once: true,
                  signal: events.signal,
                });
              }),
          );
        const assets = Promise.race([
          Promise.all([document.fonts?.ready, ...images]),
          new Promise<void>(timeout),
        ]);
        place(reduced ? "instant" : "smooth");
        target.focus({ preventScroll: true });
        void Promise.all([motion, assets]).then(() => {
          if (stopped || interrupted) return;
          frame = requestAnimationFrame(() => {
            if (stopped || interrupted || !target.isConnected || window.location.hash !== "#about")
              return;
            const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 80;
            if (Math.abs(target.getBoundingClientRect().top - margin) > 2) place("instant");
          });
        });
      };
      frame = requestAnimationFrame(wait);
    };
    if (hash === "about") run();
    window.addEventListener("home-section-navigation", run, { signal: events.signal });
    return () => {
      stopped = true;
      events.abort();
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [pathname, hash]);
  return null;
}
