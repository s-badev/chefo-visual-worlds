import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getCollectionForWork,
  getCollectionWorkSlugs,
  getAiCollections,
} from "@/content/ai-collections";
import {
  PHASE3_CINEMA_SLUGS,
  PHASE3_PROFESSION_SLUGS,
  PHASE3_WORLD_SLUGS,
  phase3Works,
} from "@/content/ai-phase3-works";
import { aiWorks, getAiWork } from "@/content/ai-works";
import { Route as BgWorkRoute } from "@/routes/ai-worlds.$slug";
import { Route as EnWorkRoute } from "@/routes/en.ai-worlds.$slug";

const expected = [
  {
    slug: "chefo-beach-corn-vendor",
    collection: "professions-roles",
    source: "src/assets/ai-professions/chefo-beach-corn-vendor.png",
    hash: "25db5ab9a13b2bf653165a1d641a8bde5270066296d6888b1e0e23ec2362bf97",
    bg: "Майсторът на царевицата",
    en: "The Corn Vendor",
  },
  {
    slug: "chefo-painter-at-work",
    collection: "professions-roles",
    source: "src/assets/ai-professions/chefo-painter-at-work.png",
    hash: "d958f223f23c5e5572ad321fbf758e2f1051e8aecda1fc395fc82d8ea7d07e58",
    bg: "Бояджия с характер",
    en: "The Painter's Touch",
  },
  {
    slug: "chefo-rainy-new-york",
    collection: "chefo-around-the-world",
    source: "src/assets/chefo-rainy-new-york.png",
    hash: "ccd230ec7b3bbd31ac38d5ead49d94e122178ff8aefb121596348637894f327d",
    bg: "Ню Йорк след дъжда",
    en: "New York After the Rain",
  },
  {
    slug: "chefo-sydney-harbour-sunset",
    collection: "chefo-around-the-world",
    source: "src/assets/chefo-sydney-harbour-sunset.png",
    hash: "4fee383f03d26f66df5685c5e5d05ffd43d11c0eb8dc525fd894bcf4cacefe6f",
    bg: "Залез над Сидни",
    en: "Sydney at Sunset",
  },
  {
    slug: "chefo-coastal-adventure",
    collection: "chefo-around-the-world",
    source: "src/assets/chefo-coastal-adventure.png",
    hash: "00248f3bfab12b650371a1dbc490a4ffb610582189a122ae68d084df880f853a",
    bg: "Последните лъчи",
    en: "The Last Light",
  },
  {
    slug: "chefo-rice-terraces-morning",
    collection: "chefo-around-the-world",
    source: "src/assets/chefo-rice-terraces-morning.png",
    hash: "d13b76c6d6a95b7a4de150fc130e4725c7136d191c8ebd94db977f60f34beff4",
    bg: "Утро сред оризовите тераси",
    en: "Morning Among the Rice Terraces",
  },
  {
    slug: "eye-of-the-storm",
    collection: "cinema-archetypes",
    source: "src/assets/ai-cinema-archetypes/eye-of-the-storm.png",
    hash: "d77bf59d4c55cc2ec6ba6dfcd776fbae9d6673ff09310b36927fc371cef786fd",
    bg: "В окото на бурята",
    en: "Eye of the Storm",
  },
] as const;

const readPngDimensions = (bytes: Buffer) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
});

const readWebpDimensions = (bytes: Buffer) => {
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
  expect(bytes.subarray(12, 16).toString("ascii")).toBe("VP8X");
  return {
    width: 1 + bytes.readUIntLE(24, 3),
    height: 1 + bytes.readUIntLE(27, 3),
  };
};

describe("Phase 3 seven-artwork integration", () => {
  it("registers exactly the seven approved identities once", () => {
    expect(phase3Works).toHaveLength(7);
    expect(phase3Works.map((work) => work.slug)).toEqual(expected.map((work) => work.slug));
    expect(PHASE3_PROFESSION_SLUGS).toEqual(expected.slice(0, 2).map((work) => work.slug));
    expect(PHASE3_WORLD_SLUGS).toEqual(expected.slice(2, 6).map((work) => work.slug));
    expect(PHASE3_CINEMA_SLUGS).toEqual([expected[6].slug]);
    expect(new Set(aiWorks.map((work) => work.slug)).size).toBe(aiWorks.length);
    expect(aiWorks.filter((work) => !phase3Works.includes(work))).toHaveLength(57);
    expect(aiWorks).toHaveLength(64);
  });

  it("assigns every work to the intended existing collection and derives the new counts", () => {
    for (const work of expected) {
      expect(getCollectionForWork(work.slug)?.slug).toBe(work.collection);
    }
    expect(
      getAiCollections().map((collection) => getCollectionWorkSlugs(collection).length),
    ).toEqual([16, 16, 16, 16]);
  });

  it("preserves every renamed PNG byte-for-byte and serves a native-size WebP", () => {
    for (const item of expected) {
      const work = getAiWork(item.slug)!;
      expect(work.sourceAsset).toBe(item.source);
      const pngPath = join(process.cwd(), item.source);
      const webpPath = pngPath.replace(/\.png$/i, ".webp");
      expect(existsSync(pngPath), `${item.slug}: PNG`).toBe(true);
      expect(existsSync(webpPath), `${item.slug}: WebP`).toBe(true);

      const png = readFileSync(pngPath);
      const webp = readFileSync(webpPath);
      expect(createHash("sha256").update(png).digest("hex")).toBe(item.hash);
      expect(readPngDimensions(png)).toEqual({ width: 1122, height: 1402 });
      expect(readWebpDimensions(webp)).toEqual({ width: 1122, height: 1402 });
      expect(webp.byteLength).toBeLessThan(png.byteLength);
      expect(work.image).toContain(basename(webpPath));
      expect(work.width).toBe(1122);
      expect(work.height).toBe(1402);
    }
  });

  it("provides complete bilingual metadata without invented tool or date attribution", () => {
    for (const item of expected) {
      const work = getAiWork(item.slug)!;
      expect(work.title).toBe(item.bg);
      expect(work.en?.title).toBe(item.en);
      expect(work.alt.trim()).not.toBe("");
      expect(work.description.trim()).not.toBe("");
      expect(work.en?.alt?.trim()).not.toBe("");
      expect(work.en?.description?.trim()).not.toBe("");
      expect(work.prompt.length).toBeGreaterThan(300);
      expect(work.promptKind).toBe("illustrative");
      expect(work.tool).toBeUndefined();
      expect(work.date).toBeUndefined();
    }
  });

  it("does not duplicate any of the seven source or delivery images", () => {
    expect(new Set(phase3Works.map((work) => work.sourceAsset)).size).toBe(7);
    expect(new Set(phase3Works.map((work) => work.image)).size).toBe(7);
    for (const work of phase3Works) {
      expect(aiWorks.filter((candidate) => candidate.image === work.image)).toHaveLength(1);
      expect(
        aiWorks.filter((candidate) => candidate.sourceAsset === work.sourceAsset),
      ).toHaveLength(1);
    }
  });

  it("resolves every new BG and EN detail route", () => {
    for (const item of expected) {
      for (const route of [BgWorkRoute, EnWorkRoute]) {
        const loader = route.options.loader as (context: { params: { slug: string } }) => {
          work?: { slug: string };
          destination?: { slug: string };
        };
        const data = loader({ params: { slug: item.slug } });
        expect(data.work?.slug ?? data.destination?.slug).toBe(item.slug);
      }
    }
  });

  it("preserves representative existing artwork identities", () => {
    for (const slug of [
      "chefo-srednovekoven-ritsar",
      "chefo-barber",
      "rainy-neon-noir",
      "chefo-v-sauditska-arabiya",
    ]) {
      expect(getAiWork(slug)?.slug).toBe(slug);
    }
  });
});
