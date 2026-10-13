import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aiWorks, getAiWork } from "@/content/ai-works";

const portraits = [
  ["chefo-v-sauditska-arabiya", "chefo-saudi-arabia.png"],
  ["chefo-v-gartsiya", "chefo-greece.png"],
  ["chefo-v-kuba", "chefo-cuba.png"],
  ["chefo-v-braziliya", "chefo-brazil.png"],
  ["chefo-v-grenlandiya", "chefo-greenland.png"],
  ["chefo-v-rusiya", "chefo-russia.png"],
  ["chefo-v-italiya", "chefo-italy.png"],
  ["chefo-vav-frantsiya", "chefo-france.png"],
  ["chefo-v-indiya", "chefo-india.png"],
  ["chefo-v-turtsiya", "chefo-turkey.png"],
  ["chefo-v-egipet", "chefo-egypt.png"],
  ["chefo-v-dubai", "chefo-dubai.png"],
] as const;

describe("Around the World image replacements", () => {
  it("maps every published destination to its new PNG with exact intrinsic dimensions", () => {
    for (const [slug, filename] of portraits) {
      const work = getAiWork(slug)!;
      const bytes = readFileSync(join(process.cwd(), "src", "assets", filename));
      expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(work.image).toContain(filename);
      expect(work.width).toBe(bytes.readUInt32BE(16));
      expect(work.height).toBe(bytes.readUInt32BE(20));
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
    expect(aiWorks).toHaveLength(29);
    expect(new Set(aiWorks.map((work) => work.slug)).size).toBe(aiWorks.length);
    expect(new Set(aiWorks.map((work) => work.prompt)).size).toBe(aiWorks.length);
    for (const work of aiWorks) {
      expect(work.prompt.length, work.slug).toBeGreaterThan(300);
      expect(work.prompt, work.slug).toMatch(/uploaded reference photograph/i);
      expect(work.prompt, work.slug).toMatch(/facial identity/i);
      expect(work.prompt, work.slug).not.toMatch(/\bChefo\b/i);
      expect(work.prompt, work.slug).not.toMatch(/\b(?:short dark hair|trimmed beard|light stubble|dark moustache|neat beard)\b/i);
      expect(work.promptKind, work.slug).toBe("illustrative");
    }
  });
});
