import { MoveHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WORLD_SLIDES, localizeWorldSlide } from "@/content/world-slider";
import { useT } from "@/i18n";

const START_POSITION = 0.5;
const MOBILE_QUERY = "(max-width: 760px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const easeInOutCubic = (value: number) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function WorldSlider() {
  const { locale, t } = useT();
  const copy = t.home.worldSlider;
  const [activeIndex, setActiveIndex] = useState(0);
  const activeWorld = localizeWorldSlide(WORLD_SLIDES[activeIndex]!, locale);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const aiInnerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const leftChipRef = useRef<HTMLSpanElement>(null);
  const rightChipRef = useRef<HTMLSpanElement>(null);
  const positionRef = useRef(START_POSITION);
  const widthRef = useRef(0);
  const animationRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const demoDoneRef = useRef(false);
  const draggingRef = useRef(false);
  const pendingTouchRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const firstImagesLoadedRef = useRef(0);
  const preloadScheduledRef = useRef(false);
  const preloadTimerRef = useRef(0);
  const preloadIdleRef = useRef(0);

  const setPosition = useCallback(
    (next: number) => {
      const stage = stageRef.current;
      const ai = aiRef.current;
      const aiInner = aiInnerRef.current;
      const divider = dividerRef.current;
      if (!stage || !ai || !aiInner || !divider) return;

      const position = clamp(next);
      positionRef.current = position;
      const pixels = `${(position * widthRef.current).toFixed(1)}px`;
      ai.style.transform = `translate3d(${pixels}, 0, 0)`;
      aiInner.style.transform = `translate3d(-${pixels}, 0, 0)`;
      divider.style.left = "0px";
      divider.style.transform = `translate3d(${pixels}, 0, 0)`;

      const real = Math.round(position * 100);
      stage.setAttribute("aria-valuenow", String(real));
      stage.setAttribute("aria-valuetext", copy.valueText(real, 100 - real));
      if (leftChipRef.current) leftChipRef.current.style.opacity = position < 0.14 ? "0" : "1";
      if (rightChipRef.current) rightChipRef.current.style.opacity = position > 0.86 ? "0" : "1";
    },
    [copy],
  );

  const stopAnimation = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = 0;
  }, []);

  const animateTo = useCallback(
    (target: number, duration: number, onComplete?: () => void) => {
      stopAnimation();
      if (reducedMotionRef.current) {
        setPosition(target);
        onComplete?.();
        return;
      }
      const from = positionRef.current;
      const start = performance.now();
      const frame = (now: number) => {
        const progress = clamp((now - start) / duration);
        setPosition(from + (target - from) * easeInOutCubic(progress));
        if (progress < 1) animationRef.current = requestAnimationFrame(frame);
        else {
          animationRef.current = 0;
          onComplete?.();
        }
      };
      animationRef.current = requestAnimationFrame(frame);
    },
    [setPosition, stopAnimation],
  );

  const applyFocus = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    for (const image of stage.querySelectorAll<HTMLImageElement>("[data-focus-desktop]")) {
      image.style.objectPosition = mobile
        ? (image.dataset["focusMobile"] ?? "50% 50%")
        : (image.dataset["focusDesktop"] ?? "50% 50%");
    }
  }, []);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    widthRef.current = stage.clientWidth;
    setPosition(positionRef.current);
  }, [setPosition]);

  const markTouched = useCallback(() => {
    demoDoneRef.current = true;
    stageRef.current?.classList.add("is-touched");
  }, []);

  const positionFromClientX = useCallback(
    (clientX: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      setPosition((clientX - rect.left) / rect.width);
    },
    [setPosition],
  );

  const chooseWorld = (index: number) => {
    if (index === activeIndex) return;
    stopAnimation();
    demoDoneRef.current = true;
    setActiveIndex(index);
    applyFocus();
    if (reducedMotionRef.current) setPosition(START_POSITION);
    else {
      setPosition(0.9);
      animateTo(START_POSITION, 1100);
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    stopAnimation();
    markTouched();
    const target = event.target instanceof Element ? event.target : null;
    if (event.pointerType === "mouse" || target?.closest(".world-slider-knob")) {
      draggingRef.current = true;
      stageRef.current?.classList.add("is-dragging");
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional (older browsers can still drag while the pointer stays here).
      }
      if (event.pointerType === "mouse") positionFromClientX(event.clientX);
      return;
    }
    pendingTouchRef.current = true;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pendingTouchRef.current) {
      const dx = event.clientX - pointerStartRef.current.x;
      const dy = event.clientY - pointerStartRef.current.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        pendingTouchRef.current = false;
        draggingRef.current = true;
        stageRef.current?.classList.add("is-dragging");
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // The gesture continues without capture if the browser rejects it.
        }
      } else if (Math.abs(dy) > 8) pendingTouchRef.current = false;
    }
    if (draggingRef.current) positionFromClientX(event.clientX);
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.type === "pointerup" && pendingTouchRef.current && event.pointerType !== "mouse")
      positionFromClientX(event.clientX);
    draggingRef.current = false;
    pendingTouchRef.current = false;
    stageRef.current?.classList.remove("is-dragging");
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.04;
    let next: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = positionRef.current - step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp")
      next = positionRef.current + step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 1;
    else if (event.key === "PageDown") next = positionRef.current - 0.1;
    else if (event.key === "PageUp") next = positionRef.current + 0.1;
    if (next === null) return;
    event.preventDefault();
    stopAnimation();
    markTouched();
    setPosition(next);
  };

  const schedulePreload = () => {
    firstImagesLoadedRef.current += 1;
    if (firstImagesLoadedRef.current < 2 || preloadScheduledRef.current) return;
    preloadScheduledRef.current = true;
    const run = () => {
      for (const world of WORLD_SLIDES.slice(1)) {
        for (const src of [world.real.image, world.ai.image]) {
          const image = new Image();
          image.src = src;
        }
      }
    };
    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback)
      preloadIdleRef.current = idleWindow.requestIdleCallback(run);
    else preloadTimerRef.current = window.setTimeout(run, 1200);
  };

  useEffect(() => {
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => {
      reducedMotionRef.current = reduced.matches;
      if (reduced.matches) stopAnimation();
    };
    update();
    reduced.addEventListener("change", update);
    return () => reduced.removeEventListener("change", update);
  }, [stopAnimation]);

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY);
    const update = () => {
      measure();
      applyFocus();
    };
    update();
    window.addEventListener("resize", update);
    mobile.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      mobile.removeEventListener("change", update);
    };
  }, [applyFocus, measure]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    let observer: IntersectionObserver | undefined;
    const frame = window.requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting || demoDoneRef.current || reducedMotionRef.current) return;
          demoDoneRef.current = true;
          setPosition(0.92);
          animateTo(0.32, 1700, () => animateTo(START_POSITION, 700));
        },
        { threshold: 0.5 },
      );
      observer.observe(section);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [animateTo, setPosition]);

  useEffect(
    () => () => {
      stopAnimation();
      const idleWindow = window as IdleWindow;
      if (preloadIdleRef.current) idleWindow.cancelIdleCallback?.(preloadIdleRef.current);
      if (preloadTimerRef.current) window.clearTimeout(preloadTimerRef.current);
    },
    [stopAnimation],
  );

  return (
    <section
      ref={sectionRef}
      id="slider"
      data-header-theme="dark"
      aria-labelledby="world-slider-title"
      className="world-slider-section surface-dark"
    >
      <div className="container-page">
        <div className="world-slider-header">
          <div className="world-slider-heading">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2 id="world-slider-title">{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
          <div className="world-slider-selector" role="group" aria-label={copy.chooseWorld}>
            {WORLD_SLIDES.map((world, index) => (
              <button
                key={world.id}
                type="button"
                aria-pressed={index === activeIndex}
                onClick={() => chooseWorld(index)}
              >
                {world.name[locale]}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={stageRef}
          className="world-slider-stage"
          role="slider"
          tabIndex={0}
          aria-label={copy.sliderLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
          aria-valuetext={copy.valueText(50, 50)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onLostPointerCapture={endPointer}
          onKeyDown={onKeyDown}
        >
          <div className="world-slider-real">
            {WORLD_SLIDES.map((world, index) => (
              <div
                key={world.id}
                className={`world-slider-layer ${index === activeIndex ? "is-active" : ""}`}
                aria-hidden={index !== activeIndex}
              >
                <img
                  src={world.real.image}
                  alt={world.real.alt[locale]}
                  width={1672}
                  height={941}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  data-focus-desktop={world.focus[0]}
                  data-focus-mobile={world.focus[1]}
                  style={{ objectPosition: world.focus[0] }}
                  onLoad={index === 0 ? schedulePreload : undefined}
                />
              </div>
            ))}
          </div>
          <div
            ref={aiRef}
            className="world-slider-ai"
            style={{ transform: "translate3d(50%, 0, 0)" }}
          >
            <div
              ref={aiInnerRef}
              className="world-slider-ai-inner"
              style={{ transform: "translate3d(-50%, 0, 0)" }}
            >
              {WORLD_SLIDES.map((world, index) => (
                <div
                  key={world.id}
                  className={`world-slider-layer ${index === activeIndex ? "is-active" : ""}`}
                  aria-hidden={index !== activeIndex}
                >
                  <img
                    src={world.ai.image}
                    alt={world.ai.alt[locale]}
                    width={1672}
                    height={941}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    data-focus-desktop={world.focus[0]}
                    data-focus-mobile={world.focus[1]}
                    style={{ objectPosition: world.focus[0] }}
                    onLoad={index === 0 ? schedulePreload : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
          <div
            ref={dividerRef}
            className="world-slider-divider"
            style={{ left: "50%" }}
            aria-hidden="true"
          >
            <span className="world-slider-knob">
              <MoveHorizontal strokeWidth={1.8} />
            </span>
          </div>
          <span className="world-slider-hint" aria-hidden="true">
            {copy.hint}
          </span>
          <span ref={leftChipRef} className="world-slider-chip is-left">
            {copy.realWorld}
            <span className="world-slider-chip-tag"> · {activeWorld.tagL}</span>
          </span>
          <span ref={rightChipRef} className="world-slider-chip is-right">
            {copy.aiWorld}
            <span className="world-slider-chip-tag"> · {activeWorld.tagR}</span>
          </span>
        </div>
        <p className="world-slider-caption">{activeWorld.cap}</p>
      </div>
    </section>
  );
}
