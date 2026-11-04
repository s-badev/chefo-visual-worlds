import { describe, expect, it } from "vitest";
import { ALBUM_PLACES } from "@/content/album-places";
import { getAlbums } from "@/content/albums";

describe("ALBUM_PLACES", () => {
  it("maps every album from getAlbums() to a geographic place and vice versa", () => {
    const albumSlugs = getAlbums().map((album) => album.slug);
    const placeSlugs = Object.keys(ALBUM_PLACES);

    expect(placeSlugs).toEqual(albumSlugs);
    for (const slug of albumSlugs) {
      const place = ALBUM_PLACES[slug];
      expect(place).toBeDefined();
      expect(Number.isFinite(place!.lat)).toBe(true);
      expect(Number.isFinite(place!.lon)).toBe(true);
      expect(["europe", "balkans"]).toContain(place!.layer);
    }
  });
});
