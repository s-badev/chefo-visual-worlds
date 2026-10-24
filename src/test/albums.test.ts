import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  albums,
  getAlbum,
  getAlbumCover,
  getAlbums,
  getAlbumForPhoto,
  getAlbumPhotos,
  getNextAlbum,
  getNextPublishedAlbum,
  getPublishedAlbum,
  getPublishedAlbums,
} from "@/content/albums";
import { getPhoto, photos } from "@/content/photos";
import { batchAlbumSlugs, batchPhotos } from "@/content/batch-photos";
import { sunnyBeachPhotos } from "@/content/sunny-beach-photos";
import { istanbulPhotos } from "@/content/istanbul-photos";
import { parisPhotos } from "@/content/paris-photos";
import { fourNewAlbumPhotos } from "@/content/four-new-album-photos";
import { lyonPhotos } from "@/content/lyon-photos";
import { rilaAdditions } from "@/content/rila-additions";
import { sofiaAdditions } from "@/content/sofia-additions";
import { plovdivAdditions } from "@/content/plovdiv-additions";
import { edirneAdditions } from "@/content/edirne-additions";
import { fourAlbumAdditions } from "@/content/four-album-additions";
import { svetiVlasAdditions } from "@/content/sveti-vlas-additions";
import { routeTree } from "@/routeTree.gen";
import { validatePhotoSearch } from "@/views/photography";

describe("photography albums", () => {
  it("has twelve stable locations and publishes only populated albums", () => {
    expect(albums.map((album) => album.slug)).toEqual([
      "sofia",
      "sunny-beach",
      "sveti-vlas",
      "nessebar",
      "plovdiv",
      "rila",
      "tunisia",
      "paris",
      "lyon",
      "istanbul",
      "edirne",
      "bodrum",
    ]);
    expect(new Set(albums.map((album) => album.id)).size).toBe(albums.length);
    expect(photos).toHaveLength(395);
    expect(
      albums.every((album) =>
        existsSync(join(process.cwd(), "public", "photos", album.slug, ".gitkeep")),
      ),
    ).toBe(true);
    expect(getPublishedAlbums().map((album) => album.slug)).toEqual([
      "sofia",
      "sunny-beach",
      "sveti-vlas",
      "nessebar",
      "plovdiv",
      "rila",
      "tunisia",
      "paris",
      "lyon",
      "istanbul",
      "edirne",
      "bodrum",
    ]);
    expect(getPublishedAlbum("paris")?.status).toBe("published");
    expect(getPublishedAlbum("lyon")?.status).toBe("published");
    expect(getPublishedAlbum("edirne")?.status).toBe("published");
    expect(getAlbum("edirne")).toMatchObject({
      id: "edirne",
      title: { bg: "Одрин", en: "Edirne" },
      description: {
        bg: "Архитектура, градски улици и моменти от Одрин, Турция.",
        en: "Architecture, city streets, and moments from Edirne, Turkey.",
      },
      coverPhotoSlug: "edirne-006",
      status: "published",
    });
    expect(getAlbum("lyon")).toMatchObject({
      id: "lyon",
      title: { bg: "Лион", en: "Lyon" },
      description: {
        bg: "Градски пейзажи, архитектура и моменти от Лион, Франция.",
        en: "Cityscapes, architecture, and moments from Lyon, France.",
      },
      coverPhotoSlug: "lyon-001",
      status: "published",
    });
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

  it("uses real Sofia and Sunny Beach covers and removes the two AI photo records", () => {
    const sofia = getPublishedAlbum("sofia")!;
    const sunnyBeach = getPublishedAlbum("sunny-beach")!;
    expect(
      getAlbumPhotos(sofia, "bg")
        .map((photo) => photo.slug)
        .slice(0, 2),
    ).toEqual(["sofia-001", "sofia-nevski-sinya-chas"]);
    expect(getAlbumPhotos(sofia, "en")[0]?.title).toBe("Illuminated facade at night");
    expect(getAlbumPhotos(sofia, "bg")).toHaveLength(45);
    expect(getAlbumPhotos(sunnyBeach, "en")).toHaveLength(58);
    expect(getAlbumCover(sofia)?.image).toBe("/photos/sofia/sofia-001.webp");
    expect(getAlbumCover(sunnyBeach)?.image).toBe("/photos/sunny-beach/sunny-beach-010.webp");
    expect(getAlbumForPhoto("sofia-001")?.slug).toBe("sofia");
    for (const slug of ["sofia-tramvay-12", "slanchev-bryag-zalez"]) {
      expect(getPhoto(slug)).toBeUndefined();
      expect(getAlbumForPhoto(slug)).toBeUndefined();
      expect(albums.every((album) => album.coverPhotoSlug !== slug)).toBe(true);
      expect(albums.every((album) => album.photos.every((item) => item.photoSlug !== slug))).toBe(
        true,
      );
    }
    expect(getAlbumForPhoto("patyat-na-yug")).toBeUndefined();
    expect(getNextPublishedAlbum(sofia)?.slug).toBe("sunny-beach");
    expect(getNextAlbum(getAlbum("paris")!)?.slug).toBe("lyon");
    expect(getNextAlbum(getAlbum("lyon")!)?.slug).toBe("istanbul");
    expect(getNextAlbum(getAlbum("istanbul")!)?.slug).toBe("edirne");
    expect(getNextAlbum(getAlbum("edirne")!)?.slug).toBe("bodrum");
  });

  it("registers each new real photograph once with localized descriptions and exact WebP dimensions", () => {
    const expected = {
      bodrum: 15,
      plovdiv: 5,
      rila: 20,
      sofia: 5,
      "sunny-beach": 26,
      "sveti-vlas": 8,
      tunisia: 22,
    };
    const laterAdditions: Partial<Record<keyof typeof expected, number>> = {
      bodrum: 9,
      plovdiv: 12,
      rila: 18,
      sofia: 38,
      tunisia: 3,
    };
    expect(batchPhotos).toHaveLength(101);
    expect(new Set(photos.map((photo) => photo.slug)).size).toBe(photos.length);
    for (const slug of batchAlbumSlugs) {
      const album = getPublishedAlbum(slug)!;
      const added = batchPhotos.filter((photo) => photo.slug.startsWith(`${slug}-`));
      expect(added).toHaveLength(expected[slug]);
      expect(
        added.every((photo) => album.photos.some((item) => item.photoSlug === photo.slug)),
      ).toBe(true);
      expect(getAlbumPhotos(album, "bg")).toHaveLength(
        expected[slug] +
          (laterAdditions[slug] ?? 0) +
          (["sofia", "plovdiv"].includes(slug) ? 1 : 0) +
          (slug === "sunny-beach" ? 32 : 0) +
          (slug === "sofia" || slug === "sveti-vlas" ? 1 : 0) +
          (slug === "sveti-vlas" ? 2 : 0),
      );
      for (const photo of added) {
        const path = join(process.cwd(), "public", photo.image.slice(1));
        expect(existsSync(path)).toBe(true);
        const bytes = readFileSync(path);
        expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
        expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
        expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
        expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
        expect(photo.title).toBeTruthy();
        expect(photo.alt).toBeTruthy();
        expect(photo.en?.title).toBeTruthy();
        expect(photo.en?.alt).toBeTruthy();
        expect(getAlbumForPhoto(photo.slug)?.slug).toBe(slug);
      }
    }
  });

  it("integrates the 27 new Sunny Beach WebPs once with bilingual titles and exact dimensions", () => {
    const album = getPublishedAlbum("sunny-beach")!;
    expect(sunnyBeachPhotos).toHaveLength(27);
    expect(getAlbumPhotos(album, "bg")).toHaveLength(58);
    expect(new Set(album.photos.map((item) => item.photoSlug)).size).toBe(58);
    expect(album.coverPhotoSlug).toBe("sunny-beach-010");
    for (const photo of sunnyBeachPhotos) {
      expect(album.photos.filter((item) => item.photoSlug === photo.slug)).toHaveLength(1);
      expect(getAlbumForPhoto(photo.slug)?.slug).toBe("sunny-beach");
      expect(photo.title).toBeTruthy();
      expect(photo.alt).toBeTruthy();
      expect(photo.en?.title).toBeTruthy();
      expect(photo.en?.alt).toBeTruthy();
      const bytes = readFileSync(join(process.cwd(), "public", photo.image.slice(1)));
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(photo.width).toBeLessThanOrEqual(2000);
      expect(photo.height).toBeLessThanOrEqual(2000);
    }
    expect(
      getAlbumPhotos(album, "en").find((photo) => photo.slug === "moonlight-path-over-the-sea")
        ?.title,
    ).toBe("Moonlight path across the sea");
  });

  it("integrates the four archived batches without changing album covers", () => {
    const expected = [
      { slug: "sunny-beach", count: 58, added: 5, cover: "sunny-beach-010" },
      { slug: "sveti-vlas", count: 11, added: 1, cover: "sveti-vlas-005" },
      { slug: "sofia", count: 45, added: 1, cover: "sofia-001" },
      { slug: "nessebar", count: 33, added: 8, cover: "nessebar-015" },
    ];
    expect(fourAlbumAdditions).toHaveLength(15);
    for (const { slug, count, added, cover } of expected) {
      const album = getPublishedAlbum(slug)!;
      const additions = fourAlbumAdditions.filter((photo) =>
        photo.image.startsWith(`/photos/${slug}/`),
      );
      expect(additions).toHaveLength(added);
      expect(album.coverPhotoSlug).toBe(cover);
      expect(getAlbumPhotos(album, "bg")).toHaveLength(count);
      expect(getAlbumPhotos(album, "en")).toHaveLength(count);
      expect(new Set(album.photos.map((item) => item.photoSlug)).size).toBe(count);
      for (const photo of additions) {
        expect(album.photos.filter((item) => item.photoSlug === photo.slug)).toHaveLength(1);
        expect(getAlbumForPhoto(photo.slug)?.slug).toBe(slug);
        expect(photo.title && photo.alt && photo.en?.title && photo.en?.alt).toBeTruthy();
        const bytes = readFileSync(join(process.cwd(), "public", photo.image.slice(1)));
        expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
        expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
        expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
        expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
        expect(Math.max(photo.width, photo.height)).toBeLessThanOrEqual(2000);
        expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
        expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
      }
    }
  });

  it("adds both Sveti Vlas originals once and preserves its cover", () => {
    const album = getPublishedAlbum("sveti-vlas")!;
    expect(album.coverPhotoSlug).toBe("sveti-vlas-005");
    expect(getAlbumPhotos(album, "bg")).toHaveLength(11);
    expect(getAlbumPhotos(album, "en")).toHaveLength(11);
    expect(svetiVlasAdditions.map(({ slug }) => slug)).toEqual([
      "sveti-vlas-009",
      "sveti-vlas-010",
    ]);
    expect(getAlbumPhotos(album, "en").slice(-2).map(({ title }) => title)).toEqual([
      "Panoramic Sea View",
      "Swing Overlooking the Sea",
    ]);
    for (const photo of svetiVlasAdditions) {
      expect(album.photos.filter(({ photoSlug }) => photoSlug === photo.slug)).toHaveLength(1);
      const bytes = readFileSync(join(process.cwd(), "public", photo.image.slice(1)));
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
      expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
    }
  });

  it("uses Bodrum photo 013 as its cover without changing gallery order", () => {
    const bodrum = getPublishedAlbum("bodrum")!;
    expect(bodrum.coverPhotoSlug).toBe("bodrum-013");
    expect(getAlbumCover(bodrum)?.image).toBe("/photos/bodrum/bodrum-013.webp");
    expect(getAlbumCover(bodrum)?.title).toBe("Лодки край брега");
    expect(getAlbumPhotos(bodrum, "en").find((photo) => photo.slug === "bodrum-013")?.title).toBe(
      "Boats along the shore",
    );
    expect(getAlbumPhotos(bodrum, "bg").map((photo) => photo.slug)).toEqual(
      [10, 1, 8, 4, 5, 2, 6, 9, 12, 7, 3, 11, 14, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(
        (number) => `bodrum-${String(number).padStart(3, "0")}`,
      ),
    );
  });

  it("keeps 27 original Istanbul records and publishes 40 photographs with a real cover", () => {
    const album = getPublishedAlbum("istanbul")!;
    const bg = getAlbumPhotos(album, "bg");
    const en = getAlbumPhotos(album, "en");
    expect(istanbulPhotos).toHaveLength(27);
    expect(bg).toHaveLength(40);
    expect(en).toHaveLength(40);
    expect(new Set(bg.map((photo) => photo.slug)).size).toBe(40);
    expect(album.coverPhotoSlug).toBe("istanbul-024");
    expect(bg[0]?.slug).toBe(album.coverPhotoSlug);
    expect(getAlbumCover(album)?.image).toBe("/photos/istanbul/istanbul-024-maidens-tower.webp");
    expect(en[0]?.title).toBe("Maiden's Tower");
    expect(en[0]?.location).toBe("Istanbul");
    for (const photo of istanbulPhotos) {
      expect(getAlbumForPhoto(photo.slug)?.slug).toBe("istanbul");
      expect(photo.title).toBeTruthy();
      expect(photo.alt).toBeTruthy();
      expect(photo.en?.title).toBeTruthy();
      expect(photo.en?.alt).toBeTruthy();
      const path = join(process.cwd(), "public", photo.image.slice(1));
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(Math.max(photo.width, photo.height)).toBeLessThanOrEqual(2000);
      expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
      expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
    }
  });

  it("keeps 54 original Paris records and publishes 57 photographs with verified dimensions", () => {
    const album = getPublishedAlbum("paris")!;
    const bg = getAlbumPhotos(album, "bg");
    const en = getAlbumPhotos(album, "en");
    expect(parisPhotos).toHaveLength(54);
    expect(bg).toHaveLength(57);
    expect(en).toHaveLength(57);
    expect(new Set(bg.map((photo) => photo.slug)).size).toBe(57);
    // Owner decision: paris-052 is the cover everywhere; the gallery order still starts with paris-054.
    expect(album.coverPhotoSlug).toBe("paris-052");
    expect(bg[0]?.slug).toBe("paris-054");
    expect(getAlbumCover(album)?.image).toBe("/photos/paris/paris-052.webp");
    expect(getAlbumCover(album)?.title).toBe("Париж преди нощта");
    expect(bg.filter((photo) => photo.slug === "paris-052")).toHaveLength(1);
    expect(en[0]?.location).toBe("Paris");
    for (const photo of parisPhotos) {
      expect(getAlbumForPhoto(photo.slug)?.slug).toBe("paris");
      expect(photo.title).toBeTruthy();
      expect(photo.alt).toBeTruthy();
      expect(photo.en?.title).toBeTruthy();
      expect(photo.en?.alt).toBeTruthy();
      const bytes = readFileSync(join(process.cwd(), "public", photo.image.slice(1)));
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(Math.max(photo.width, photo.height)).toBeLessThanOrEqual(2000);
      expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
      expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
    }
  });

  it("registers all 28 new four-album WebPs with bilingual metadata and valid dimensions", () => {
    expect(fourNewAlbumPhotos).toHaveLength(28);
    expect(new Set(fourNewAlbumPhotos.map((photo) => photo.slug)).size).toBe(28);
    for (const [slug, count] of Object.entries({ paris: 3, bodrum: 9, istanbul: 13, tunisia: 3 })) {
      expect(fourNewAlbumPhotos.filter((photo) => photo.slug.startsWith(`${slug}-`))).toHaveLength(
        count,
      );
    }
    for (const photo of fourNewAlbumPhotos) {
      expect(
        getAlbumForPhoto(photo.slug)?.photos.some((entry) => entry.photoSlug === photo.slug),
      ).toBe(true);
      expect(photo.title).toBeTruthy();
      expect(photo.alt).toBeTruthy();
      expect(photo.en?.title).toBeTruthy();
      expect(photo.en?.alt).toBeTruthy();
      const path = join(process.cwd(), "public", photo.image.slice(1));
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(Math.max(photo.width, photo.height)).toBeLessThanOrEqual(2000);
      expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
      expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
    }
  });

  it("registers the four new batches with expected covers", () => {
    const batches = [
      { slug: "rila", added: rilaAdditions, count: 38, cover: "rila-008" },
      { slug: "sofia", added: sofiaAdditions, count: 45, cover: "sofia-001" },
      { slug: "plovdiv", added: plovdivAdditions, count: 18, cover: "plovdiv-011" },
      { slug: "edirne", added: edirneAdditions, count: 21, cover: "edirne-006" },
    ];
    expect(batches.map((batch) => batch.added.length)).toEqual([18, 38, 12, 21]);
    expect(new Set(photos.map((photo) => photo.slug)).size).toBe(photos.length);
    for (const { slug, added, count, cover } of batches) {
      const album = getPublishedAlbum(slug)!;
      expect(album.coverPhotoSlug).toBe(cover);
      expect(getAlbumPhotos(album, "bg")).toHaveLength(count);
      expect(getAlbumPhotos(album, "en")).toHaveLength(count);
      expect(new Set(album.photos.map((item) => item.photoSlug)).size).toBe(count);
      for (const photo of added) {
        expect(getAlbumForPhoto(photo.slug)?.slug).toBe(slug);
        expect(photo.title && photo.alt && photo.en?.title && photo.en?.alt).toBeTruthy();
        const bytes = readFileSync(join(process.cwd(), "public", photo.image.slice(1)));
        expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
        expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
        expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
        expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
        expect(Math.max(photo.width, photo.height)).toBeLessThanOrEqual(2000);
        expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
        expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
      }
    }
    expect(getAlbumCover(getAlbum("edirne")!)?.image).toBe("/photos/edirne/edirne-006.webp");
  });

  it("publishes 24 unique Lyon WebPs with bilingual metadata and a real cover", () => {
    const album = getPublishedAlbum("lyon")!;
    const bg = getAlbumPhotos(album, "bg");
    const en = getAlbumPhotos(album, "en");
    expect(lyonPhotos).toHaveLength(24);
    expect(bg).toHaveLength(24);
    expect(en).toHaveLength(24);
    expect(new Set(bg.map((photo) => photo.slug)).size).toBe(24);
    expect(album.coverPhotoSlug).toBe("lyon-001");
    expect(getAlbumCover(album)?.image).toBe("/photos/lyon/lyon-001.webp");
    expect(en[0]?.location).toBe("Lyon");
    for (const photo of lyonPhotos) {
      expect(getAlbumForPhoto(photo.slug)?.slug).toBe("lyon");
      expect(photo.title && photo.alt && photo.en?.title && photo.en?.alt).toBeTruthy();
      const bytes = readFileSync(join(process.cwd(), "public", photo.image.slice(1)));
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(Math.max(photo.width, photo.height)).toBeLessThanOrEqual(2000);
      expect(bytes.includes(Buffer.from("EXIF"))).toBe(false);
      expect(bytes.includes(Buffer.from("XMP "))).toBe(false);
    }
  });

  it("preserves the original 25 real Nessebar photos and its real cover", () => {
    const album = getAlbum("nessebar")!;
    const bg = getAlbumPhotos(album, "bg");
    const en = getAlbumPhotos(album, "en");
    expect(album.coverPhotoSlug).toBe("nessebar-015");
    expect(getAlbumCover(album)?.image).toBe("/photos/nessebar/nessebar-015.webp");
    expect(bg).toHaveLength(33);
    expect(new Set(bg.map((photo) => photo.slug)).size).toBe(33);
    expect(bg[0]?.slug).toBe(album.coverPhotoSlug);
    for (const slug of [
      "nesebar-vyatarnata-melnitsa",
      "nesebar-hram-pantokrator",
      "nesebar-zlaten-chas",
    ]) {
      expect(getPhoto(slug)).toBeUndefined();
      expect(album.photos.some((item) => item.photoSlug === slug)).toBe(false);
    }
    for (let number = 1; number <= 25; number++) {
      const slug = `nessebar-${String(number).padStart(3, "0")}`;
      const photo = getPhoto(slug)!;
      expect(album.photos.filter((item) => item.photoSlug === slug)).toHaveLength(1);
      expect(photo.image).toBe(`/photos/nessebar/${slug}.webp`);
      const path = join(process.cwd(), "public", photo.image.slice(1));
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8X");
      expect(photo.width).toBe(1 + bytes.readUIntLE(24, 3));
      expect(photo.height).toBe(1 + bytes.readUIntLE(27, 3));
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
      expect(photo.title.length).toBeGreaterThan(0);
      expect(photo.alt.length).toBeGreaterThan(0);
      expect(photo.en?.title?.length).toBeGreaterThan(0);
      expect(photo.en?.alt?.length).toBeGreaterThan(0);
      expect(getAlbumForPhoto(slug)?.slug).toBe("nessebar");
    }
    expect(en.find((photo) => photo.slug === "nessebar-025")?.title).toBe("Boats at sunset");
  });

  it("applies optional album-specific metadata in each language", () => {
    const sofia = getPublishedAlbum("sofia")!;
    const local = {
      ...sofia,
      photos: [
        {
          photoSlug: "sofia-001",
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

  it("routes BG and EN albums while retaining legacy photo URLs", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const slug of batchAlbumSlugs) {
      expect(router.matchRoutes(`/photography/albums/${slug}`).at(-1)?.routeId).toBe(
        "/photography/albums/$slug",
      );
      expect(router.matchRoutes(`/en/photography/albums/${slug}`).at(-1)?.routeId).toBe(
        "/en/photography/albums/$slug",
      );
    }
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
    expect(router.matchRoutes("/photography/albums/lyon").at(-1)?.routeId).toBe(
      "/photography/albums/$slug",
    );
    expect(router.matchRoutes("/en/photography/albums/lyon").at(-1)?.routeId).toBe(
      "/en/photography/albums/$slug",
    );
    expect(router.matchRoutes("/photography/albums/edirne").at(-1)?.routeId).toBe(
      "/photography/albums/$slug",
    );
    expect(router.matchRoutes("/en/photography/albums/edirne").at(-1)?.routeId).toBe(
      "/en/photography/albums/$slug",
    );
    expect(router.matchRoutes("/photography/edirne").at(-1)?.routeId).toBe("/photography/edirne");
    expect(router.matchRoutes("/en/photography/edirne").at(-1)?.routeId).toBe(
      "/en/photography/edirne",
    );
    expect(router.matchRoutes("/photography/sofia-001").at(-1)?.routeId).toBe("/photography/$slug");
    expect(validatePhotoSearch({ view: "photos", theme: "city", location: "sofia" })).toEqual({
      view: "photos",
      theme: "city",
      location: "sofia",
    });
  });
});
