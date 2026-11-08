// Motion pack 4: AI cards rise timing, About iris toggle, back-to-top ring maths and visibility.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import {
  BACK_TO_TOP,
  isBackToTopVisible,
  ringCircumference,
  ringOffset,
  ringRadius,
  scrollProgress,
} from "@/lib/back-to-top";
import { PortraitSwitch } from "@/components/portrait";
import { IRIS, irisClip, irisOriginX, pressIris } from "@/lib/portrait-iris";
import {
  AI_CARDS_RISE,
  riseDelay,
  riseGridStyle,
  riseItemStyle,
  riseThreshold,
  useGridRise,
} from "@/hooks/use-grid-rise";
import { messages } from "@/i18n/messages";

const state = vi.hoisted(() => ({ locale: "bg" as "bg" | "en" }));
vi.mock("@/i18n", () => ({ useT: () => ({ t: messages[state.locale], locale: state.locale }) }));

const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

const media = (reduced: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion: reduce") ? reduced : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  state.locale = "bg";
});

describe("AI cards rise", () => {
  it("staggers the cards by 0.12s from 0.12s and keeps the approved timing in one place", () => {
    expect(AI_CARDS_RISE).toEqual({
      distance: 28,
      staggerS: 0.12,
      opacityS: 0.8,
      transformS: 0.9,
      ease: "cubic-bezier(.2,.7,.2,1)",
      threshold: 0.2,
    });
    expect([0, 1, 2, 3, 4, 5].map(riseDelay)).toEqual([0.12, 0.24, 0.36, 0.48, 0.6, 0.72]);
    expect(riseItemStyle(2)).toEqual({ "--rise-delay": "0.36s" });
    // 20% of the grid, but never more than 20% of the viewport (tall stacked grids on phones).
    expect(riseThreshold(400, 800)).toBe(0.2);
    expect(riseThreshold(2000, 844)).toBeCloseTo(0.0844, 4);
    expect(riseGridStyle).toEqual({
      "--rise-distance": "28px",
      "--rise-opacity-s": "0.8s",
      "--rise-transform-s": "0.9s",
      "--rise-ease": "cubic-bezier(.2,.7,.2,1)",
    });
  });

  it("animates only a pending grid, and only when motion is allowed", () => {
    expect(css).toContain(
      '@media (prefers-reduced-motion: no-preference) { [data-grid-rise="pending"] > * { opacity: 0; transform: translateY(var(--rise-distance)); }',
    );
    expect(css).toContain(
      "ai-rise-fade var(--rise-opacity-s) var(--rise-ease) var(--rise-delay, 0s) both, ai-rise-move var(--rise-transform-s) var(--rise-ease) var(--rise-delay, 0s) both;",
    );
  });

  function Grid() {
    const ref = useRef<HTMLDivElement>(null);
    useGridRise(ref);
    return (
      <div ref={ref} data-testid="grid">
        <article />
      </div>
    );
  }

  it("never hides anything under reduced motion or without an observer", async () => {
    media(true);
    const observe = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe;
        disconnect() {}
      },
    );
    render(<Grid />);
    await new Promise((r) => requestAnimationFrame(r));
    expect(screen.getByTestId("grid").dataset["gridRise"]).toBeUndefined();
    expect(observe).not.toHaveBeenCalled();
  });

  it("hides a grid that starts below the viewport, then shows it once it enters (never again hidden)", async () => {
    media(false);
    let fire: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          cb: typeof fire,
          readonly options: IntersectionObserverInit,
        ) {
          fire = cb;
          expect(options.threshold).toBe(AI_CARDS_RISE.threshold);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 200,
      height: 400,
    } as DOMRect);
    render(<Grid />);
    await new Promise((r) => requestAnimationFrame(r));
    const grid = screen.getByTestId("grid");
    expect(grid.dataset["gridRise"]).toBe("pending");
    fire!([{ isIntersecting: true }]);
    expect(grid.dataset["gridRise"]).toBe("shown");
  });

  it("keeps a grid that is already on screen at rest (no pending state, no observer)", async () => {
    media(false);
    const ctor = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor() {
          ctor();
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 100,
    } as DOMRect);
    render(<Grid />);
    await new Promise((r) => requestAnimationFrame(r));
    expect(screen.getByTestId("grid").dataset["gridRise"]).toBeUndefined();
    expect(ctor).not.toHaveBeenCalled();
  });

  it("lifts and sweeps on hover only for fine pointers with motion allowed", () => {
    const hover = css.indexOf(
      "@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) { .ai-card-media {",
    );
    expect(hover).toBeGreaterThan(-1);
    expect(css.slice(hover, hover + 700)).toContain(
      ".ai-card:hover .ai-card-media { transform: translateY(var(--ai-card-lift)); box-shadow: var(--ai-card-shadow); }",
    );
    expect(css).toContain("--ai-card-lift: -6px;");
    expect(css).toContain(
      "--ai-card-sweep: linear-gradient( 105deg, transparent 30%, rgb(255 236 200 / 0.22) 48%, transparent 62% );",
    );
    expect(css).toContain("background-position: 160% 0;");
    expect(css).toContain(
      ".ai-card:hover .ai-card-media::after { background-position: -60% 0; transition: background-position var(--ai-card-sweep-s) var(--ai-card-sweep-ease); }",
    );
  });
});

describe("About iris toggle", () => {
  it("keeps its timing in one place and opens a circle from the pressed button at the bottom edge", () => {
    expect(IRIS).toMatchObject({
      durationMs: 900,
      ease: "cubic-bezier(.65,0,.25,1)",
      openRadius: "150%",
      ringTo: "260%",
      originY: "100%",
    });
    expect(irisOriginX({ left: 140, width: 100 }, { left: 100, width: 400 })).toBe(22.5);
    expect(irisOriginX({ left: 900, width: 100 }, { left: 100, width: 400 })).toBe(100);
    expect(irisOriginX({ left: 0, width: 10 }, { left: 0, width: 0 })).toBe(50);
    expect(irisClip(false)).toBe("circle(0% at var(--iris-x) var(--iris-y))");
    expect(irisClip(true)).toBe("circle(150% at var(--iris-x) var(--iris-y))");
  });

  it("switches only on a change, starts a new ring each time, and skips it under reduced motion", () => {
    expect(pressIris("real", "real", null, false)).toBeNull();
    expect(pressIris("real", "ai", null, false)).toEqual({ mode: "ai", ring: 1 });
    expect(pressIris("ai", "real", 1, false)).toEqual({ mode: "real", ring: 2 });
    expect(pressIris("real", "ai", 2, true)).toEqual({ mode: "ai", ring: null });
  });

  it.each(["bg", "en"] as const)(
    "shows the real portrait first, keeps the AI one closed and hidden, and toggles both ways (%s)",
    (locale) => {
      state.locale = locale;
      media(false);
      const t = messages[locale];
      const { container } = render(<PortraitSwitch aiImage="/ai.webp" />);
      const [realImg, aiImg] = Array.from(container.querySelectorAll("img"));
      const layer = container.querySelector<HTMLElement>(".portrait-iris")!;
      expect(realImg).toHaveAttribute("alt", t.portrait.realAlt);
      expect(aiImg).toHaveAttribute("alt", t.portrait.aiAlt);
      expect(layer.style.clipPath).toBe(irisClip(false));
      expect(layer).toHaveAttribute("aria-hidden", "true");
      expect(realImg).not.toHaveAttribute("aria-hidden");

      const group = screen.getByRole("group", { name: t.portrait.group });
      const [realBtn, aiBtn] = Array.from(group.querySelectorAll("button"));
      expect(realBtn).toHaveTextContent(t.portrait.real);
      expect(aiBtn).toHaveTextContent(t.portrait.ai);
      expect(realBtn).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(aiBtn!);
      expect(aiBtn).toHaveAttribute("aria-pressed", "true");
      expect(realBtn).toHaveAttribute("aria-pressed", "false");
      expect(layer.style.clipPath).toBe(irisClip(true));
      expect(layer).not.toHaveAttribute("aria-hidden");
      expect(realImg).toHaveAttribute("aria-hidden", "true");
      const ring = container.querySelector(".portrait-iris-ring")!;
      expect(ring).not.toBeNull();
      fireEvent.animationEnd(ring);
      expect(container.querySelector(".portrait-iris-ring")).toBeNull();

      // Fast presses: the last one wins and only one ring is ever on screen.
      fireEvent.click(realBtn!);
      fireEvent.click(aiBtn!);
      fireEvent.click(realBtn!);
      expect(realBtn).toHaveAttribute("aria-pressed", "true");
      expect(layer.style.clipPath).toBe(irisClip(false));
      expect(container.querySelectorAll(".portrait-iris-ring")).toHaveLength(1);
    },
  );

  it("switches at once without a ring under reduced motion", () => {
    media(true);
    const { container } = render(<PortraitSwitch aiImage="/ai.webp" />);
    fireEvent.click(screen.getByRole("button", { name: messages.bg.portrait.ai }));
    expect(container.querySelector<HTMLElement>(".portrait-iris")!.style.clipPath).toBe(
      irisClip(true),
    );
    expect(container.querySelector(".portrait-iris-ring")).toBeNull();
    expect(css).toContain(
      "@media (prefers-reduced-motion: reduce) { .portrait-iris { transition: none; } .portrait-iris-ring { display: none; } }",
    );
  });
});

describe("Back-to-top ring and visibility", () => {
  it("derives the ring from the diameter and the stroke", () => {
    expect(BACK_TO_TOP).toMatchObject({
      appearAt: 0.9,
      size: 52,
      mobileSize: 46,
      mobileMax: 600,
      ringStroke: 2,
    });
    expect(ringRadius(52)).toBe(25);
    expect(ringRadius(46)).toBe(22);
    expect(ringCircumference(52)).toBeCloseTo(2 * Math.PI * 25, 9);
    expect(ringOffset(0, 100)).toBe(100);
    expect(ringOffset(0.25, 100)).toBe(75);
    expect(ringOffset(1, 100)).toBe(0);
    expect(ringOffset(2, 100)).toBe(0);
  });

  it("measures page progress from 0 at the top to 1 at the bottom", () => {
    expect(scrollProgress(0, 3000, 1000)).toBe(0);
    expect(scrollProgress(500, 3000, 1000)).toBe(0.25);
    expect(scrollProgress(2000, 3000, 1000)).toBe(1);
    expect(scrollProgress(2500, 3000, 1000)).toBe(1);
    expect(scrollProgress(100, 800, 1000)).toBe(0);
  });

  it("appears after 0.9 viewport heights, as in the mock", () => {
    expect(isBackToTopVisible(900, 1000)).toBe(false);
    expect(isBackToTopVisible(901, 1000)).toBe(true);
  });

  it("matches the CSS sizes and stays below the header and dialogs", () => {
    expect(css).toContain(
      ".back-to-top { position: fixed; z-index: 30; right: max(22px, env(safe-area-inset-right)); bottom: calc(22px + env(safe-area-inset-bottom));",
    );
    expect(css).toContain("width: 52px; height: 52px;");
    expect(css).toContain(
      "@media (max-width: 600px) { .back-to-top { width: 46px; height: 46px; bottom: calc(16px + env(safe-area-inset-bottom)); } }",
    );
  });
});
