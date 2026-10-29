import { describe, expect, it } from "vitest";
import { getAiCollection, getCollectionWorkSlugs } from "@/content/ai-collections";
import { getAiWork } from "@/content/ai-works";
import { Route as BgWorkRoute } from "@/routes/ai-worlds.$slug";
import { Route as EnWorkRoute } from "@/routes/en.ai-worlds.$slug";

const expectedTitles = {
  "historical-eras-rulers": [
    ["Крал на лъва", "The Lion King"],
    ["Римски император", "Roman Emperor"],
    ["Италиански ренесансов благородник", "Italian Renaissance Nobleman"],
    ["Нубийски цар", "Nubian King"],
    ["Средновековен български цар", "Medieval Bulgarian Tsar"],
    ["Келтски военачалник", "Celtic Warlord"],
    ["Норвежки вожд", "Norwegian Chieftain"],
    ["Римски пълководец", "Roman Commander"],
    ["Руски княз", "Russian Prince"],
    ["Финикийски владетел", "Phoenician Ruler"],
    ["Български войвода", "Bulgarian Voivode"],
    ["Тракийски владетел", "Thracian Ruler"],
    ["Самурай на последна стража", "Samurai on the Last Watch"],
    ["Владетелят на планинската крепост", "Ruler of the Mountain Fortress"],
    ["Спартански воин", "Spartan Warrior"],
    ["Рицарят на последната стена", "Knight of the Last Wall"],
  ],
  "cinema-archetypes": [
    ["Червената планета", "The Red Planet"],
    ["Последният свидетел", "The Last Witness"],
    ["Последният изход", "The Last Way Out"],
    ["Картографът на времето", "The Cartographer of Time"],
    ["Последният покрив", "The Last Rooftop"],
    ["Книгата на забравените имена", "The Book of Forgotten Names"],
    ["Под сянката на колосите", "In the Shadow of Giants"],
    ["Територия на хищника", "Predator Territory"],
    ["Капитанът срещу бурята", "Captain Against the Storm"],
    ["Леденият предел", "The Frozen Edge"],
    ["Оцелял сред руините на София", "Survivor Among the Ruins of Sofia"],
    ["Храмът без име", "The Nameless Temple"],
    ["Ловец срещу машините", "Hunter vs. the Machines"],
    ["Секунди до взрива", "Seconds Before the Blast"],
    ["Последният щурм", "The Final Assault"],
    ["В окото на бурята", "Eye of the Storm"],
  ],
} as const;

const collectionSlugs = Object.keys(expectedTitles) as (keyof typeof expectedTitles)[];

describe("AI Worlds editorial metadata", () => {
  it("keeps all 32 approved bilingual titles in exhibition order", () => {
    const actualTitles: string[] = [];
    for (const collectionSlug of collectionSlugs) {
      const collection = getAiCollection(collectionSlug)!;
      const works = getCollectionWorkSlugs(collection).map((slug) => getAiWork(slug)!);
      expect(works.map((work) => [work.title, work.en?.title])).toEqual(
        expectedTitles[collectionSlug],
      );
      actualTitles.push(...works.flatMap((work) => [work.title, work.en?.title ?? ""]));
    }
    expect(actualTitles).toHaveLength(64);
    expect(new Set(actualTitles).size).toBe(64);
  });

  it("uses distinct bilingual micro-stories without unsupported landmark names", () => {
    const works = collectionSlugs.flatMap((collectionSlug) =>
      getCollectionWorkSlugs(getAiCollection(collectionSlug)!).map((slug) => getAiWork(slug)!),
    );
    expect(works).toHaveLength(32);
    expect(new Set(works.map((work) => work.description)).size).toBe(32);
    expect(new Set(works.map((work) => work.en?.description)).size).toBe(32);

    for (const work of works) {
      for (const description of [work.description, work.en?.description ?? ""]) {
        const words = description.trim().split(/\s+/);
        expect(words.length, `${work.slug}: description length`).toBeGreaterThanOrEqual(12);
        expect(words.length, `${work.slug}: description length`).toBeLessThanOrEqual(40);
        expect(description, work.slug).not.toMatch(
          /^(На изображението|Портретът показва|The image shows|The portrait shows)/i,
        );
      }
    }

    const sofia = getAiWork("survivor-among-sofia-ruins")!;
    expect(
      [sofia.title, sofia.en?.title, sofia.description, sofia.en?.description, sofia.prompt].join(
        " ",
      ),
    ).not.toMatch(/НДК|National Palace of Culture/i);
  });

  it("keeps the approved fictional Lion King copy exact without changing its identity", () => {
    const work = getAiWork("chefo-srednovekoven-ritsar")!;
    expect(work.title).toBe("Крал на лъва");
    expect(work.en?.title).toBe("The Lion King");
    expect(work.description).toBe(
      "След коронацията кралят остава сам пред решение, което може да запази мира или да поведе кралството към война.",
    );
    expect(work.en?.description).toBe(
      "After the coronation, the king faces a decision that could preserve the peace or lead the realm into war.",
    );
    expect(work.slug).toBe("chefo-srednovekoven-ritsar");
    expect(work.role).toBe("ruler");
    expect(work.era).toBe("medieval");
  });

  it("uses the approved Bulgarian spelling for the voivode without changing its identity", () => {
    const work = getAiWork("enraged-voivode-with-letter")!;
    expect(work.title).toBe("Български войвода");
    expect(work.description).toContain("българският войвода");
    expect(work.alt).toContain("войвода");
    expect([work.title, work.description, work.alt].join(" ")).not.toMatch(/воевод/iu);
    expect(work.en?.title).toBe("Bulgarian Voivode");
    expect(work.slug).toBe("enraged-voivode-with-letter");
    expect(work.image).toContain("enraged-voivode-with-letter");
  });

  it("preserves every BG and EN detail route for the curated works", () => {
    for (const collectionSlug of collectionSlugs) {
      for (const slug of getCollectionWorkSlugs(getAiCollection(collectionSlug)!)) {
        for (const route of [BgWorkRoute, EnWorkRoute]) {
          const loader = route.options.loader as (context: { params: { slug: string } }) => {
            work?: { slug: string };
          };
          expect(loader({ params: { slug } }).work?.slug).toBe(slug);
        }
      }
    }
  });
});
