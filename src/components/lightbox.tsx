// The shared full-screen viewer (photographs and AI artworks), as in the approved mock (v12,
// d32 / d33 / m32): the image flies out of its thumbnail and back, continuous zoom and pan
// (wheel, double-click / double-tap, keys, pinch), swipes, and the information card that floats
// at the side for portrait images on wide screens. The Radix Dialog keeps the lifecycle: role,
// labelling, focus trap and loop, scroll lock, Escape and focus return. Geometry and gesture rules
// live in src/lib/lightbox.ts; zoom and pan are painted from refs, never per-frame React state.
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import {
  EASE_IN,
  EASE_OUT,
  IDLE,
  LB,
  NO_ZOOM,
  type Box,
  type GestureState,
  type Zoom,
  clampPan,
  fitRect,
  flyTransform,
  gestureStep,
  isDoubleTap,
  isZoomed,
  sideCardFits,
  toggleScale,
  wantsSideCard,
  wheelFactor,
  zoomAt,
  zoomTransform,
} from "@/lib/lightbox";

/** Anything the viewer can show; a Photo fits as-is. */
export interface LightboxItem {
  slug: string;
  image: string;
  alt: string;
  title: string;
  width?: number | undefined;
  height?: number | undefined;
  /** Shown as the description, at most two lines. */
  caption?: string | undefined;
  location?: string | undefined;
  /** The gold eyebrow line (AI generation · collection, or album · date · camera); falls back to the location. */
  meta?: string | undefined;
  /** The work's own page, offered as "Details and prompt". */
  detail?: { to: "/ai-worlds/$slug"; slug: string } | undefined;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const reducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const toBox = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });
/** The thumbnail's picture (the mock measures the image inside a thumbnail, not its caption). */
const thumbBox = (thumb: HTMLElement) =>
  toBox((thumb.querySelector("img") ?? thumb).getBoundingClientRect());
/** The focusable control a thumbnail belongs to (the thumbnail itself, or its button / link). */
const focusTarget = (el: HTMLElement | null | undefined) =>
  el?.closest<HTMLElement>("button, a[href], [tabindex]") ?? null;

const ZoomIcon = ({ out }: { out: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6" />
    <path d={out ? "M15 15l5 5M8 10.5h5" : "M15 15l5 5M10.5 8v5M8 10.5h5"} />
  </svg>
);

export function Lightbox({
  items,
  index,
  onIndex,
  returnFocusTo,
  getThumb,
  variant = "default",
}: {
  items: LightboxItem[];
  index: number | null;
  onIndex: (i: number | null) => void;
  /** The element that gets focus back on close; without it the current item's thumbnail does. */
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  /** The thumbnail of an item: the image flies out of it and back into it. */
  getThumb?: ((index: number) => HTMLElement | null | undefined) | undefined;
  variant?: "default" | "artwork";
}) {
  const open = index !== null && items[index] !== undefined;
  const item = open ? items[index!] : null;
  const { t } = useT();
  const m = t.lightbox;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // The portal mounts after the first open render: the image node itself starts the show effect.
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const imgNode = useCallback((el: HTMLImageElement | null) => {
    imgRef.current = el;
    setImgEl(el);
  }, []);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const zoom = useRef<Zoom>(NO_ZOOM);
  const gesture = useRef<GestureState>(IDLE);
  /** Where the gesture started: the image (double tap zooms) or the empty stage (a tap closes). */
  const downOn = useRef<"image" | "stage" | "other">("other");
  const lastTap = useRef<number | null>(null);
  const shown = useRef<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const focusBack = useRef<HTMLElement | null>(null);
  const [zoomed, setZoomed] = useState(false);

  // Latest values for the window listeners.
  const live = useRef({ index, items, onIndex, getThumb });
  live.current = { index, items, onIndex, getThumb };

  const size = (it: LightboxItem) => {
    const natural = imgRef.current;
    return {
      w: it.width ?? (natural?.naturalWidth || 1024),
      h: it.height ?? (natural?.naturalHeight || 1280),
    };
  };
  const stageBox = () => toBox(stageRef.current!.getBoundingClientRect());
  /** The fitted (unzoomed) size of the image, kept by fit(). */
  const fitted = useRef({ width: 0, height: 0 });
  const imageSize = () => fitted.current;

  const paint = useCallback((animate: boolean) => {
    const pan = panRef.current;
    if (!pan) return;
    const z = zoom.current;
    pan.style.transition =
      animate && !reducedMotion() ? `transform ${LB.zoomAnimMs}ms ${EASE_OUT}` : "none";
    pan.style.transform = zoomTransform(z);
    setZoomed(isZoomed(z));
  }, []);

  /** Side or bottom card, then the fitted size of the image (the mock's lbFit). */
  const fit = useCallback((it: LightboxItem): Box | null => {
    const content = contentRef.current;
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!content || !stage || !img) return null;
    const { w, h } = size(it);
    const side = wantsSideCard(w, h, window.innerWidth);
    content.dataset["layout"] = side ? "side" : "bottom";
    let box = fitRect(toBox(stage.getBoundingClientRect()), w, h);
    if (side && !sideCardFits(box, window.innerWidth, cardRef.current?.offsetWidth ?? 0)) {
      content.dataset["layout"] = "bottom";
      box = fitRect(toBox(stage.getBoundingClientRect()), w, h);
    }
    img.style.width = `${box.width}px`;
    img.style.height = `${box.height}px`;
    fitted.current = { width: box.width, height: box.height };
    return box;
  }, []);

  const zoomTo = useCallback(
    (scale: number, cx: number, cy: number, animate: boolean) => {
      if (!stageRef.current) return;
      zoom.current = zoomAt(zoom.current, scale, cx, cy, stageBox(), imageSize());
      paint(animate);
    },
    [paint],
  );
  const resetZoom = useCallback(
    (animate: boolean) => {
      zoom.current = NO_ZOOM;
      paint(animate);
    },
    [paint],
  );
  const toggleZoom = (cx?: number, cy?: number) => {
    const s = stageRef.current?.getBoundingClientRect();
    if (!s) return;
    zoomTo(toggleScale(zoom.current), cx ?? s.left + s.width / 2, cy ?? s.top + s.height / 2, true);
  };

  const go = useCallback((to: number) => {
    const { index: i, items: list, onIndex: set } = live.current;
    if (i === null || to === i || to < 0 || to >= list.length) return;
    set(to);
  }, []);

  /**
   * Closing: the image flies back into the current thumbnail (scrolled into view first) while
   * the dialog itself closes at once, so focus, scroll lock and the accessibility tree are
   * restored immediately. A detached, inert copy of the viewer plays the fly-back and the fade.
   */
  const close = useCallback(() => {
    const { index: i, onIndex: set, getThumb: thumbOf } = live.current;
    if (i === null) return;
    const thumb = thumbOf?.(i) ?? null;
    focusBack.current = returnFocusTo?.current ?? focusTarget(thumb) ?? opener.current;
    const reduce = reducedMotion();
    const content = contentRef.current;
    const overlay = overlayRef.current;
    if (isZoomed(zoom.current) && panRef.current) {
      zoom.current = NO_ZOOM;
      panRef.current.style.transition = "none";
      panRef.current.style.transform = zoomTransform(NO_ZOOM);
    }
    const from = imgRef.current ? toBox(imgRef.current.getBoundingClientRect()) : null;
    // Nothing to animate when the viewer has no layout (reduced motion, or not rendered yet).
    if (!reduce && content && overlay && from && from.width > 0) {
      if (thumb?.isConnected && typeof thumb.scrollIntoView === "function")
        thumb.scrollIntoView({ block: "nearest" });
      const ghost = document.createElement("div");
      ghost.className = "lb-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.setAttribute("inert", "");
      for (const node of [overlay, content]) {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.removeAttribute("id");
        copy.removeAttribute("role");
        copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        ghost.appendChild(copy);
      }
      document.body.appendChild(ghost);
      const img = ghost.querySelector<HTMLImageElement>("[data-lightbox-image]");
      const to = thumb?.isConnected ? thumbBox(thumb) : null;
      const flies = Boolean(img && to && to.width > 0);
      if (flies && img && to) {
        img.style.transition = `transform ${LB.flyOutMs}ms ${EASE_IN}`;
        img.style.transformOrigin = "0 0";
        void img.offsetWidth;
        img.style.transform = flyTransform(to, from);
      }
      window.setTimeout(
        () => {
          ghost.classList.add("is-leaving");
          window.setTimeout(() => ghost.remove(), LB.fadeOutMs);
        },
        flies ? LB.flyOutDoneMs : 0,
      );
    }
    set(null);
  }, [returnFocusTo]);

  // Show an item: reset zoom, choose the card, fit, then fly in (first item) or slide (next ones).
  useLayoutEffect(() => {
    if (!open || !item) {
      shown.current = null;
      return;
    }
    const img = imgRef.current;
    if (!img) return;
    const previous = shown.current;
    shown.current = index;
    zoom.current = NO_ZOOM;
    if (panRef.current) {
      panRef.current.style.transition = "none";
      panRef.current.style.transform = zoomTransform(NO_ZOOM);
    }
    setZoomed(false);
    const box = fit(item);
    const reduce = reducedMotion();
    img.style.transition = "none";
    img.style.opacity = "";
    img.style.transform = "";
    if (previous === null) {
      const thumb = getThumb?.(index!);
      if (box && thumb?.isConnected && !reduce) {
        const from = thumbBox(thumb);
        if (from.width > 0 && box.width > 0) {
          img.style.transformOrigin = "0 0";
          img.style.transform = flyTransform(from, box);
          void img.offsetWidth;
          img.style.transition = `transform ${LB.flyInMs}ms ${EASE_OUT}`;
          img.style.transform = "none";
        }
      }
    } else if (previous !== index && !reduce) {
      const dir = Math.sign(index! - previous);
      img.style.transformOrigin = "50% 50%";
      img.style.opacity = String(LB.slideFrom);
      img.style.transform = `translateX(${dir * LB.slidePx}px)`;
      void img.offsetWidth;
      img.style.transition = `opacity ${LB.slideFadeMs}ms, transform ${LB.slideMoveMs}ms ${EASE_OUT}`;
      img.style.opacity = "1";
      img.style.transform = "none";
    }
    for (const k of [index! - 1, index! + 1]) {
      const near = items[k];
      if (near) new Image().src = near.image;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, imgEl]);

  // Refit on resize and orientation change; keep the pan inside the new stage.
  useEffect(() => {
    if (!open) return;
    const refit = () => {
      const { index: i, items: list } = live.current;
      if (i === null || !list[i] || !stageRef.current) return;
      fit(list[i]);
      zoom.current = clampPan(zoom.current, imageSize(), stageBox());
      paint(false);
    };
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    return () => {
      window.removeEventListener("resize", refit);
      window.removeEventListener("orientationchange", refit);
    };
  }, [open, fit, paint]);

  // Keys: arrows, Home / End, + / - (Escape goes through Radix below).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const { index: i, items: list } = live.current;
      if (i === null) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(i + 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(list.length - 1);
      } else if ((e.key === "+" || e.key === "=") && !(e.target instanceof HTMLAnchorElement)) {
        e.preventDefault();
        zoomTo(zoom.current.s * LB.zoomStep, window.innerWidth / 2, window.innerHeight / 2, true);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomTo(zoom.current.s / LB.zoomStep, window.innerWidth / 2, window.innerHeight / 2, true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, zoomTo]);

  // The wheel zooms around the cursor and never scrolls the page behind.
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const stageNode = useCallback((el: HTMLDivElement | null) => {
    stageRef.current = el;
    setStageEl(el);
  }, []);
  useEffect(() => {
    if (!stageEl) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo(zoom.current.s * wheelFactor(e.deltaY), e.clientX, e.clientY, false);
    };
    stageEl.addEventListener("wheel", onWheel, { passive: false });
    return () => stageEl.removeEventListener("wheel", onWheel);
  }, [stageEl, zoomTo]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!Object.keys(gesture.current.pointers).length)
      downOn.current =
        e.target === imgRef.current
          ? "image"
          : e.target === stageRef.current || e.target === panRef.current
            ? "stage"
            : "other";
    gesture.current = gestureStep(gesture.current, {
      type: "down",
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
      scale: zoom.current.s,
    }).state;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A synthetic pointer cannot be captured; the gesture still works.
    }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { state, intent } = gestureStep(gesture.current, {
      type: "move",
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      zoomed: isZoomed(zoom.current),
    });
    gesture.current = state;
    if (!intent || !stageRef.current) return;
    if (intent.type === "pinch") zoomTo(intent.scale, intent.cx, intent.cy, false);
    if (intent.type === "pan") {
      const z = zoom.current;
      zoom.current = clampPan(
        { ...z, x: z.x + intent.dx, y: z.y + intent.dy },
        imageSize(),
        stageBox(),
      );
      e.currentTarget.dataset["panning"] = "";
      paint(false);
    }
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset["panning"];
    const { state, intent } = gestureStep(gesture.current, {
      type: "up",
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      zoomed: isZoomed(zoom.current),
    });
    gesture.current = state;
    if (!intent) return;
    const i = live.current.index ?? 0;
    if (intent.type === "next") go(i + 1);
    else if (intent.type === "prev") go(i - 1);
    else if (intent.type === "close") close();
    else if (intent.type === "tap") {
      if (downOn.current === "image") {
        const now = Date.now();
        if (isDoubleTap(lastTap.current, now)) {
          lastTap.current = null;
          toggleZoom(intent.x, intent.y);
        } else lastTap.current = now;
      } else if (downOn.current === "stage") close();
    }
  };
  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    delete e.currentTarget.dataset["panning"];
    gesture.current = gestureStep(gesture.current, { type: "cancel", id: e.pointerId }).state;
  };

  const count = items.length;
  const atStart = index === null || index <= 0;
  const atEnd = index === null || index >= count - 1;
  const meta = item?.meta ?? item?.location;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay ref={overlayRef} className="lb-overlay" />
        <Dialog.Content
          ref={contentRef}
          data-lightbox-variant={variant}
          data-theme="dark"
          data-zoomed={zoomed ? "" : undefined}
          className="lb"
          onOpenAutoFocus={(event) => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            event.preventDefault();
            closeRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            const target = focusBack.current ?? opener.current;
            focusBack.current = null;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus({ preventScroll: true });
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isZoomed(zoom.current)) {
              event.preventDefault();
              resetZoom(true);
            }
          }}
        >
          {item && (
            <>
              <div className="lb-bd" aria-hidden="true" onClick={close} />
              <Dialog.Description className="sr-only">{item.alt}</Dialog.Description>
              <button
                type="button"
                className="lb-b lb-z"
                aria-pressed={zoomed}
                aria-label={zoomed ? m.zoomOut : m.zoomIn}
                onClick={() => toggleZoom()}
              >
                <ZoomIcon out={zoomed} />
              </button>
              <button
                ref={closeRef}
                type="button"
                className="lb-b lb-x"
                aria-label={m.close}
                onClick={close}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <div className="lb-mid">
                <button
                  type="button"
                  className="lb-b lb-p"
                  aria-label={m.prev}
                  disabled={atStart}
                  onClick={() => go((index ?? 0) - 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14.5 5.5L8 12l6.5 6.5" />
                  </svg>
                </button>
                <div
                  ref={stageNode}
                  className="lb-stage"
                  data-lightbox-stage
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                >
                  <div ref={panRef} className="lb-pan">
                    <img
                      ref={imgNode}
                      data-lightbox-image
                      src={item.image}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      draggable={false}
                      decoding="async"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="lb-b lb-n"
                  aria-label={m.next}
                  disabled={atEnd}
                  onClick={() => go((index ?? 0) + 1)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9.5 5.5L16 12l-6.5 6.5" />
                  </svg>
                </button>
              </div>
              <div ref={cardRef} className="lb-card" data-lightbox-caption aria-live="polite">
                <div className="lb-tx">
                  <Dialog.Title className="lb-title">{item.title}</Dialog.Title>
                  {item.caption && <p className="lb-desc">{item.caption}</p>}
                  {meta && <span className="lb-meta">{meta}</span>}
                </div>
                <div className="lb-act">
                  <span className="lb-count">{`${pad2(index! + 1)} / ${pad2(count)}`}</span>
                  {item.detail && (
                    <LocaleLink to={item.detail.to} slug={item.detail.slug} className="lb-l">
                      {m.details}{" "}
                      <span className="lb-l-ar" aria-hidden="true">
                        →
                      </span>
                    </LocaleLink>
                  )}
                </div>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
