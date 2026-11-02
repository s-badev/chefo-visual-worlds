import { useEffect, type RefObject } from "react";

/*
 * Tuning, in one place (px unless noted). The Home photo cards get a gold viewfinder that follows
 * a fine pointer: a square frame of four corner brackets with a centre dot, and a pill label under
 * it naming the card ("Несебър · 33 кадъра").
 */
export const VIEWFINDER = {
  frame: 78,
  corner: 16,
  stroke: 1.5,
  dot: 4,
  gold: "#C9A46B",
  // Dark halo on the brackets and the dot only (not the label), so they read on bright sky.
  halo: "drop-shadow(0 0 1px rgba(12, 23, 41, 0.9)) drop-shadow(0 0 2px rgba(12, 23, 41, 0.55))",
  labelGap: 10,
  labelFont: 10.5,
  labelWeight: 600,
  labelTracking: "0.16em",
  labelPadding: "7px 10px",
  labelBackground: "rgba(12, 23, 41, 0.9)",
  labelBorder: "rgba(201, 164, 107, 0.6)",
  fadeMs: 200,
  // Above the cards, below the sticky header (z-40) and dialogs (z-50).
  zIndex: 30,
} as const;

/** Only mice and other fine, hovering pointers get the viewfinder; touch gets nothing. */
export const VIEWFINDER_QUERY = "(hover: hover) and (pointer: fine)";
/** Set on a card while the viewfinder is over it; styles.css hides the native cursor there. */
export const VIEWFINDER_ACTIVE_CLASS = "photo-viewfinder-active";
/** Cards opt in with this attribute; its value is the label text. */
export const VIEWFINDER_LABEL_ATTR = "data-viewfinder-label";

export const viewfinderLabel = (title: string, count: string) => `${title} · ${count}`;

/** The shared viewfinder element: built on the client only, never focusable or announced. */
export function createViewfinder(reducedMotion: boolean) {
  const v = VIEWFINDER;
  const root = document.createElement("div");
  root.className = "photo-viewfinder";
  root.setAttribute("aria-hidden", "true");
  Object.assign(root.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: `${v.frame}px`,
    height: `${v.frame}px`,
    zIndex: String(v.zIndex),
    pointerEvents: "none",
    opacity: "0",
    transition: reducedMotion ? "none" : `opacity ${v.fadeMs}ms ease`,
    willChange: "transform, opacity",
  });
  const line = `${v.stroke}px solid ${v.gold}`;
  for (const [vertical, horizontal] of [
    ["top", "left"],
    ["top", "right"],
    ["bottom", "left"],
    ["bottom", "right"],
  ] as const) {
    const corner = document.createElement("span");
    Object.assign(corner.style, {
      position: "absolute",
      [vertical]: "0",
      [horizontal]: "0",
      width: `${v.corner}px`,
      height: `${v.corner}px`,
      filter: v.halo,
    });
    corner.style.setProperty(`border-${vertical}`, line);
    corner.style.setProperty(`border-${horizontal}`, line);
    root.append(corner);
  }
  const dot = document.createElement("span");
  Object.assign(dot.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: `${v.dot}px`,
    height: `${v.dot}px`,
    margin: `${-v.dot / 2}px 0 0 ${-v.dot / 2}px`,
    borderRadius: "50%",
    background: v.gold,
    filter: v.halo,
  });
  const label = document.createElement("span");
  Object.assign(label.style, {
    position: "absolute",
    top: `${v.frame + v.labelGap}px`,
    left: "50%",
    transform: "translateX(-50%)",
    padding: v.labelPadding,
    border: `1px solid ${v.labelBorder}`,
    borderRadius: "999px",
    background: v.labelBackground,
    color: v.gold,
    fontSize: `${v.labelFont}px`,
    fontWeight: String(v.labelWeight),
    letterSpacing: v.labelTracking,
    lineHeight: "1.2",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  });
  root.append(dot, label);
  return { root, label };
}

/**
 * One viewfinder for every card inside `gridRef` (cards carry VIEWFINDER_LABEL_ATTR). It follows
 * the pointer through transform only, fades in on a card and out off it, and hides on scroll away,
 * window blur and unmount. Keyboard focus never shows it; touch screens get no element at all.
 */
export function usePhotoViewfinder(gridRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !window.matchMedia(VIEWFINDER_QUERY).matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const { root, label } = createViewfinder(reduced);
    document.body.append(root);
    const half = VIEWFINDER.frame / 2;
    let card: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    let raf = 0;

    const place = () => {
      raf = 0;
      root.style.transform = `translate3d(${x - half}px, ${y - half}px, 0)`;
    };
    const cardAt = (target: EventTarget | null) => {
      const el =
        target instanceof Element
          ? target.closest<HTMLElement>(`[${VIEWFINDER_LABEL_ATTR}]`)
          : null;
      return el && grid.contains(el) ? el : null;
    };
    const setCard = (next: HTMLElement | null) => {
      if (next === card) return;
      card?.classList.remove(VIEWFINDER_ACTIVE_CLASS);
      if (next && !card) place(); // appear where the pointer is, not where it last left
      card = next;
      if (card) {
        card.classList.add(VIEWFINDER_ACTIVE_CLASS);
        label.textContent = card.getAttribute(VIEWFINDER_LABEL_ATTR) ?? "";
      }
      root.style.opacity = card ? "1" : "0";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      x = e.clientX;
      y = e.clientY;
      setCard(cardAt(e.target));
      if (!raf) raf = requestAnimationFrame(place);
    };
    const onLeave = () => setCard(null);
    // The page moves under a resting pointer: keep the viewfinder only if a card is still there.
    const onScroll = () => {
      if (card) setCard(cardAt(document.elementFromPoint(x, y)));
    };

    grid.addEventListener("pointermove", onMove);
    grid.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      grid.removeEventListener("pointermove", onMove);
      grid.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", onLeave);
      card?.classList.remove(VIEWFINDER_ACTIVE_CLASS);
      root.remove();
    };
  }, [gridRef]);
}
