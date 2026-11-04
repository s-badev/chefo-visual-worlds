import { describe, expect, it } from "vitest";
import {
  EU_BORDERS,
  EU_BULGARIA,
  EU_LAND,
  LENS_LAND,
  LENS_VIEWBOX,
  MAP_VIEWBOX,
  PLACE_POINTS,
  REG_BORDERS,
  REG_BULGARIA,
  REG_LAND,
} from "@/content/album-map.generated";
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

  it("keeps PLACE_POINTS keys and coordinates aligned with ALBUM_PLACES and MAP_VIEWBOX", () => {
    const placeSlugs = Object.keys(ALBUM_PLACES);
    expect(Object.keys(PLACE_POINTS)).toEqual(placeSlugs);
    expect(MAP_VIEWBOX).toEqual({ width: 600, height: 400 });
    expect(LENS_VIEWBOX).toBe("409 127 48 48");
    expect(EU_LAND.length).toBeGreaterThan(1000);
    expect(EU_BORDERS.length).toBeGreaterThan(500);
    expect(EU_BULGARIA.length).toBeGreaterThan(100);
    expect(REG_LAND.length).toBeGreaterThan(1000);
    expect(REG_BORDERS.length).toBeGreaterThan(500);
    expect(REG_BULGARIA.length).toBeGreaterThan(100);
    expect(LENS_LAND.length).toBeGreaterThan(100);

    for (const slug of placeSlugs) {
      const pts = PLACE_POINTS[slug]!;
      const place = ALBUM_PLACES[slug]!;
      expect(pts.eu[0]).toBeGreaterThanOrEqual(0);
      expect(pts.eu[0]).toBeLessThanOrEqual(MAP_VIEWBOX.width);
      expect(pts.eu[1]).toBeGreaterThanOrEqual(0);
      expect(pts.eu[1]).toBeLessThanOrEqual(MAP_VIEWBOX.height);

      if (place.layer === "balkans") {
        expect(pts.reg[0]).toBeGreaterThanOrEqual(0);
        expect(pts.reg[0]).toBeLessThanOrEqual(MAP_VIEWBOX.width);
        expect(pts.reg[1]).toBeGreaterThanOrEqual(0);
        expect(pts.reg[1]).toBeLessThanOrEqual(MAP_VIEWBOX.height);
      }
    }
  });
});
