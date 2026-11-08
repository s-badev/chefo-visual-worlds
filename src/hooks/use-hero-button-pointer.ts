import { useEffect, useRef } from "react";

/** How far the label and arrow follow the pointer across the whole button (px, total travel). */
export const HERO_BUTTON_FOLLOW = { x: 7, y: 5 } as const;

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCED = "(prefers-reduced-motion: reduce)";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** CSS variables for a pointer at (x, y) inside a button rect: --mx/--my in %, --tx/--ty in px. */
export function heroButtonPointerVars(
  rect: { left: number; top: number; width: number; height: number },
  x: number,
  y: number,
) {
  const px = clamp01((x - rect.left) / rect.width);
  const py = clamp01((y - rect.top) / rect.height);
  return {
    "--mx": `${(px * 100).toFixed(1)}%`,
    "--my": `${(py * 100).toFixed(1)}%`,
    "--tx": `${((px - 0.5) * HERO_BUTTON_FOLLOW.x).toFixed(2)}px`,
    "--ty": `${((py - 0.5) * HERO_BUTTON_FOLLOW.y).toFixed(2)}px`,
  };
}

/**
 * Pointer origin for the Home hero buttons (lens fill origin and label follow). Mouse with a fine,
 * hover-capable pointer only and never with reduced motion. Writes CSS variables on the button
 * (rAF-throttled, no React state) and resets the follow on leave. Attached after mount.
 */
export function useHeroButtonPointer<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const fine = window.matchMedia(FINE_POINTER);
    const reduced = window.matchMedia(REDUCED);
    const buttons = Array.from(root.querySelectorAll<HTMLElement>(".home-hero-button"));
    let raf = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const allowed = (event: PointerEvent) =>
      event.pointerType === "mouse" && fine.matches && !reduced.matches;
    const write = (el: HTMLElement, x: number, y: number) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      for (const [name, value] of Object.entries(heroButtonPointerVars(rect, x, y)))
        el.style.setProperty(name, value);
    };
    const flush = () => {
      raf = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      pending = null;
      write(el, x, y);
    };
    const onEnter = (event: PointerEvent) => {
      if (!allowed(event)) return;
      // The lens opens from where the pointer came in, so this one is written at once.
      write(event.currentTarget as HTMLElement, event.clientX, event.clientY);
    };
    const onMove = (event: PointerEvent) => {
      if (!allowed(event)) return;
      pending = { el: event.currentTarget as HTMLElement, x: event.clientX, y: event.clientY };
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const onLeave = (event: PointerEvent) => {
      const el = event.currentTarget as HTMLElement;
      if (pending?.el === el) pending = null;
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--ty", "0px");
    };

    for (const button of buttons) {
      button.addEventListener("pointerenter", onEnter);
      button.addEventListener("pointermove", onMove);
      button.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      for (const button of buttons) {
        button.removeEventListener("pointerenter", onEnter);
        button.removeEventListener("pointermove", onMove);
        button.removeEventListener("pointerleave", onLeave);
      }
    };
  }, []);
  return ref;
}
