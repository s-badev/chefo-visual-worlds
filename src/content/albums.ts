import { getPhoto, localizePhoto, type Photo } from "./photos";
import type { Locale } from "@/i18n";

export type LocalizedText = { bg: string; en: string };
export type AlbumStatus = "draft" | "published";

/** A future album-photo relation can carry metadata without changing photo assets. */
export interface AlbumPhoto {
  photoSlug: string;
  order: number;
  caption?: LocalizedText;
  alt?: LocalizedText;
  location?: LocalizedText;
  date?: string;
}

export interface Album {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  coverPhotoSlug: string | null;
  photos: AlbumPhoto[];
  displayOrder: number;
  status: AlbumStatus;
}

const title = (bg: string, en: string): LocalizedText => ({ bg, en });
const entry = (photoSlug: string, order: number): AlbumPhoto => ({ photoSlug, order });
const draft = (slug: string, bg: string, en: string, displayOrder: number): Album => ({
  id: slug,
  slug,
  title: title(bg, en),
  description: title(`Албумът за ${bg} е в подготовка.`, `The ${en} album is in preparation.`),
  coverPhotoSlug: null,
  photos: [],
  displayOrder,
  status: "draft",
});

/** Drafts have no borrowed covers. Publish only after real photos are assigned. */
export const albums: Album[] = [
  {
    id: "sofia",
    slug: "sofia",
    title: title("София", "Sofia"),
    description: title("Градски кадри от София.", "City photographs from Sofia."),
    coverPhotoSlug: "sofia-tramvay-12",
    photos: [entry("sofia-tramvay-12", 1), entry("sofia-nevski-sinya-chas", 2)],
    displayOrder: 1,
    status: "published",
  },
  {
    id: "sunny-beach",
    slug: "sunny-beach",
    title: title("Слънчев бряг", "Sunny Beach"),
    description: title(
      "Кадри от крайбрежието на Слънчев бряг.",
      "Photographs from the Sunny Beach coastline.",
    ),
    coverPhotoSlug: "slanchev-bryag-zalez",
    photos: [entry("slanchev-bryag-zalez", 1)],
    displayOrder: 2,
    status: "published",
  },
  draft("sveti-vlas", "Свети Влас", "Sveti Vlas", 3),
  {
    id: "nessebar",
    slug: "nessebar",
    title: title("Несебър", "Nessebar"),
    description: title(
      "Кадри от стария град и крайбрежието на Несебър.",
      "Photographs from Nessebar's old town and coast.",
    ),
    coverPhotoSlug: "nesebar-vyatarnata-melnitsa",
    photos: [
      entry("nesebar-vyatarnata-melnitsa", 1),
      entry("nesebar-zlaten-chas", 2),
      entry("nesebar-hram-pantokrator", 3),
    ],
    displayOrder: 4,
    status: "published",
  },
  {
    id: "plovdiv",
    slug: "plovdiv",
    title: title("Пловдив", "Plovdiv"),
    description: title("Кадри от Стария град на Пловдив.", "Photographs from Plovdiv's Old Town."),
    coverPhotoSlug: "plovdiv-staria-grad",
    photos: [entry("plovdiv-staria-grad", 1)],
    displayOrder: 5,
    status: "published",
  },
  draft("rila", "Рила", "Rila", 6),
  draft("tunisia", "Тунис", "Tunisia", 7),
  draft("paris", "Париж", "Paris", 8),
  draft("istanbul", "Истанбул", "Istanbul", 9),
  draft("bodrum", "Бодрум", "Bodrum", 10),
];

export const albumText = (value: LocalizedText, locale: Locale) => value[locale];

/** All destinations are visible, including drafts awaiting their first photograph. */
export const getAlbums = () => albums.slice().sort((a, b) => a.displayOrder - b.displayOrder);

export const getAlbum = (slug: string) => albums.find((album) => album.slug === slug);

export const getPublishedAlbums = () =>
  albums
    .filter(
      (album) =>
        album.status === "published" &&
        album.coverPhotoSlug &&
        getPhoto(album.coverPhotoSlug) &&
        album.photos.length > 0 &&
        album.photos.some((item) => item.photoSlug === album.coverPhotoSlug) &&
        album.photos.every((item) => getPhoto(item.photoSlug)),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);

export const getPublishedAlbum = (slug: string) =>
  getPublishedAlbums().find((album) => album.slug === slug);

export const getAlbumCover = (album: Album) =>
  album.coverPhotoSlug ? getPhoto(album.coverPhotoSlug) : undefined;

export const getAlbumPhotos = (album: Album, locale: Locale): Photo[] =>
  album.photos
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((item) => {
      const original = getPhoto(item.photoSlug);
      if (!original) return [];
      const photo = localizePhoto(original, locale);
      return [
        {
          ...photo,
          alt: item.alt ? albumText(item.alt, locale) : photo.alt,
          caption: item.caption ? albumText(item.caption, locale) : photo.caption,
          location: item.location ? albumText(item.location, locale) : photo.location,
          date: item.date ?? photo.date,
        },
      ];
    });

export const getAlbumForPhoto = (photoSlug: string) =>
  getPublishedAlbums().find((album) => album.photos.some((item) => item.photoSlug === photoSlug));

export const getNextPublishedAlbum = (album: Album) => {
  const published = getPublishedAlbums();
  return published[(published.findIndex((item) => item.id === album.id) + 1) % published.length];
};

export const getNextAlbum = (album: Album) => {
  const ordered = getAlbums();
  return ordered[(ordered.findIndex((item) => item.id === album.id) + 1) % ordered.length];
};
