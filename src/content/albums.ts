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
const batchEntries = (slug: string, numbers: number[], startOrder = 1): AlbumPhoto[] =>
  numbers.map((number, index) =>
    entry(`${slug}-${String(number).padStart(3, "0")}`, startOrder + index),
  );
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
    coverPhotoSlug: "sofia-001",
    photos: [
      entry("sofia-001", 1),
      entry("sofia-nevski-sinya-chas", 2),
      ...batchEntries("sofia", [3, 2, 5, 4], 3),
      ...batchEntries(
        "sofia",
        Array.from({ length: 38 }, (_, index) => index + 6),
        7,
      ),
      entry("sofia-vitosha-beneath-clouds", 45),
    ],
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
    coverPhotoSlug: "sunny-beach-010",
    photos: [
      "sunny-beach-010",
      "sunny-beach-by-the-sea",
      "sunny-beach-013",
      "sunny-beach-001",
      "flight-over-the-coast",
      "sunny-beach-002",
      "sunny-beach-009",
      "sunny-beach-003",
      "sunny-beach-006",
      "sunny-beach-with-umbrellas-and-loungers",
      "sunny-beach-014",
      "sunny-beach-004",
      "sunny-beach-008",
      "beach-day-under-the-palms",
      "sunny-beach-015",
      "sunny-beach-005",
      "sunny-beach-011",
      "seagull-on-sunny-beach",
      "sunny-beach-017",
      "sunny-beach-007",
      "sunny-beach-018",
      "sunny-beach-012",
      "sunny-beach-020",
      "sunny-beach-016",
      "sunny-beach-019",
      "sunny-beach-021",
      "sunny-beach-with-palms-and-sea",
      "sunny-beach-023",
      "sunny-beach-022",
      "sunny-tropical-beach-resort",
      "refreshing-drinks-at-the-beach-cafe",
      "layered-iced-coffee-by-the-sea",
      "tropical-taste-by-the-sea",
      "sunny-beach-024",
      "beach-resort-under-storm-clouds",
      "storm-over-the-coastal-resort",
      "amusement-ride-before-the-storm",
      "sunny-beach-025",
      "sunny-beach-026",
      "calm-coast-at-sunset",
      "coastal-sunset-over-the-lit-town",
      "night-reflections-by-the-promenade",
      "starry-night-over-the-quiet-beach",
      "moonlit-beach-with-loungers",
      "night-beach-in-moonlight",
      "moonlit-empty-beach",
      "night-beach-under-full-moon",
      "full-moon-in-the-dark-sky",
      "moonlight-path-over-the-sea",
      "night-beach-bar-and-moonlight",
      "night-cocktails-by-the-sea",
      "tropical-cocktails-at-night",
      "cocktails-under-moonlight",
    ]
      .concat([
        "sunny-beach-resort-pools-and-palms",
        "sunny-beach-umbrellas-toward-nessebar",
        "sunny-beach-evening-shoreline",
        "sunny-beach-palms-against-blue-sky",
        "sunny-beach-soft-evening-waves",
      ])
      .map((slug, index) => entry(slug, index + 1)),
    displayOrder: 2,
    status: "published",
  },
  {
    id: "sveti-vlas",
    slug: "sveti-vlas",
    title: title("Свети Влас", "Sveti Vlas"),
    description: title(
      "Морски залези, лодки и вечерни светлини от Свети Влас.",
      "Seaside sunsets, boats and evening lights from Sveti Vlas.",
    ),
    coverPhotoSlug: "sveti-vlas-005",
    photos: [
      ...batchEntries("sveti-vlas", [5, 2, 1, 3, 6, 4, 8, 7]),
      entry("sveti-vlas-yachts-beneath-hills", 9),
      entry("sveti-vlas-009", 10),
      entry("sveti-vlas-010", 11),
    ],
    displayOrder: 3,
    status: "published",
  },
  {
    id: "nessebar",
    slug: "nessebar",
    title: title("Несебър", "Nessebar"),
    description: title(
      "Кадри от стария град и крайбрежието на Несебър.",
      "Photographs from Nessebar's old town and coast.",
    ),
    coverPhotoSlug: "nessebar-015",
    photos: [
      entry("nessebar-015", 1),
      entry("nessebar-001", 2),
      entry("nessebar-020", 3),
      entry("nessebar-002", 4),
      entry("nessebar-019", 5),
      entry("nessebar-013", 6),
      entry("nessebar-011", 7),
      entry("nessebar-014", 8),
      entry("nessebar-016", 9),
      entry("nessebar-023", 10),
      entry("nessebar-006", 11),
      entry("nessebar-005", 12),
      entry("nessebar-010", 13),
      entry("nessebar-007", 14),
      entry("nessebar-009", 15),
      entry("nessebar-008", 16),
      entry("nessebar-022", 17),
      entry("nessebar-021", 18),
      entry("nessebar-012", 19),
      entry("nessebar-003", 20),
      entry("nessebar-024", 21),
      entry("nessebar-004", 22),
      entry("nessebar-025", 23),
      entry("nessebar-017", 24),
      entry("nessebar-018", 25),
      entry("nessebar-beach-below-old-town", 26),
      entry("nessebar-view-from-sandy-beach", 27),
      entry("nessebar-harbor-and-stone-shore", 28),
      entry("nessebar-boats-at-sunset", 29),
      entry("nessebar-old-town-across-bay", 30),
      entry("nessebar-blue-fishing-boat", 31),
      entry("nessebar-brick-church", 32),
      entry("nessebar-windmill-by-water", 33),
    ],
    displayOrder: 4,
    status: "published",
  },
  {
    id: "plovdiv",
    slug: "plovdiv",
    title: title("Пловдив", "Plovdiv"),
    description: title("Кадри от Стария град на Пловдив.", "Photographs from Plovdiv's Old Town."),
    coverPhotoSlug: "plovdiv-011",
    photos: [
      entry("plovdiv-staria-grad", 1),
      ...batchEntries("plovdiv", [1, 3, 2, 5, 4], 2),
      ...batchEntries(
        "plovdiv",
        Array.from({ length: 12 }, (_, index) => index + 6),
        7,
      ),
    ],
    displayOrder: 5,
    status: "published",
  },
  {
    id: "rila",
    slug: "rila",
    title: title("Рила", "Rila"),
    description: title(
      "Планински селища, долини и снежни върхове в Рила.",
      "Mountain towns, valleys and snowy peaks in Rila.",
    ),
    coverPhotoSlug: "rila-008",
    photos: [
      ...batchEntries(
        "rila",
        [19, 7, 1, 11, 3, 8, 5, 14, 2, 16, 9, 17, 6, 18, 4, 15, 12, 20, 10, 13],
      ),
      ...batchEntries(
        "rila",
        Array.from({ length: 18 }, (_, index) => index + 21),
        21,
      ),
    ],
    displayOrder: 6,
    status: "published",
  },
  {
    id: "tunisia",
    slug: "tunisia",
    title: title("Тунис", "Tunisia"),
    description: title(
      "Крайбрежие, пясъчни пейзажи и каменна архитектура от Тунис.",
      "Coast, sandy landscapes and stone architecture from Tunisia.",
    ),
    coverPhotoSlug: "tunisia-018",
    photos: [
      ...batchEntries(
        "tunisia",
        [18, 3, 19, 7, 14, 1, 15, 20, 12, 9, 16, 5, 17, 2, 10, 21, 13, 6, 4, 11, 8, 22],
      ),
      ...batchEntries("tunisia", [23, 24, 25], 23),
    ],
    displayOrder: 7,
    status: "published",
  },
  {
    id: "paris",
    slug: "paris",
    title: title("Париж", "Paris"),
    description: title(
      "Градски панорами, архитектура и детайли от пътуването до Париж.",
      "City panoramas, architecture and details from a journey to Paris.",
    ),
    coverPhotoSlug: "paris-052",
    photos: [
      ...batchEntries(
        "paris",
        [
          54, 2, 48, 7, 13, 4, 49, 5, 6, 1, 3, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22,
          23, 24, 43, 25, 44, 26, 45, 27, 46, 28, 47, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
          40, 41, 42, 50, 51, 52, 53,
        ],
      ),
      ...batchEntries("paris", [55, 56, 57], 55),
    ],
    displayOrder: 8,
    status: "published",
  },
  {
    id: "lyon",
    slug: "lyon",
    title: title("Лион", "Lyon"),
    description: title(
      "Градски пейзажи, архитектура и моменти от Лион, Франция.",
      "Cityscapes, architecture, and moments from Lyon, France.",
    ),
    coverPhotoSlug: "lyon-001",
    photos: batchEntries(
      "lyon",
      Array.from({ length: 24 }, (_, index) => index + 1),
    ),
    displayOrder: 8.5,
    status: "published",
  },
  {
    id: "istanbul",
    slug: "istanbul",
    title: title("Истанбул", "Istanbul"),
    description: title(
      "Босфорът, градските панорами и историческите сгради на Истанбул.",
      "The Bosphorus, city panoramas and historic buildings of Istanbul.",
    ),
    coverPhotoSlug: "istanbul-024",
    photos: [
      ...batchEntries(
        "istanbul",
        [
          24, 4, 8, 26, 22, 25, 1, 2, 15, 16, 17, 18, 19, 20, 21, 5, 6, 7, 12, 13, 14, 23, 9, 10,
          11, 3, 27,
        ],
      ),
      ...batchEntries("istanbul", [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40], 28),
    ],
    displayOrder: 9,
    status: "published",
  },
  {
    id: "edirne",
    slug: "edirne",
    title: title("Одрин", "Edirne"),
    description: title(
      "Архитектура, градски улици и моменти от Одрин, Турция.",
      "Architecture, city streets, and moments from Edirne, Turkey.",
    ),
    coverPhotoSlug: "edirne-006",
    photos: batchEntries(
      "edirne",
      [6, 11, 15, 7, 2, 5, 3, 4, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 1],
    ),
    displayOrder: 9.5,
    status: "published",
  },
  {
    id: "bodrum",
    slug: "bodrum",
    title: title("Бодрум", "Bodrum"),
    description: title(
      "Заливи, лодки и вечерни светлини от Бодрум.",
      "Bays, boats and evening lights from Bodrum.",
    ),
    coverPhotoSlug: "bodrum-013",
    photos: [
      ...batchEntries("bodrum", [10, 1, 8, 4, 5, 2, 6, 9, 12, 7, 3, 11, 14, 13, 15]),
      ...batchEntries("bodrum", [16, 17, 18, 19, 20, 21, 22, 23, 24], 16),
    ],
    displayOrder: 10,
    status: "published",
  },
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
