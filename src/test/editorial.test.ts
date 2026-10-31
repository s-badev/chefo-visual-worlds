import { describe, expect, it } from "vitest";
import { getAlbum } from "@/content/albums";
import { getAiWork } from "@/content/ai-works";
import { getPhoto } from "@/content/photos";
import {
  deriveRows,
  editorial,
  getChapterRows,
  getEditorialAlbum,
  getEditorialChapterImages,
  type EditorialConfig,
} from "@/content/editorial";

const typedEditorial: EditorialConfig = editorial;
const unique = (values: readonly string[]) => new Set(values).size === values.length;

describe("optional editorial presentation data", () => {
  it("uses registered photographs for every selection", () => {
    const selected = [
      ...editorial.albums.flatMap((album) =>
        album.chapters.flatMap((chapter) => chapter.images.map((image) => image.photoSlug)),
      ),
      ...editorial.about.photoSlugs,
    ];
    expect(selected.every((slug) => getPhoto(slug))).toBe(true);
  });

  it("keeps each album layout within its own album", () => {
    for (const layout of editorial.albums) {
      const album = getAlbum(layout.albumSlug);
      expect(album).toBeDefined();
      for (const chapter of layout.chapters) {
        for (const image of chapter.images) {
          expect(album?.photos.some((item) => item.photoSlug === image.photoSlug)).toBe(true);
        }
      }
    }
  });

  it("uses registered artworks without duplicate choices within a grouping", () => {
    for (const group of [editorial.about.artworkSlugs, editorial.artworks.representativeSlugs]) {
      expect(unique(group)).toBe(true);
      expect(group.every((slug) => getAiWork(slug))).toBe(true);
    }
    expect(unique(editorial.about.photoSlugs)).toBe(true);
    for (const album of editorial.albums) {
      expect(
        unique(album.chapters.flatMap((chapter) => chapter.images.map((image) => image.photoSlug))),
      ).toBe(true);
    }
  });

  it("has stable chapter order and safe empty lookups", () => {
    expect(typedEditorial.albums.map((album) => album.albumSlug)).toEqual(["paris", "istanbul"]);
    expect(editorial.albums.map((album) => album.chapters.length)).toEqual([4, 4]);
    expect(getEditorialChapterImages("paris", 0).map((image) => image.photoSlug)).toEqual([
      "paris-048",
      "paris-043",
      "paris-013",
      "paris-009",
    ]);
    expect(getEditorialAlbum("sofia")).toBeUndefined();
    expect(getEditorialChapterImages("sofia", 0)).toEqual([]);
    expect(getEditorialChapterImages("paris", 99)).toEqual([]);
  });

  it("derives justified rows from the column placement and keeps every row filled", () => {
    expect(
      deriveRows([
        { photoSlug: "a", wide: true },
        { photoSlug: "b", column: "1 / 8" },
        { photoSlug: "c", column: "8 / 12" },
        { photoSlug: "d", column: "3 / 7" },
        { photoSlug: "e" },
        { photoSlug: "f", column: "1 / 5" },
      ]),
    ).toEqual([1, 2, 1, 1, 1]);
    expect(
      editorial.albums.map((album) => album.chapters.map((chapter) => getChapterRows(chapter))),
    ).toEqual([
      [[2, 2], [1, 2], [3], [3]],
      [[1, 2], [2], [2, 3], [1, 2]],
    ]);
    for (const album of typedEditorial.albums) {
      for (const chapter of album.chapters) {
        const rows = getChapterRows(chapter);
        expect(rows.reduce((sum, count) => sum + count, 0)).toBe(chapter.images.length);
        // No photograph sits alone in a row unless it is a deliberate full-width image.
        let start = 0;
        for (const count of rows) {
          if (count === 1) expect(chapter.images[start]!.wide).toBe(true);
          start += count;
        }
      }
    }
  });

  it("contains only identifiers and layout values, with no editorial prose", () => {
    const strings: string[] = [];
    const visit = (value: unknown): void => {
      if (typeof value === "string") strings.push(value);
      else if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") Object.values(value).forEach(visit);
    };
    visit(editorial);
    expect(strings.length).toBeGreaterThan(0);
    expect(
      strings.every(
        (value) =>
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ||
          /^\d+% \d+%$/.test(value) ||
          /^\d+ \/ \d+$/.test(value) ||
          /^-?\d+rem$/.test(value),
      ),
    ).toBe(true);
  });
});
