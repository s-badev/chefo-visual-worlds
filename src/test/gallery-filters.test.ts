import { describe, expect, it } from "vitest";
import { getAiFilterOptions, filterAiWorks, aiWorks } from "@/content/ai-works";
import { futureAiConcepts, getPlannedGalleryConcepts } from "@/content/ai-concepts";
import {
  filterGalleryPhotos,
  getAllGalleryPhotos,
  getPhotoLocations,
} from "@/content/photo-gallery";
import { PHOTO_FILTER_THEMES, PHOTO_THEMES, photoThemeLabel } from "@/content/photos";
import { validatePhotoSearch } from "@/views/photography";

describe("photography filters", () => {
  const items = getAllGalleryPhotos("bg");

  it("shows each existing photo once and derives thirteen destinations from albums", () => {
    expect(items).toHaveLength(426);
    expect(new Set(items.map(({ photo }) => photo.slug)).size).toBe(426);
    for (const slug of [
      "nesebar-vyatarnata-melnitsa",
      "nesebar-hram-pantokrator",
      "nesebar-zlaten-chas",
      "sofia-tramvay-12",
      "slanchev-bryag-zalez",
    ]) {
      expect(items.some(({ photo }) => photo.slug === slug)).toBe(false);
    }
    expect(getPhotoLocations()).toHaveLength(13);
    expect(items.find(({ photo }) => photo.slug === "patyat-na-yug")?.albumSlug).toBeNull();
    expect(PHOTO_THEMES).toEqual(["sea", "city", "sunsets", "nature", "architecture", "travel"]);
  });

  it("applies theme and location together, including accurate empty results", () => {
    const nessebarSunsets = filterGalleryPhotos(items, {
      theme: "sunsets",
      location: "nessebar",
    }).map(({ photo }) => photo.slug);
    expect(nessebarSunsets).toHaveLength(8);
    expect(nessebarSunsets).toContain("nessebar-025");
    expect(
      filterGalleryPhotos(items, { theme: "architecture", location: "sofia" })
        .map(({ photo }) => photo.slug)
        .slice(0, 5),
    ).toEqual(["sofia-001", "sofia-nevski-sinya-chas", "sofia-002", "sofia-005", "sofia-004"]);
    expect(
      filterGalleryPhotos(items, { theme: "nature" }).map(({ photo }) => photo.slug),
    ).toContain("patyat-na-yug");
    expect(
      filterGalleryPhotos(items, { theme: "nature", location: "sofia" }).length,
    ).toBeGreaterThan(0);
    expect(filterGalleryPhotos(items, { location: "sofia" })).toHaveLength(45);
    expect(filterGalleryPhotos(items, { location: "plovdiv" })).toHaveLength(18);
    expect(filterGalleryPhotos(items, { location: "rila" })).toHaveLength(38);
    expect(filterGalleryPhotos(items, { location: "sunny-beach" })).toHaveLength(58);
    expect(filterGalleryPhotos(items, { location: "istanbul" })).toHaveLength(40);
    expect(
      filterGalleryPhotos(items, { theme: "architecture", location: "istanbul" }).length,
    ).toBeGreaterThan(0);
    expect(filterGalleryPhotos(items, { location: "paris" })).toHaveLength(57);
    expect(filterGalleryPhotos(items, { location: "lyon" })).toHaveLength(24);
    expect(filterGalleryPhotos(items, { location: "edirne" })).toHaveLength(21);
    expect(filterGalleryPhotos(items, { location: "burgas" })).toHaveLength(26);
    expect(
      filterGalleryPhotos(items, { theme: "architecture", location: "edirne" }).length,
    ).toBeGreaterThan(0);
    expect(
      filterGalleryPhotos(items, { theme: "architecture", location: "paris" }).length,
    ).toBeGreaterThan(0);
  });
});

describe("photography theme chips", () => {
  const items = getAllGalleryPhotos("bg");

  it("offers five subjects (plus All); travel stays on the photos but is not a chip", () => {
    expect(PHOTO_FILTER_THEMES).toEqual(["sea", "city", "sunsets", "nature", "architecture"]);
    expect(PHOTO_FILTER_THEMES.map((theme) => photoThemeLabel(theme, "bg"))).toEqual([
      "Море",
      "Град",
      "Залези",
      "Природа",
      "Архитектура",
    ]);
    expect(PHOTO_FILTER_THEMES.map((theme) => photoThemeLabel(theme, "en"))).toEqual([
      "Sea",
      "City",
      "Sunsets",
      "Nature",
      "Architecture",
    ]);
    expect(items.filter(({ photo }) => photo.themes.includes("travel"))).toHaveLength(294);
  });

  it("makes every photo reachable from at least one subject chip", () => {
    const unreachable = items.filter(
      ({ photo }) =>
        !photo.themes.some((theme) => (PHOTO_FILTER_THEMES as readonly string[]).includes(theme)),
    );
    expect(unreachable.map(({ photo }) => photo.slug)).toEqual([]);
    // The four photos that used to carry only travel keep it and gained one subject each.
    const themesOf = (slug: string) => items.find(({ photo }) => photo.slug === slug)!.photo.themes;
    expect(themesOf("tunisia-001")).toEqual(["architecture", "travel"]);
    expect(themesOf("tunisia-004")).toEqual(["architecture", "travel"]);
    expect(themesOf("tunisia-010")).toEqual(["nature", "travel"]);
    expect(themesOf("bodrum-016")).toEqual(["sunsets", "travel"]);
  });

  it("counts photos per chip", () => {
    const count = (theme?: (typeof PHOTO_FILTER_THEMES)[number]) =>
      filterGalleryPhotos(items, { theme }).length;
    expect({
      all: count(),
      sea: count("sea"),
      city: count("city"),
      sunsets: count("sunsets"),
      nature: count("nature"),
      architecture: count("architecture"),
    }).toEqual({ all: 426, sea: 173, city: 196, sunsets: 46, nature: 112, architecture: 147 });
  });

  it("ignores an old ?theme=travel (or any unknown theme) and shows every photo", () => {
    expect(validatePhotoSearch({ view: "photos", theme: "travel" })).toEqual({
      view: "photos",
      theme: undefined,
      location: undefined,
    });
    expect(validatePhotoSearch({ theme: "nope", location: "sofia" }).theme).toBeUndefined();
    expect(
      filterGalleryPhotos(items, { theme: validatePhotoSearch({ theme: "travel" }).theme }),
    ).toHaveLength(426);
  });
});

describe("AI taxonomy", () => {
  it("offers filter choices only for existing artworks", () => {
    const options = getAiFilterOptions();
    for (const role of options.roles) expect(aiWorks.some((work) => work.role === role)).toBe(true);
    for (const era of options.eras) expect(aiWorks.some((work) => work.era === era)).toBe(true);
    for (const setting of options.settings)
      expect(aiWorks.some((work) => work.setting === setting)).toBe(true);
    expect(options.categories).not.toContain("Фантастика");
    expect(options.categories).not.toContain("Забавни колажи");
    expect(options.settings).not.toContain("underwater-kingdom");
    expect(options.settings).not.toContain("black-sea-beach");
    expect(options.eras).not.toContain("1960s");
    expect(futureAiConcepts).toHaveLength(10);
    expect(getPlannedGalleryConcepts().map((concept) => concept.id)).toEqual(["western-cowboy"]);
    expect(getPlannedGalleryConcepts()[0]?.galleryPreview).toMatchObject({
      status: "planned",
      image: null,
      prompt: null,
      title: { bg: "Дивият запад", en: "The Wild West" },
    });
    expect(
      futureAiConcepts.every((concept) => !aiWorks.some((work) => work.slug === concept.id)),
    ).toBe(true);
  });

  it("keeps every AI creation date between 2026-09-01 and 2026-10-22", () => {
    const dated = aiWorks.filter((work) => work.date !== undefined);
    expect(dated.map((work) => [work.slug, work.date])).toEqual([
      ["chefo-srednovekoven-ritsar", "2026-09-12"],
      ["renesansov-portret", "2026-09-03"],
      ["chefo-v-badeshteto", "2026-10-01"],
      ["chefo-v-turtsiya", "2026-10-12"],
    ]);
    for (const work of dated) {
      expect(work.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(work.date! >= "2026-09-01").toBe(true);
      expect(work.date! <= "2026-10-22").toBe(true);
    }
    for (const concept of futureAiConcepts) expect(concept).not.toHaveProperty("date");
  });

  it("combines completed-work facets without adding planned concepts", () => {
    expect(
      filterAiWorks(aiWorks, { role: "ruler", tool: "Grok" }).map((work) => work.slug),
    ).toEqual([]);
    expect(
      filterAiWorks(aiWorks, { era: "renaissance", setting: "portrait-backdrop" }).map(
        (work) => work.slug,
      ),
    ).toEqual(["renesansov-portret"]);
    expect(filterAiWorks(aiWorks, { role: "explorer", era: "medieval" })).toHaveLength(0);
  });
});
