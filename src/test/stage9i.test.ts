import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/content/site-config";

function losslessWebpSize(file: string) {
  const bytes = readFileSync(file);
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  expect(bytes.toString("ascii", 12, 16)).toBe("VP8L");
  expect(bytes[20]).toBe(0x2f);
  const dimensions = bytes.readUInt32LE(21);
  return [(dimensions & 0x3fff) + 1, ((dimensions >>> 14) & 0x3fff) + 1];
}

describe("stage 9i native close-up portrait files", () => {
  it("uses a new real crop while retaining the original photograph", () => {
    expect(siteConfig.portrait.real).toContain("about-real-close.webp");
    expect(siteConfig.portrait.ai).toContain("about-ai.webp");
    expect(readFileSync("src/assets/about-real.webp").length).toBeGreaterThan(0);
  });

  it("fills the 4:5 frame with equal canvases and enough output pixels for DPR 2", () => {
    const real = losslessWebpSize("src/assets/about-real-close.webp");
    const ai = losslessWebpSize("src/assets/about-ai.webp");
    expect(real).toEqual([912, 1140]);
    expect(ai).toEqual(real);
    expect(real[0]! / real[1]!).toBe(4 / 5);
    expect(real[0]!).toBeGreaterThanOrEqual(2 * 452);
  });

  it("keeps neutral alignment and the same centered position for both pictures", () => {
    const css = readFileSync("src/styles.css", "utf8");
    for (const [name, value] of [
      ["scale", "1"],
      ["x", "0%"],
      ["y", "0%"],
    ]) {
      const values = [...css.matchAll(new RegExp(`--about-ai-${name}:\\s*([^;]+);`, "g"))];
      expect(values.at(-1)?.[1]).toBe(value);
    }
    expect(css.split("/* Stage 9i:")[1]).toContain("object-position: 50% 50%;");
    expect(css).not.toMatch(/transform:\s*translate\(var\(--about-ai-x\)/);
  });
});
