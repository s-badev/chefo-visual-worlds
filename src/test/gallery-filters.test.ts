import { describe, expect, it } from "vitest";
import { getAiFilterOptions, filterAiWorks, aiWorks } from "@/content/ai-works";
import { futureAiConcepts, getPlannedGalleryConcepts } from "@/content/ai-concepts";
import {
  filterGalleryPhotos,
  getAllGalleryPhotos,
  getPhotoLocations,
} from "@/content/photo-gallery";
import { PHOTO_THEMES } from "@/content/photos";

describe("photography filters", () => {
  const items = getAllGalleryPhotos("bg");

  it("shows each existing photo once and derives ten destinations from albums", () => {
    expect(items).toHaveLength(8);
    expect(new Set(items.map(({ photo }) => photo.slug)).size).toBe(8);
    expect(getPhotoLocations()).toHaveLength(10);
    expect(items.find(({ photo }) => photo.slug === "patyat-na-yug")?.albumSlug).toBeNull();
    expect(PHOTO_THEMES).toEqual(["sea", "city", "sunsets", "nature", "architecture", "travel"]);
  });

  it("applies theme and location together, including accurate empty results", () => {
    expect(
      filterGalleryPhotos(items, { theme: "sunsets", location: "nessebar" }).map(
        ({ photo }) => photo.slug,
      ),
    ).toEqual(["nesebar-vyatarnata-melnitsa", "nesebar-zlaten-chas"]);
    expect(
      filterGalleryPhotos(items, { theme: "architecture", location: "sofia" }).map(
        ({ photo }) => photo.slug,
      ),
    ).toEqual(["sofia-nevski-sinya-chas"]);
    expect(filterGalleryPhotos(items, { theme: "nature" }).map(({ photo }) => photo.slug)).toEqual([
      "patyat-na-yug",
    ]);
    expect(filterGalleryPhotos(items, { theme: "nature", location: "sofia" })).toHaveLength(0);
    expect(filterGalleryPhotos(items, { location: "paris" })).toHaveLength(0);
  });
});

describe("AI taxonomy", () => {
  it("offers filter choices only for existing artworks", () => {
    const options = getAiFilterOptions();
    for (const role of options.roles) expect(aiWorks.some((work) => work.role === role)).toBe(true);
    for (const era of options.eras) expect(aiWorks.some((work) => work.era === era)).toBe(true);
    for (const setting of options.settings)
      expect(aiWorks.some((work) => work.setting === setting)).toBe(true);
    expect(futureAiConcepts).toHaveLength(8);
    expect(getPlannedGalleryConcepts().map((concept) => concept.id)).toEqual(["western-cowboy"]);
    expect(getPlannedGalleryConcepts()[0]?.galleryPreview).toMatchObject({
      status: "planned",
      image: null,
      prompt: null,
      title: { bg: "Чефо като каубой", en: "Chefo as a Cowboy" },
    });
    expect(
      futureAiConcepts.every((concept) => !aiWorks.some((work) => work.slug === concept.id)),
    ).toBe(true);
  });

  it("combines completed-work facets without adding planned concepts", () => {
    expect(
      filterAiWorks(aiWorks, { role: "ruler", tool: "Grok" }).map((work) => work.slug),
    ).toEqual(["vladetel-na-morskoto-kralstvo"]);
    expect(
      filterAiWorks(aiWorks, { era: "renaissance", setting: "portrait-backdrop" }).map(
        (work) => work.slug,
      ),
    ).toEqual(["renesansov-portret"]);
    expect(filterAiWorks(aiWorks, { role: "explorer", era: "medieval" })).toHaveLength(0);
  });
});
