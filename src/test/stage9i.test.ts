import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { siteConfig } from "@/content/site-config";

function webpSize(file: string) {
  const bytes = readFileSync(file);
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunk = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    expect(offset + 8 + size).toBeLessThanOrEqual(bytes.length);
    if (chunk === "VP8 ") {
      expect(bytes.subarray(offset + 11, offset + 14)).toEqual(Buffer.from([0x9d, 0x01, 0x2a]));
      return [bytes.readUInt16LE(offset + 14) & 0x3fff, bytes.readUInt16LE(offset + 16) & 0x3fff];
    }
    if (chunk === "VP8L") {
      expect(bytes[offset + 8]).toBe(0x2f);
      const dimensions = bytes.readUInt32LE(offset + 9);
      return [(dimensions & 0x3fff) + 1, ((dimensions >>> 14) & 0x3fff) + 1];
    }
    if (chunk === "VP8X") {
      return [bytes.readUIntLE(offset + 12, 3) + 1, bytes.readUIntLE(offset + 15, 3) + 1];
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`Missing WebP dimensions: ${file}`);
}

describe("stage 9i/9j file-aligned portrait contract", () => {
  it("uses an original-photo crop and retains the untouched real source", () => {
    expect(siteConfig.portrait.real).toContain("about-real-framed.webp");
    expect(siteConfig.portrait.ai).toContain("about-ai-wide.webp");
    expect(
      createHash("sha256").update(readFileSync("src/assets/about-real.webp")).digest("hex"),
    ).toBe("348a470871fde75c52efc45921267e1d2b03d7814978986fba419cf39cfb6e66");
  });

  it("fills the 4:5 frame with equal canvases and enough output pixels for DPR 2", () => {
    const real = webpSize("src/assets/about-real-framed.webp");
    const ai = webpSize("src/assets/about-ai-wide.webp");
    expect(real).toEqual([1080, 1350]);
    expect(ai).toEqual(real);
    expect(real[0]! / real[1]!).toBe(4 / 5);
    expect(real[0]!).toBeGreaterThanOrEqual(2 * 452);
  });

  it("keeps both high-quality web portraits within the approved byte budget", () => {
    const sizes = ["about-real-framed.webp", "about-ai-wide.webp"].map(
      (name) => readFileSync(`src/assets/${name}`).length,
    );
    for (const size of sizes) expect(size).toBeLessThanOrEqual(250_000);
    expect(sizes[0]! + sizes[1]!).toBeLessThanOrEqual(500_000);
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
