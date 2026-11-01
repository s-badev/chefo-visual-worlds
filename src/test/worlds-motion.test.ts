import { describe, expect, it } from "vitest";
import { getAiCollections, getCollectionWorkSlugs } from "@/content/ai-collections";
import { WORLD_PORTRAITS, getWorldPortraits } from "@/content/home-worlds";
import {
  computeFaceLayout,
  crossBlur,
  exposedIndex,
  faceAnchor,
  isStackedWorlds,
  layerOpacities,
  progressAt,
  textStates,
  viewfinderRect,
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

  it("centres the viewfinder on the anchor", () => {
    const box = { width: 540, height: 720 };
    const { ax, ay, D } = faceAnchor(box);
    const v = viewfinderRect(box);
    expect(v.left + v.width / 2).toBeCloseTo(ax);
    expect(v.width).toBeCloseTo(D * 2.9);
    expect(v.height).toBeCloseTo(D * 3.7);
    expect(v.top).toBeCloseTo(ay - v.height * 0.36);
  });
});

describe("worlds progress", () => {
  it("maps the scroll track to p, f, i0, i1 and t", () => {
    // Track 4200, viewport 1000: 3200 px of travel.
    expect(worldsProgress(0, 4200, 1000)).toMatchObject({ p: 0, f: 0, i0: 0, i1: 1, t: 0 });
    expect(worldsProgress(-1600, 4200, 1000)).toMatchObject({ p: 0.5, f: 1.5, i0: 1, i1: 2 });
    expect(worldsProgress(-1600, 4200, 1000).t).toBeCloseTo(0.5);
    expect(worldsProgress(-3200, 4200, 1000)).toMatchObject({ p: 1, f: 3, i0: 3, i1: 3, t: 0 });
    expect(worldsProgress(500, 4200, 1000).p).toBe(0);
    expect(worldsProgress(-9999, 4200, 1000).p).toBe(1);
  });

  it("holds each world before and after the crossfade window", () => {
    expect(progressAt(0.2).t).toBe(0);
    expect(progressAt(0.22).t).toBe(0);
    expect(progressAt(0.78).t).toBeCloseTo(1);
    expect(progressAt(0.9).t).toBe(1);
    expect(progressAt(0.5).t).toBeCloseTo(0.5);
    expect(progressAt(2.99).i0).toBe(2);
  });
});

const SAMPLES = Array.from({ length: 301 }, (_, k) => (k / 300) * 3);

describe("layer invariants", () => {
  it.each(SAMPLES.filter((_, k) => k % 10 === 0))("keeps one opaque portrait at f = %f", (f) => {
    const { i0, t } = progressAt(f);
    const opacities = layerOpacities(i0, t);
    expect(Math.max(...opacities)).toBe(1);
  });

  it("never leaves the stage without an opaque layer at any sampled f", () => {
    for (const f of SAMPLES) {
      const { i0, t } = progressAt(f);
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
  it("overlaps the two titles slightly halfway, never both empty", () => {
    const s = textStates(0, 0.5);
    expect(s[0]!.opacity).toBeGreaterThan(0.1);
    expect(s[1]!.opacity).toBeGreaterThan(0.1);
    expect(s[0]!.opacity).toBeCloseTo(1 / 6);
    expect(s[1]!.opacity).toBeCloseTo(1 / 6);
    for (const f of SAMPLES) {
      const { i0, t } = progressAt(f);
      expect(Math.max(...textStates(i0, t).map((x) => x.opacity))).toBeGreaterThan(0.1);
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

  it("jumps to the steady scroll position of each world", () => {
    for (const i of [0, 1, 2, 3]) {
      const y = worldScrollTarget(i, 2000, 4200, 1000);
      const { i0, t } = worldsProgress(2000 - y, 4200, 1000);
      expect(i0).toBe(i);
      expect(t).toBe(0);
    }
  });
});
