import { describe, expect, it } from "vitest";
import {
  addStamp,
  EMPTY_PASSPORT,
  POSITIONS,
  stampRotation,
  stampSpot,
  type PassportState,
} from "@/lib/album-passport";

describe("album passport pure state", () => {
  it("starts empty and never mutates the previous state", () => {
    const initial: PassportState = new Set();
    expect(EMPTY_PASSPORT.size).toBe(0);
    expect(initial.size).toBe(0);

    const first = addStamp(initial, "sofia");
    expect(first.isNew).toBe(true);
    expect(first.state.has("sofia")).toBe(true);
    expect(first.state.size).toBe(1);
    expect(initial.size).toBe(0);
    expect(first.state).not.toBe(initial);
  });

  it("is idempotent when stamping an already visited album", () => {
    const first = addStamp(EMPTY_PASSPORT, "sofia");
    const second = addStamp(first.state, "sofia");

    expect(second.isNew).toBe(false);
    expect(second.state).toBe(first.state);
    expect(second.state.size).toBe(1);
  });

  it("accepts stamps in any arbitrary order", () => {
    const order = ["rila", "bodrum", "sofia", "istanbul", "paris"];
    let state = EMPTY_PASSPORT;

    for (const slug of order) {
      const result = addStamp(state, slug);
      expect(result.isNew).toBe(true);
      state = result.state;
    }

    expect([...state]).toEqual(order);
    expect(addStamp(state, "bodrum").isNew).toBe(false);
  });

  it("computes deterministic spread positions and rotations, wrapping modularly past 13", () => {
    expect(POSITIONS).toHaveLength(13);
    expect(stampSpot(0, 13)).toEqual([15, 24]);
    expect(stampSpot(1, 13)).toEqual([39, 74]);
    expect(stampSpot(2, 13)).toEqual([86, 42]);
    expect(stampSpot(13, 15)).toEqual(stampSpot(0, 13));
    expect(stampSpot(14, 15)).toEqual(stampSpot(1, 13));

    expect(stampRotation(0)).toBe(-16);
    expect(stampRotation(1)).toBe(-11);
    for (let i = 0; i < 20; i++) {
      expect(stampRotation(i)).toBeGreaterThanOrEqual(-16);
      expect(stampRotation(i)).toBeLessThanOrEqual(15);
    }
  });
});
