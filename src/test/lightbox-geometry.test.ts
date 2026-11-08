import { describe, expect, it } from "vitest";
import {
  IDLE,
  LB,
  NO_ZOOM,
  albumThumb,
  clampPan,
  classifySwipe,
  fitRect,
  flyTransform,
  gestureStep,
  isDoubleTap,
  isZoomed,
  sideCardFits,
  thumbAt,
  toggleScale,
  wantsSideCard,
  wheelFactor,
  zoomAt,
  type GestureEvent,
  type GestureState,
} from "@/lib/lightbox";

const stage = { left: 100, top: 50, width: 1000, height: 600 };

describe("lightbox geometry (mock v12 lbRect, zAt, zClamp)", () => {
  it("uses the mock's constants", () => {
    expect(LB).toMatchObject({
      fitMax: 1.6,
      zoomMin: 1,
      zoomMax: 4,
      zoomToggle: 2.4,
      zoomStep: 1.4,
      wheel: 0.0022,
      doubleTapMs: 320,
      tapSlop: 8,
      swipeMove: 40,
      swipeX: 50,
      swipeRatio: 1.3,
      closeY: 110,
      closeMaxX: 70,
      sideMinWidth: 900,
      flyInMs: 420,
      flyOutMs: 240,
      slideFadeMs: 260,
      slidePx: 24,
      zoomAnimMs: 280,
    });
  });

  it("fits an image into the stage, centred and never upscaled beyond 1.6", () => {
    // Portrait 800 x 1200: height bound, 0.5 -> 400 x 600, centred horizontally.
    expect(fitRect(stage, 800, 1200)).toEqual({ left: 400, top: 50, width: 400, height: 600 });
    // Landscape 2000 x 1000: width bound, 0.5 -> 1000 x 500, centred vertically.
    expect(fitRect(stage, 2000, 1000)).toEqual({ left: 100, top: 100, width: 1000, height: 500 });
    // A small image grows at most 1.6 times.
    expect(fitRect(stage, 200, 100)).toEqual({ left: 440, top: 270, width: 320, height: 160 });
    expect(fitRect(stage, 0, 100)).toMatchObject({ width: 0, height: 0 });
  });

  it("chooses the side card for portrait images on wide screens, if it clears the image", () => {
    expect(wantsSideCard(800, 1200, 1440)).toBe(true);
    expect(wantsSideCard(800, 1200, 899)).toBe(false);
    expect(wantsSideCard(1600, 900, 1440)).toBe(false);
    expect(wantsSideCard(1000, 1000, 1440)).toBe(false);
    const image = { left: 400, top: 0, width: 600, height: 800 };
    expect(sideCardFits(image, 1440, 320)).toBe(true); // 1000 <= 1440 - 52 - 320
    expect(sideCardFits(image, 1300, 320)).toBe(false); // 1000 > 928
  });

  it("clamps the pan so a zoomed image never leaves the stage", () => {
    const image = { width: 400, height: 600 };
    // At 2x: 800 x 1200 in a 1000 x 600 stage -> no horizontal room, 300px vertical.
    expect(clampPan({ s: 2, x: 500, y: 999 }, image, stage)).toEqual({ s: 2, x: 0, y: 300 });
    expect(clampPan({ s: 2, x: -500, y: -999 }, image, stage)).toEqual({ s: 2, x: 0, y: -300 });
    expect(clampPan({ s: 4, x: 900, y: 0 }, image, stage)).toEqual({ s: 4, x: 300, y: 0 });
  });

  it("zooms around a point, keeps the limits and recentres at 1", () => {
    const image = { width: 400, height: 600 };
    // Around the stage centre the image does not move.
    expect(zoomAt(NO_ZOOM, 2.4, 600, 350, stage, image)).toEqual({ s: 2.4, x: 0, y: 0 });
    // Around a point above the centre, the content under that point stays put (y moves down).
    const z = zoomAt(NO_ZOOM, 2, 600, 250, stage, image);
    expect(z.s).toBe(2);
    expect(z.y).toBeCloseTo(100);
    expect(zoomAt(NO_ZOOM, 9, 600, 350, stage, image).s).toBe(4);
    expect(zoomAt({ s: 2, x: 0, y: 100 }, 0.5, 600, 350, stage, image)).toEqual(NO_ZOOM);
    expect(isZoomed({ s: 1.0005, x: 0, y: 0 })).toBe(false);
    expect(toggleScale(NO_ZOOM)).toBe(2.4);
    expect(toggleScale({ s: 3, x: 0, y: 0 })).toBe(1);
  });

  it("turns the wheel into a smooth zoom factor", () => {
    expect(wheelFactor(0)).toBe(1);
    expect(wheelFactor(-100)).toBeCloseTo(Math.exp(0.22));
    expect(wheelFactor(100)).toBeCloseTo(Math.exp(-0.22));
  });

  it("builds the fly transform from one box onto another", () => {
    expect(
      flyTransform(
        { left: 10, top: 20, width: 100, height: 125 },
        { left: 400, top: 50, width: 400, height: 600 },
      ),
    ).toBe("translate(-390px, -30px) scale(0.25, 0.20833333333333334)");
    expect(flyTransform(stage, { left: 0, top: 0, width: 0, height: 0 })).toBe("none");
  });
});

describe("lightbox swipes and taps", () => {
  const base = { moved: 200, pointerType: "touch", zoomed: false };
  it("classifies horizontal swipes, the touch swipe down and everything else", () => {
    expect(classifySwipe({ ...base, dx: -120, dy: 10 })).toBe("next");
    expect(classifySwipe({ ...base, dx: 120, dy: 10 })).toBe("prev");
    expect(classifySwipe({ ...base, dx: 60, dy: 50 })).toBeNull(); // not 1.3x the vertical
    expect(classifySwipe({ ...base, dx: 20, dy: 140 })).toBe("close");
    expect(classifySwipe({ ...base, dx: 20, dy: 140, pointerType: "mouse" })).toBeNull();
    expect(classifySwipe({ ...base, dx: 80, dy: 140 })).toBeNull(); // drifts too far sideways
    expect(classifySwipe({ ...base, dx: -120, dy: 0, zoomed: true })).toBeNull();
    expect(classifySwipe({ ...base, dx: -120, dy: 0, moved: 40 })).toBeNull();
  });

  it("detects a double tap within 320 ms", () => {
    expect(isDoubleTap(null, 1000)).toBe(false);
    expect(isDoubleTap(1000, 1319)).toBe(true);
    expect(isDoubleTap(1000, 1320)).toBe(false);
  });
});

describe("lightbox gesture state machine", () => {
  const run = (events: GestureEvent[], start: GestureState = IDLE) => {
    let state = start;
    const intents = [];
    for (const event of events) {
      const step = gestureStep(state, event);
      state = step.state;
      if (step.intent) intents.push(step.intent);
    }
    return { state, intents };
  };
  const down = (id: number, x: number, y: number, pointerType = "touch", scale = 1) =>
    ({ type: "down", id, x, y, pointerType, scale }) as const;
  const move = (id: number, x: number, y: number, zoomed = false) =>
    ({ type: "move", id, x, y, zoomed }) as const;
  const up = (id: number, x: number, y: number, zoomed = false) =>
    ({ type: "up", id, x, y, zoomed }) as const;

  it("a still press is a tap, a short wobble too", () => {
    expect(run([down(1, 100, 100), up(1, 100, 100)]).intents).toEqual([
      { type: "tap", x: 100, y: 100 },
    ]);
    const wobble = run([down(1, 100, 100), move(1, 103, 102), up(1, 103, 102)]);
    expect(wobble.intents).toEqual([{ type: "tap", x: 103, y: 102 }]);
    expect(wobble.state.phase).toBe("idle");
  });

  it("a long horizontal drag is a swipe and never a tap", () => {
    const r = run([down(1, 300, 100), move(1, 250, 102), move(1, 150, 104), up(1, 150, 104)]);
    expect(r.intents).toEqual([{ type: "next" }]);
    const mid = run([down(1, 300, 100), move(1, 250, 102)]);
    expect(mid.state.phase).toBe("swipe");
  });

  it("a touch drag down closes", () => {
    expect(
      run([down(1, 200, 100), move(1, 205, 180), move(1, 210, 260), up(1, 210, 260)]).intents,
    ).toEqual([{ type: "close" }]);
  });

  it("dragging a zoomed image pans and its end is not a swipe", () => {
    const r = run([down(1, 300, 100), move(1, 200, 100, true), up(1, 200, 100, true)]);
    expect(r.intents).toEqual([{ type: "pan", dx: -100, dy: 0 }]);
  });

  it("two fingers pinch around their midpoint; the pinch never ends in a swipe or a tap", () => {
    const r = run([
      down(1, 100, 100),
      down(2, 200, 100),
      move(2, 300, 100),
      up(2, 300, 100),
      move(1, 20, 100),
      up(1, 20, 100),
    ]);
    expect(r.intents).toEqual([{ type: "pinch", scale: 2, cx: 200, cy: 100 }]);
    expect(r.state).toEqual(IDLE);
  });

  it("a pinch starts from the current zoom", () => {
    const r = run([
      down(1, 100, 100, "touch", 2),
      down(2, 200, 100, "touch", 2),
      move(2, 150, 100),
    ]);
    expect(r.intents).toEqual([{ type: "pinch", scale: 1, cx: 125, cy: 100 }]);
  });

  it("a third finger is tracked but the pinch keeps the first two", () => {
    const r = run([down(1, 100, 100), down(2, 200, 100), down(3, 500, 500), move(3, 600, 600)]);
    expect(r.state.phase).toBe("pinch");
    expect(r.intents).toEqual([{ type: "pinch", scale: 1, cx: 150, cy: 100 }]);
  });

  it("pointercancel forgets the pointer without an intent", () => {
    const r = run([down(1, 100, 100), move(1, 300, 100), { type: "cancel", id: 1 }]);
    expect(r.intents).toEqual([]);
    expect(r.state).toEqual(IDLE);
    // An up for an unknown pointer is ignored.
    expect(run([up(9, 0, 0)]).intents).toEqual([]);
  });
});

describe("lightbox thumbnails", () => {
  it("finds a grid's thumbnail and an album's same-grid button", () => {
    document.body.innerHTML = `
      <div id="grid"><button data-thumb-index="0"></button><button data-thumb-index="1"></button></div>
      <section id="curated"><button data-full-index="3" id="c3"></button><button data-full-index="4" id="c4"></button></section>
      <section id="all"><button data-full-index="3" id="a3"></button><button data-full-index="4" id="a4"></button><button data-full-index="5" id="a5"></button></section>`;
    expect(thumbAt(document.getElementById("grid"), 1)).toBe(
      document.querySelector('[data-thumb-index="1"]'),
    );
    expect(thumbAt(null, 1)).toBeNull();
    const opener = document.getElementById("a3")!;
    expect(albumThumb(opener, 3)).toBe(opener);
    expect(albumThumb(opener, 4)!.id).toBe("a4");
    expect(albumThumb(document.getElementById("c3"), 4)!.id).toBe("c4");
    expect(albumThumb(document.getElementById("c3"), 5)!.id).toBe("a5");
    expect(albumThumb(null, 1)).toBeNull();
  });
});
