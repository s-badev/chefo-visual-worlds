import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAiCollections, getCollectionWorkSlugs } from "@/content/ai-collections";
import { WORLD_PORTRAITS, getWorldPortraits } from "@/content/home-worlds";
import {
  TEXT_IN_START,
  TEXT_OUT_END,
  WORLDS_PIN_QUERY,
  WORLD_FADE,
  WORLD_HOLDS,
  computeFaceLayout,
  crossBlur,
  exposedIndex,
  faceAnchor,
  isStackedWorlds,
  layerOpacities,
  progressAt,
  steadyProgress,
  textFades,
  textStates,
  worldScrollTarget,
  worldsProgress,
} from "@/lib/worlds-motion";

const portraits = getWorldPortraits();
const BOXES = [
  { width: 540, height: 720 },
  { width: 525, height: 640 },
  { width: 369, height: 480 },
  { width: 412, height: 734 },
];

describe("world portraits", () => {
  it("has one measured portrait per collection, in collection order", () => {
    expect(portraits.map((p) => p.collection.slug)).toEqual(getAiCollections().map((c) => c.slug));
    expect(Object.keys(WORLD_PORTRAITS)).toHaveLength(4);
  });

  it("uses published WebP works that belong to their own collection", () => {
    for (const { collection, work } of portraits) {
      expect(work.image).toMatch(/\.webp$/);
      expect(getCollectionWorkSlugs(collection)).toContain(work.slug);
    }
  });

  it("stores eyes inside each image with a plausible pupil distance", () => {
    for (const { work, eyes } of portraits) {
      expect(eyes.mx).toBeGreaterThan(0);
      expect(eyes.mx).toBeLessThan(work.width!);
      expect(eyes.my).toBeGreaterThan(0);
      expect(eyes.my).toBeLessThan(work.height!);
      expect(eyes.d).toBeGreaterThan(40);
      expect(eyes.d).toBeLessThan(work.width! / 4);
    }
  });
});

describe("computeFaceLayout", () => {
  it.each(BOXES)("maps every pupil midpoint onto the same anchor in a %o box", (box) => {
    const { ax, ay, D } = faceAnchor(box);
    for (const { work, eyes } of portraits) {
      const l = computeFaceLayout(box, {
        naturalWidth: work.width!,
        naturalHeight: work.height!,
        eyes,
      });
      expect(l.left + eyes.mx * l.scale).toBeCloseTo(ax, 6);
      expect(l.top + eyes.my * l.scale).toBeCloseTo(ay, 6);
      expect(eyes.d * l.scale).toBeCloseTo(D, 6);
      // One uniform scale: no distortion.
      expect(l.width / work.width!).toBeCloseTo(l.height / work.height!, 9);
      expect(l.originX).toBeCloseTo(eyes.mx * l.scale, 9);
      expect(l.originY).toBeCloseTo(eyes.my * l.scale, 9);
    }
  });

  it("uses the anchor at 50% / 38% and a pupil distance of 10.8% of the box width", () => {
    expect(faceAnchor({ width: 500, height: 700 })).toEqual({ ax: 250, ay: 266, D: 54 });
  });
});

describe("worlds progress", () => {
  it("maps the scroll track to p, i0, i1 and t", () => {
    // Track 4200, viewport 1000: 3200 px of travel.
    expect(worldsProgress(0, 4200, 1000)).toMatchObject({ p: 0, f: 0, i0: 0, i1: 1, t: 0 });
    expect(worldsProgress(-1600, 4200, 1000)).toMatchObject({ p: 0.5, i0: 1, i1: 2 });
    expect(worldsProgress(-1600, 4200, 1000).f).toBeCloseTo(1.5);
    expect(worldsProgress(-1600, 4200, 1000).t).toBeCloseTo(0.5);
    expect(worldsProgress(-3200, 4200, 1000)).toMatchObject({ p: 1, f: 3, i0: 3, i1: 3, t: 0 });
    expect(worldsProgress(500, 4200, 1000).p).toBe(0);
    expect(worldsProgress(-9999, 4200, 1000).p).toBe(1);
  });

  it("holds the first and last worlds longest and gives the three crossfades equal room", () => {
    expect(WORLD_HOLDS).toEqual([0.14, 0.12, 0.12, 0.14]);
    expect(WORLD_FADE).toBeCloseTo(0.16, 9);
    expect(WORLD_HOLDS.reduce((a, b) => a + b, 0) + 3 * WORLD_FADE).toBeCloseTo(1, 9);
    expect(WORLD_HOLDS[0]).toBeGreaterThan(WORLD_HOLDS[1]);
    expect(WORLD_HOLDS[3]).toBeGreaterThan(WORLD_HOLDS[2]);
  });

  it("holds each world steady between the crossfades", () => {
    // Holds: 0-0.14, 0.30-0.42, 0.58-0.70, 0.86-1. Fades: 0.14-0.30, 0.42-0.58, 0.70-0.86.
    const holds: [number, number, number][] = [
      [0, 0.1399, 0],
      [0.3001, 0.4199, 1],
      [0.5801, 0.6999, 2],
      [0.8601, 1, 3],
    ];
    for (const [from, to, world] of holds)
      for (const p of [from, (from + to) / 2, to]) {
        expect(progressAt(p)).toMatchObject({ i0: world, t: 0 });
      }
    // Each crossfade is symmetric around its middle.
    for (const [mid, i0] of [
      [0.22, 0],
      [0.5, 1],
      [0.78, 2],
    ] as const) {
      expect(progressAt(mid)).toMatchObject({ i0, i1: i0 + 1 });
      expect(progressAt(mid).t).toBeCloseTo(0.5, 9);
    }
  });
});

const SAMPLES = Array.from({ length: 301 }, (_, k) => k / 300);

describe("layer invariants", () => {
  it.each(SAMPLES.filter((_, k) => k % 10 === 0))("keeps one opaque portrait at p = %f", (p) => {
    const { i0, t } = progressAt(p);
    const opacities = layerOpacities(i0, t);
    expect(Math.max(...opacities)).toBe(1);
  });

  it("never leaves the stage without an opaque layer at any sampled f", () => {
    for (const p of SAMPLES) {
      const { i0, t } = progressAt(p);
      expect(layerOpacities(i0, t)).toContain(1);
    }
  });

  it("puts the incoming layer above the outgoing one and fades only that layer", () => {
    for (const i0 of [0, 1, 2]) {
      const o = layerOpacities(i0, 0.4);
      expect(o[i0]).toBe(1);
      expect(o[i0 + 1]).toBe(0.4);
      expect(i0 + 1).toBeGreaterThan(i0); // stacked by index: later = above
      expect(o.filter((v, i) => i !== i0 && i !== i0 + 1).every((v) => v === 0)).toBe(true);
    }
  });

  it("shows only the last layer at the end", () => {
    expect(layerOpacities(3, 0)).toEqual([0, 0, 0, 1]);
  });

  it("softens the crossing portraits at most 4px, peaking halfway", () => {
    expect(crossBlur(0)).toEqual({ blur: 0, scale: 1 });
    expect(crossBlur(1).blur).toBe(0);
    expect(crossBlur(0.5).blur).toBe(4);
    expect(crossBlur(0.5).scale).toBeCloseTo(1.036);
  });
});

describe("text invariants", () => {
  it("tunes the sequence in two named constants: out by 0.4, in from 0.6", () => {
    expect(TEXT_OUT_END).toBe(0.4);
    expect(TEXT_IN_START).toBe(0.6);
    expect(TEXT_OUT_END).toBeLessThan(0.5);
    expect(TEXT_IN_START).toBeGreaterThan(0.5);
  });

  it.each([
    // t, outgoing, incoming (smoothstep on each part)
    [0, 1, 0],
    [0.2, 0.5, 0],
    [0.35, 0.04296875, 0],
    [0.4, 0, 0],
    [0.5, 0, 0],
    [0.6, 0, 0],
    [0.65, 0, 0.04296875],
    [0.8, 0, 0.5],
    [1, 0, 1],
  ])("fades out, pauses, then fades in: t = %f -> out %f, in %f", (t, out, inc) => {
    for (const i0 of [0, 1, 2]) {
      const o = textStates(i0, t).map((x) => x.opacity);
      expect(o[i0]).toBeCloseTo(out, 9);
      expect(o[i0 + 1]).toBeCloseTo(inc, 9);
      expect(o.filter((_, i) => i !== i0 && i !== i0 + 1).every((v) => v === 0)).toBe(true);
    }
  });

  it("never shows two texts at once, and leaves the column empty only between 0.4 and 0.6", () => {
    for (const t of Array.from({ length: 10001 }, (_, k) => k / 10000)) {
      const f = textFades(t);
      const visible = [1 - f.out, f.in].filter((a) => a > 0.02);
      expect(visible.length).toBeLessThanOrEqual(1);
      if (t <= TEXT_OUT_END) expect(f.in).toBe(0);
      if (t >= TEXT_IN_START) expect(f.out).toBe(1);
      if (t > TEXT_OUT_END && t < TEXT_IN_START) expect(1 - f.out + f.in).toBe(0);
    }
    // Along the track: at most one text above 0.02, and any visible text is the exposed group.
    for (const p of Array.from({ length: 4001 }, (_, k) => k / 4000)) {
      const { i0, t } = progressAt(p);
      const o = textStates(i0, t).map((x) => x.opacity);
      expect(o.filter((a) => a > 0.02).length).toBeLessThanOrEqual(1);
      o.forEach((a, i) => {
        if (a > 0.02) expect(i).toBe(exposedIndex(i0, t));
      });
    }
    for (const mid of [0.22, 0.5, 0.78]) {
      const { i0, t } = progressAt(mid);
      expect(t).toBeCloseTo(0.5, 9);
      expect(textStates(i0, t).every((x) => x.opacity === 0)).toBe(true);
    }
  });

  it("shows exactly one text at 1 at every hold centre", () => {
    for (const [p, world] of [
      [0.07, 0],
      [0.36, 1],
      [0.64, 2],
      [0.93, 3],
    ] as const) {
      const { i0, t } = progressAt(p);
      expect(textStates(i0, t).map((x) => x.opacity)).toEqual(
        [0, 1, 2, 3].map((i) => (i === world ? 1 : 0)),
      );
    }
  });

  it("starts and ends each change on one readable text", () => {
    expect(textStates(1, 0).map((x) => x.opacity)).toEqual([0, 1, 0, 0]);
    expect(textStates(1, 1).map((x) => x.opacity)).toEqual([0, 0, 1, 0]);
    expect(textStates(1, 0)[1]!.y).toBe(-0);
    expect(textStates(1, 1)[2]!.y).toBe(0);
    expect(textStates(1, 0)[2]!.y).toBe(18);
  });

  it("shows only the last text at the end", () => {
    expect(textStates(3, 0)).toEqual([
      { opacity: 0, y: 0 },
      { opacity: 0, y: 0 },
      { opacity: 0, y: 0 },
      { opacity: 1, y: 0 },
    ]);
  });

  it("switches the exposed group exactly at t = 0.5", () => {
    expect(exposedIndex(0, 0.4999)).toBe(0);
    expect(exposedIndex(0, 0.5)).toBe(1);
    expect(exposedIndex(2, 0.75)).toBe(3);
    expect(exposedIndex(3, 0)).toBe(3);
  });
});

describe("fallback decision and jumps", () => {
  it("pins only on wide, tall-enough windows that allow motion", () => {
    expect(isStackedWorlds({ width: 1280, height: 800, reducedMotion: false })).toBe(false);
    expect(isStackedWorlds({ width: 900, height: 600, reducedMotion: false })).toBe(false);
    expect(isStackedWorlds({ width: 899, height: 800, reducedMotion: false })).toBe(true);
    expect(isStackedWorlds({ width: 1280, height: 599, reducedMotion: false })).toBe(true);
    expect(isStackedWorlds({ width: 1870, height: 1000, reducedMotion: true })).toBe(true);
    expect(isStackedWorlds({ width: 390, height: 844, reducedMotion: false })).toBe(true);
  });

  it("jumps to the track's ends for the first and last world and mid-hold between", () => {
    expect([0, 1, 2, 3].map(steadyProgress).map((p) => +p.toFixed(9))).toEqual([0, 0.36, 0.64, 1]);
  });

  it("jumps to the steady scroll position of each world", () => {
    for (const i of [0, 1, 2, 3]) {
      const y = worldScrollTarget(i, 2000, 4200, 1000);
      const { i0, t } = worldsProgress(2000 - y, 4200, 1000);
      expect(i0).toBe(i);
      expect(t).toBe(0);
    }
  });

  it.each([
    [800, 2400],
    [1000, 3000],
  ])("keeps every jump and the progress steady on a 300svh track (vh %i)", (vh, track) => {
    // 300svh = 3 viewports, so 2 viewports of travel split into three steps.
    const travel = track - vh;
    expect(travel).toBe(2 * vh);
    for (const i of [0, 1, 2, 3]) {
      const y = worldScrollTarget(i, 5000, track, vh);
      expect(y).toBeCloseTo(5000 + steadyProgress(i) * travel + 1);
      const { i0, t, p } = worldsProgress(5000 - y, track, vh);
      expect(i0).toBe(i);
      expect(t).toBe(0);
      expect(p).toBeCloseTo(Math.min(1, steadyProgress(i) + 1 / travel), 6);
    }
    // Halfway along the track the middle crossfade is at its middle.
    expect(worldsProgress(-travel / 2, track, vh).t).toBeCloseTo(0.5);
    // The first and last worlds each stay steady over 14% of the travel (28svh of scrolling).
    expect(WORLD_HOLDS[0] * travel).toBeCloseTo(0.28 * vh, 6);
  });
});

describe("worlds section styles and short names", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

  it("pins a 300svh track with a 100svh sticky stage only where the pin query matches", () => {
    const start = css.indexOf(`@media ${WORLDS_PIN_QUERY} {`);
    expect(start).toBeGreaterThan(-1);
    expect(css.slice(start, start + 260)).toContain(
      ".home-worlds-pin { display: block; position: relative; height: 300svh; }",
    );
    expect(css).not.toContain("420svh");
    expect(css).toContain(".home-worlds-stage { position: sticky; top: 0; height: 100svh;");
  });

  // Stage 6: the short names became the sticky collection tab bar (.collection-tab). The old
  // underline names (--names-base, .home-worlds-name) are gone; these keep the same intent.
  it("keeps the short names on one row of touch-sized tabs that scrolls instead of wrapping", () => {
    expect(css).not.toContain("--names-base");
    expect(css).not.toContain(".home-worlds-name");
    const list = css.match(/\.collection-tabs-list \{([^}]*)\}/)![1]!;
    expect(list).toContain("display: flex;");
    expect(list).toContain("overflow-x: auto;");
    expect(list).not.toContain("flex-wrap: wrap");
    const tab = css.match(/\.collection-tab \{([^}]*)\}/)![1]!;
    expect(tab).toContain("min-height: 44px;");
    expect(tab).toContain("white-space: nowrap;");
    expect(tab).toContain("flex: none;");
  });

  it("marks the current tab with a cream pill and keeps hover inside a hover media query", () => {
    expect(css).toContain(
      ".collection-tab[data-current] { box-shadow: none; color: var(--navy); }",
    );
    expect(css).toContain(
      ".collection-tabs-list:not([data-indicator]) .collection-tab[data-current] { background-color: var(--interaction-cream); }",
    );
    expect(css).toMatch(/\.slide-indicator \{[^}]*background-color: var\(--interaction-cream\);/);
    const hover = css.indexOf(
      "@media (hover: hover) and (pointer: fine) { .collection-tab:not([data-current]):hover",
    );
    expect(hover).toBeGreaterThan(-1);
    // No hover rule for the tabs lives outside a hover media query.
    const outside = css.replace(/@media \(hover: hover\)[^{]*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, "");
    expect(outside).not.toMatch(/\.collection-tab[^{]*:hover/);
  });

  it("has a BG and EN short name for every collection", () => {
    const collections = getAiCollections();
    expect(collections.map((c) => c.shortTitle.bg)).toEqual([
      "Исторически",
      "Професии",
      "Кино",
      "По света",
    ]);
    expect(collections.map((c) => c.shortTitle.en)).toEqual([
      "Historical",
      "Professions",
      "Cinema",
      "Around the world",
    ]);
  });
});
