import { describe, expect, it } from "vitest";
import { clamp01, heroProgress, smoothstep } from "@/lib/motion";

describe("hero progress", () => {
  const pinned = { wrapperHeight: 1400, heroHeight: 800, pinned: true, reducedMotion: false };

  it("is 0 at the top and 1 once the 70svh pin track is scrolled", () => {
    expect(heroProgress({ ...pinned, wrapperTop: 0 })).toBe(0);
    expect(heroProgress({ ...pinned, wrapperTop: -600 })).toBe(1);
  });

  it("eases the middle with smoothstep and clamps both ends", () => {
    expect(heroProgress({ ...pinned, wrapperTop: -300 })).toBeCloseTo(0.5);
    expect(heroProgress({ ...pinned, wrapperTop: -150 })).toBeCloseTo(smoothstep(0.25));
    expect(heroProgress({ ...pinned, wrapperTop: 200 })).toBe(0);
    expect(heroProgress({ ...pinned, wrapperTop: -5000 })).toBe(1);
  });

  it("uses 45% of the hero height when the hero is not pinned (phones)", () => {
    const phone = { wrapperHeight: 1200, heroHeight: 1200, pinned: false, reducedMotion: false };
    expect(heroProgress({ ...phone, wrapperTop: -270 })).toBeCloseTo(0.5);
    expect(heroProgress({ ...phone, wrapperTop: -540 })).toBe(1);
  });

  it("never divides by zero", () => {
    expect(heroProgress({ ...pinned, wrapperHeight: 800, wrapperTop: -10 })).toBe(1);
    const empty = { wrapperHeight: 0, heroHeight: 0, pinned: false, reducedMotion: false };
    expect(Number.isFinite(heroProgress({ ...empty, wrapperTop: 0 }))).toBe(true);
  });

  it("stays 0 with reduced motion", () => {
    expect(heroProgress({ ...pinned, wrapperTop: -600, reducedMotion: true })).toBe(0);
  });

  it("clamps non-finite input", () => {
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
  });
});
