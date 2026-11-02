import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aiWorks, getAiWork } from "@/content/ai-works";

/** Width and height from a WebP header (lossy VP8, lossless VP8L or extended VP8X). */
function webpSize(bytes: Buffer) {
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
  const chunk = bytes.subarray(12, 16).toString("ascii");
  if (chunk === "VP8 ")
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  expect(chunk).toBe("VP8X");
  return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
}

const portraits = [
  ["chefo-v-sauditska-arabiya", "chefo-saudi-arabia.webp"],
  ["chefo-v-gartsiya", "chefo-greece.webp"],
  ["chefo-v-kuba", "chefo-cuba.webp"],
  ["chefo-v-braziliya", "chefo-brazil.webp"],
  ["chefo-v-grenlandiya", "chefo-greenland.webp"],
  ["chefo-v-rusiya", "chefo-russia.webp"],
  ["chefo-v-italiya", "chefo-italy.webp"],
  ["chefo-vav-frantsiya", "chefo-france.webp"],
  ["chefo-v-indiya", "chefo-india.webp"],
  ["chefo-v-turtsiya", "chefo-turkey.webp"],
  ["chefo-v-egipet", "chefo-egypt.webp"],
  ["chefo-v-dubai", "chefo-dubai.webp"],
] as const;

describe("Around the World image replacements", () => {
  it("maps every published destination to its WebP with exact intrinsic dimensions", () => {
    for (const [slug, filename] of portraits) {
      const work = getAiWork(slug)!;
      const bytes = readFileSync(join(process.cwd(), "src", "assets", filename));
      const size = webpSize(bytes);
      expect(work.image).toContain(filename);
      expect(work.width).toBe(size.width);
      expect(work.height).toBe(size.height);
      expect(work.alt).toBeTruthy();
      expect(work.en?.alt).toBeTruthy();
      expect(work.prompt.length).toBeGreaterThan(300);
    }
    expect(new Set(portraits.map(([slug]) => slug)).size).toBe(12);
    expect(aiWorks.filter((work) => portraits.some(([slug]) => slug === work.slug))).toHaveLength(
      12,
    );
  });
});

describe("published AI artwork prompts", () => {
  it("gives every published image an individual, substantial English prompt", () => {
    expect(aiWorks).toHaveLength(64);
    expect(new Set(aiWorks.map((work) => work.slug)).size).toBe(aiWorks.length);
    expect(new Set(aiWorks.map((work) => work.prompt)).size).toBe(aiWorks.length);
    for (const work of aiWorks) {
      expect(work.prompt.length, work.slug).toBeGreaterThan(300);
      expect(work.prompt, work.slug).toMatch(/uploaded reference photograph/i);
      expect(work.prompt, work.slug).toMatch(/facial identity/i);
      expect(work.prompt, work.slug).not.toMatch(/\bChefo\b/i);
      expect(work.prompt, work.slug).not.toMatch(
        /\b(?:short dark hair|trimmed beard|light stubble|dark moustache|neat beard)\b/i,
      );
      expect(work.promptKind, work.slug).toBe("illustrative");
    }
  });
});
