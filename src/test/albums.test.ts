import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  albums,
  getAlbum,
  getAlbums,
  getAlbumForPhoto,
  getAlbumPhotos,
  getNextAlbum,
  getNextPublishedAlbum,
  getPublishedAlbum,
  getPublishedAlbums,
} from "@/content/albums";
import { getPhoto, photos } from "@/content/photos";
import { routeTree } from "@/routeTree.gen";
import { validatePhotoSearch } from "@/views/photography";

describe("photography albums", () => {
  it("has ten stable locations and publishes only populated albums", () => {
    expect(albums.map((album) => album.slug)).toEqual([
      "sofia",
      "sunny-beach",
      "sveti-vlas",
      "nessebar",
      "plovdiv",
      "rila",
      "tunisia",
      "paris",
      "istanbul",
      "bodrum",
    ]);
    expect(new Set(albums.map((album) => album.id)).size).toBe(albums.length);
    expect(photos).toHaveLength(8);
    expect(
      albums.every((album) =>
        existsSync(join(process.cwd(), "public", "photos", album.slug, ".gitkeep")),
      ),
    ).toBe(true);
    expect(getPublishedAlbums().map((album) => album.slug)).toEqual([
      "sofia",
      "sunny-beach",
      "nessebar",
      "plovdiv",
    ]);
    expect(getPublishedAlbum("paris")).toBeUndefined();
    expect(getAlbum("paris")?.status).toBe("draft");
    expect(getAlbum("does-not-exist")).toBeUndefined();
    expect(getAlbums().map((album) => album.slug)).toEqual(albums.map((album) => album.slug));
    for (const album of getPublishedAlbums()) {
      expect(getPhoto(album.coverPhotoSlug!)).toBeDefined();
      expect(album.photos.some((item) => item.photoSlug === album.coverPhotoSlug)).toBe(true);
      expect(album.photos.every((item) => getPhoto(item.photoSlug))).toBe(true);
    }
    expect(
      albums
        .filter((album) => album.status === "draft")
        .every((album) => album.photos.length === 0 && album.coverPhotoSlug === null),
    ).toBe(true);
  });

  it("keeps known photo associations, order and localization", () => {
    const sofia = getPublishedAlbum("sofia")!;
    expect(getAlbumPhotos(sofia, "bg").map((photo) => photo.slug)).toEqual([
      "sofia-tramvay-12",
      "sofia-nevski-sinya-chas",
    ]);
    expect(getAlbumPhotos(sofia, "en")[0]?.title).toBe("Tram 12 at dusk");
    expect(getAlbumForPhoto("sofia-tramvay-12")?.slug).toBe("sofia");
    expect(getAlbumForPhoto("patyat-na-yug")).toBeUndefined();
    expect(getNextPublishedAlbum(sofia)?.slug).toBe("sunny-beach");
    expect(getNextAlbum(getAlbum("paris")!)?.slug).toBe("istanbul");
  });

  it("applies optional album-specific metadata in each language", () => {
    const sofia = getPublishedAlbum("sofia")!;
    const local = {
      ...sofia,
      photos: [
        {
          photoSlug: "sofia-tramvay-12",
          order: 1,
          caption: { bg: "Надпис", en: "Caption" },
          alt: { bg: "Описание", en: "Description" },
        },
      ],
    };
    expect(getAlbumPhotos(local, "bg")[0]).toMatchObject({ caption: "Надпис", alt: "Описание" });
    expect(getAlbumPhotos(local, "en")[0]).toMatchObject({
      caption: "Caption",
      alt: "Description",
    });
  });

  it("routes BG and EN albums, including drafts, while retaining legacy photo URLs", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/photography/albums/sofia").at(-1)?.routeId).toBe(
      "/photography/albums/$slug",
    );
    expect(router.matchRoutes("/en/photography/albums/sofia").at(-1)?.routeId).toBe(
      "/en/photography/albums/$slug",
    );
    expect(router.matchRoutes("/photography/albums/paris").at(-1)?.routeId).toBe(
      "/photography/albums/$slug",
    );
    expect(router.matchRoutes("/en/photography/albums/paris").at(-1)?.routeId).toBe(
      "/en/photography/albums/$slug",
    );
    expect(router.matchRoutes("/photography/sofia-tramvay-12").at(-1)?.routeId).toBe(
      "/photography/$slug",
    );
    expect(validatePhotoSearch({ view: "photos", theme: "city", location: "sofia" })).toEqual({
      view: "photos",
      theme: "city",
      location: "sofia",
    });
  });
});
