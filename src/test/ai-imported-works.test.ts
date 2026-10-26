import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAiCollection,
  getCollectionForWork,
  getCollectionWorkSlugs,
} from "@/content/ai-collections";
import {
  IMPORTED_CINEMA_SLUGS,
  IMPORTED_HISTORICAL_SLUGS,
  importedAiWorks,
  importedCinemaWorks,
  importedHistoricalWorks,
} from "@/content/ai-imported-works";
import { getAiWork } from "@/content/ai-works";
import { Route as BgWorkRoute } from "@/routes/ai-worlds.$slug";
import { Route as EnWorkRoute } from "@/routes/en.ai-worlds.$slug";

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

describe("Phase 2 AI artwork integration", () => {
  it("registers exactly fourteen unique works in each target collection", () => {
    expect(importedHistoricalWorks).toHaveLength(14);
    expect(importedCinemaWorks).toHaveLength(14);
    expect(importedAiWorks).toHaveLength(28);
    expect(new Set(importedAiWorks.map((work) => work.slug)).size).toBe(28);
    expect(IMPORTED_HISTORICAL_SLUGS).toEqual(importedHistoricalWorks.map((work) => work.slug));
    expect(IMPORTED_CINEMA_SLUGS).toEqual(importedCinemaWorks.map((work) => work.slug));

    const historical = getAiCollection("historical-eras-rulers")!;
    const cinema = getAiCollection("cinema-archetypes")!;
    expect(getCollectionWorkSlugs(historical)).toHaveLength(16);
    expect(getCollectionWorkSlugs(cinema)).toHaveLength(16);
    expect(historical.coverWorkSlug).toBe("chefo-srednovekoven-ritsar");
    expect(cinema.coverWorkSlug).toBe("chefo-v-badeshteto");

    for (const work of importedHistoricalWorks) {
      expect(getCollectionForWork(work.slug)?.slug).toBe("historical-eras-rulers");
    }
    for (const work of importedCinemaWorks) {
      expect(getCollectionForWork(work.slug)?.slug).toBe("cinema-archetypes");
    }
  });

  it("keeps every PNG source and serves a same-size optimized WebP", () => {
    for (const work of importedAiWorks) {
      expect(work.sourceAsset).toBeTruthy();
      const pngPath = join(process.cwd(), work.sourceAsset!);
      const webpPath = pngPath.replace(/\.png$/i, ".webp");
      expect(existsSync(pngPath), `${work.slug}: PNG source`).toBe(true);
      expect(existsSync(webpPath), `${work.slug}: WebP derivative`).toBe(true);

      const png = readFileSync(pngPath);
      const webp = readFileSync(webpPath);
      expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(readPngDimensions(png)).toEqual({ width: work.width, height: work.height });
      expect(readWebpDimensions(webp)).toEqual({ width: work.width, height: work.height });
      expect(work.image).toContain(basename(webpPath));
      expect(webp.byteLength).toBeLessThan(png.byteLength);
      expect(createHash("sha256").update(png).digest("hex")).toHaveLength(64);
    }
  });

  it("provides complete bilingual metadata and transparent reconstruction prompts", () => {
    expect(new Set(importedAiWorks.map((work) => work.prompt)).size).toBe(28);
    for (const work of importedAiWorks) {
      expect(work.title.trim(), `${work.slug}: BG title`).not.toBe("");
      expect(work.description.trim(), `${work.slug}: BG description`).not.toBe("");
      expect(work.alt.trim(), `${work.slug}: BG alt`).not.toBe("");
      expect(work.en?.title?.trim(), `${work.slug}: EN title`).not.toBe("");
      expect(work.en?.description?.trim(), `${work.slug}: EN description`).not.toBe("");
      expect(work.en?.alt?.trim(), `${work.slug}: EN alt`).not.toBe("");
      expect(work.prompt.length, work.slug).toBeGreaterThan(300);
      expect(work.prompt, work.slug).toMatch(/uploaded reference photograph/i);
      expect(work.prompt, work.slug).toMatch(/facial identity/i);
      expect(work.promptKind).toBe("illustrative");
      expect(work.tool).toBe(
        ["nubian-king-and-returning-army", "rainy-neon-noir", "captain-against-the-storm"].includes(
          work.slug,
        )
          ? "Gemini Nano Banana"
          : undefined,
      );
      expect(work.date).toBeUndefined();
    }
  });

  it("keeps the two owner-approved artwork titles and generation attribution exact", () => {
    const nubian = getAiWork("nubian-king-and-returning-army")!;
    expect(nubian.title).toBe("Нубийски цар");
    expect(nubian.en?.title).toBe("Nubian King");
    expect(nubian.tool).toBe("Gemini Nano Banana");

    const witness = getAiWork("rainy-neon-noir")!;
    expect(witness.title).toBe("Последният свидетел");
    expect(witness.en?.title).toBe("The Last Witness");
    expect(witness.tool).toBe("Gemini Nano Banana");
    expect(witness.image).toContain("rainy-neon-noir.webp");
  });

  it("keeps the two corrected Cinema metadata records exact and route-stable", () => {
    const sofia = getAiWork("survivor-among-sofia-ruins")!;
    expect(sofia.title).toBe("Оцелял сред руините на София");
    expect(sofia.en?.title).toBe("Survivor Among the Ruins of Sofia");
    expect(sofia.description).toBe(
      "Самотен оцелял прекосява опустяла София сред разрушени сгради, изоставени автомобили и следите от един рухнал свят.",
    );
    expect(sofia.en?.description).toBe(
      "A lone survivor crosses a deserted Sofia, surrounded by ruined buildings, abandoned vehicles, and the remains of a fallen world.",
    );
    expect(
      `${sofia.description} ${sofia.en?.description} ${sofia.alt} ${sofia.en?.alt} ${sofia.prompt}`,
    ).not.toMatch(/НДК|National Palace of Culture/i);
    expect(sofia.image).toContain("survivor-among-sofia-ruins.webp");

    const hunter = getAiWork("postapocalyptic-hunter-vs-mechs")!;
    expect(hunter.title).toBe("Ловец срещу машините");
    expect(hunter.en?.title).toBe("Hunter vs. the Machines");
    expect(hunter.description).toBe(
      "Сред горящите руини ловец се изправя срещу гигантски бойни машини, чиито червени светлини прорязват дима.",
    );
    expect(hunter.en?.description).toBe(
      "Amid burning ruins, a hunter faces towering war machines, their red lights cutting through the smoke.",
    );
    expect(hunter.image).toContain("postapocalyptic-hunter-vs-mechs.webp");
    expect(importedAiWorks).toHaveLength(28);
  });

  it("resolves every imported artwork through the existing BG and EN detail routes", () => {
    for (const work of importedAiWorks) {
      expect(getAiWork(work.slug)).toBe(work);
      for (const route of [BgWorkRoute, EnWorkRoute]) {
        const loader = route.options.loader as (context: { params: { slug: string } }) => {
          work?: { slug: string };
        };
        expect(loader({ params: { slug: work.slug } }).work?.slug).toBe(work.slug);
      }
    }
  });
});
