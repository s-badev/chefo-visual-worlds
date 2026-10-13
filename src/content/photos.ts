// Local content layer for photography.
// Shape mirrors a future database table `photos` — replace items or swap the
// getters below for a real fetch later.
// Keep existing imports. New local files can use /photos/<album>/<filename>
// after placing them in public/photos/<album>/.
import sofiaCathedral from "@/assets/photo-sofia-cathedral.jpg";
import plovdiv from "@/assets/photo-plovdiv.jpg";
import road from "@/assets/photo-road.jpg";
import { batchPhotos } from "./batch-photos";
import { istanbulPhotos } from "./istanbul-photos";
import { parisPhotos } from "./paris-photos";
import { lyonPhotos } from "./lyon-photos";
import { rilaAdditions } from "./rila-additions";
import { sofiaAdditions } from "./sofia-additions";
import { plovdivAdditions } from "./plovdiv-additions";
import { edirneAdditions } from "./edirne-additions";
import { sunnyBeachPhotos } from "./sunny-beach-photos";
import { fourAlbumAdditions } from "./four-album-additions";
import { fourNewAlbumPhotos } from "./four-new-album-photos";
import { svetiVlasAdditions } from "./sveti-vlas-additions";
import type { Locale } from "@/i18n";

export const PHOTO_CATEGORIES = ["Море", "Град", "Залези", "Пътувания"] as const;
export const PHOTO_LOCATIONS = [
  "Несебър",
  "София",
  "Пловдив",
  "Слънчев бряг",
  "Свети Влас",
  "Рила",
  "Тунис",
  "Париж",
  "Лион",
  "Истанбул",
  "Бодрум",
] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];
export const PHOTO_THEMES = ["sea", "city", "sunsets", "nature", "architecture", "travel"] as const;
export type PhotoTheme = (typeof PHOTO_THEMES)[number];

const THEME_LABELS: Record<PhotoTheme, { bg: string; en: string }> = {
  sea: { bg: "Море", en: "Sea" },
  city: { bg: "Град", en: "City" },
  sunsets: { bg: "Залези", en: "Sunsets" },
  nature: { bg: "Природа", en: "Nature" },
  architecture: { bg: "Архитектура", en: "Architecture" },
  travel: { bg: "Пътувания", en: "Travel" },
};

export const photoThemeLabel = (theme: PhotoTheme, locale: Locale) => THEME_LABELS[theme][locale];

export interface Photo {
  slug: string;
  title: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  location: string;
  category: PhotoCategory;
  /** Verified visual subjects; a photograph may match more than one theme. */
  themes: PhotoTheme[];
  date?: string | undefined; // ISO date, only when verified
  story?: string | undefined;
  device?: string | undefined;
  /** CSS object-position for cropped previews, e.g. "50% 30%" */
  objectPosition?: string;
  caption?: string | undefined;
  /** English version; missing fields fall back to Bulgarian. */
  en?: Partial<Pick<Photo, "title" | "alt" | "story" | "device" | "caption">> | undefined;
}

/** Numbered slugs match the optimized, EXIF-free files in public/photos/nessebar. */
const nessebarPhoto = (
  number: number,
  width: number,
  height: number,
  title: [bg: string, en: string],
  alt: [bg: string, en: string],
  category: PhotoCategory,
  themes: PhotoTheme[],
): Photo => {
  const slug = `nessebar-${String(number).padStart(3, "0")}`;
  return {
    slug,
    image: `/photos/nessebar/${slug}.webp`,
    width,
    height,
    title: title[0],
    alt: alt[0],
    location: "Несебър",
    category,
    themes,
    en: { title: title[1], alt: alt[1] },
  };
};

const newNessebarPhotos: Photo[] = [
  nessebarPhoto(
    1,
    2000,
    1125,
    ["Брегът отвъд вълнолома", "Coast beyond the breakwater"],
    [
      "Широк изглед към морето, скалистия вълнолом и сградите на отсрещния бряг",
      "Wide view of the sea, a rocky breakwater and buildings along the opposite shore",
    ],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    2,
    1125,
    2000,
    ["Море и камъни", "Sea and stones"],
    [
      "Вертикален изглед към морето, камъните на брега и сградите на хоризонта",
      "Portrait view of the sea, shoreline rocks and buildings on the horizon",
    ],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    3,
    2000,
    1125,
    ["Слънце над морето", "Sun over the sea"],
    [
      "Ниско слънце над спокойна морска вода с отражение до брега",
      "Low sun over calm seawater, its reflection reaching the shore",
    ],
    "Залези",
    ["sea", "sunsets"],
  ),
  nessebarPhoto(
    4,
    1125,
    2000,
    ["Птица над залеза", "Bird above the sunset"],
    [
      "Птица в полет над залязващото слънце и морето",
      "A bird in flight above the setting sun and the sea",
    ],
    "Залези",
    ["sea", "sunsets", "nature"],
  ),
  nessebarPhoto(
    5,
    2000,
    1125,
    ["Лодки край кея", "Boats by the quay"],
    [
      "Малки лодки до крайбрежен кей с море на заден план",
      "Small boats by a waterfront quay with the sea behind them",
    ],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    6,
    2000,
    1125,
    ["Къщи над пристана", "Houses above the harbor"],
    [
      "Къщи по крайбрежието и малки лодки в пристанището",
      "Waterfront houses and small boats in the harbor",
    ],
    "Пътувания",
    ["sea", "architecture", "travel"],
  ),
  nessebarPhoto(
    7,
    2000,
    1125,
    ["Лодки при вълнолома", "Boats at the breakwater"],
    [
      "Няколко лодки до вълнолома под светло небе",
      "Several boats beside the breakwater under a bright sky",
    ],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    8,
    2000,
    1125,
    ["Тихо пристанище", "Quiet harbor"],
    ["Малки лодки в тиха пристанищна вода", "Small boats in still harbor water"],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    9,
    1737,
    2000,
    ["Пристанище от високо", "Harbor from above"],
    [
      "Вертикален изглед от високо към лодки, кей и морски залив",
      "Portrait view from above of boats, a quay and a sea bay",
    ],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    10,
    2000,
    1125,
    ["Крайбрежни къщи и лодки", "Coastal houses and boats"],
    [
      "Къщи над водата и малки лодки край брега",
      "Houses above the water and small boats near the shore",
    ],
    "Пътувания",
    ["sea", "architecture", "travel"],
  ),
  nessebarPhoto(
    11,
    2000,
    1125,
    ["Тихият бряг", "A quiet shoreline"],
    [
      "Спокоен морски бряг с тесен плаж и къщи сред дърветата",
      "Quiet seashore with a narrow beach and houses among trees",
    ],
    "Море",
    ["sea", "nature"],
  ),
  nessebarPhoto(
    12,
    2000,
    1125,
    ["Лодка в златната светлина", "Boat in golden light"],
    [
      "Лодка на преден план и слънчево отражение върху морето",
      "Boat in the foreground and sunlight reflected on the sea",
    ],
    "Залези",
    ["sea", "sunsets"],
  ),
  nessebarPhoto(
    13,
    2000,
    1125,
    ["Чайки по каменния бряг", "Gulls on the rocky shore"],
    ["Чайки върху светли камъни край синьото море", "Gulls on pale rocks beside the blue sea"],
    "Море",
    ["sea", "nature"],
  ),
  nessebarPhoto(
    14,
    2000,
    1001,
    ["Чайка на пясъка", "Gull on the sand"],
    [
      "Чайка на пясъчен бряг с море и крайбрежие зад нея",
      "Gull on a sandy shore with the sea and coastline behind it",
    ],
    "Море",
    ["sea", "nature"],
  ),
  nessebarPhoto(
    15,
    2000,
    1125,
    ["Къщи и лодки край водата", "Houses and boats by the water"],
    [
      "Лодки в пристанището пред къщи по брега",
      "Boats in the harbor in front of waterfront houses",
    ],
    "Пътувания",
    ["sea", "architecture", "travel"],
  ),
  nessebarPhoto(
    16,
    2000,
    1125,
    ["Алея покрай морето", "Walkway by the sea"],
    ["Крайбрежна алея с дървета и морски хоризонт", "Seaside walkway with trees and a sea horizon"],
    "Пътувания",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    17,
    2000,
    1125,
    ["Вечер над пристана", "Evening over the harbor"],
    [
      "Лодки в пристанището под меката светлина на вечерното небе",
      "Boats in the harbor beneath the soft light of the evening sky",
    ],
    "Залези",
    ["sea", "sunsets"],
  ),
  nessebarPhoto(
    18,
    2000,
    1125,
    ["Последна светлина над водата", "Last light over the water"],
    [
      "Тънка ивица топла светлина над пристанищната вода след залез",
      "A thin band of warm light above harbor water after sunset",
    ],
    "Залези",
    ["sea", "sunsets"],
  ),
  nessebarPhoto(
    19,
    1126,
    2000,
    ["Мелницата над камъните", "Windmill above the rocks"],
    ["Дървена вятърна мелница зад каменист морски бряг", "Wooden windmill beyond a rocky seashore"],
    "Пътувания",
    ["sea", "architecture", "travel"],
  ),
  nessebarPhoto(
    20,
    2000,
    1126,
    ["Скалите край морето", "Rocks beside the sea"],
    [
      "Скали на преден план и нисък бряг отвъд синята вода",
      "Rocks in the foreground and a low shoreline across blue water",
    ],
    "Море",
    ["sea", "nature"],
  ),
  nessebarPhoto(
    21,
    2000,
    1126,
    ["Лодки в спокойна вода", "Boats in calm water"],
    [
      "Малки лодки, отразени в спокойната вода на пристанището",
      "Small boats reflected in calm harbor water",
    ],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    22,
    1126,
    2000,
    ["Лодка пред пристана", "Boat by the harbor"],
    [
      "Малка лодка на преден план и платноходки до кея",
      "Small boat in the foreground and sailboats by the quay",
    ],
    "Море",
    ["sea", "travel"],
  ),
  nessebarPhoto(
    23,
    1126,
    2000,
    ["Къща на калдъръмената улица", "House on a cobbled street"],
    ["Фасада на къща над калдъръмена улица", "Facade of a house above a cobbled street"],
    "Пътувания",
    ["city", "architecture", "travel"],
  ),
  nessebarPhoto(
    24,
    1126,
    2000,
    ["Слънце над скалистия бряг", "Sun over the rocky shore"],
    [
      "Залязващо слънце над морето и тъмни камъни на преден план",
      "Setting sun over the sea with dark rocks in the foreground",
    ],
    "Залези",
    ["sea", "sunsets"],
  ),
  nessebarPhoto(
    25,
    1126,
    2000,
    ["Лодки на залез", "Boats at sunset"],
    [
      "Малки лодки на преден план, морска вода и ниско слънце над хоризонта",
      "Small boats in the foreground, seawater and a low sun above the horizon",
    ],
    "Залези",
    ["sea", "sunsets"],
  ),
];

export const photos: Photo[] = [
  {
    slug: "plovdiv-staria-grad",
    title: "Улица в Стария град",
    image: plovdiv,
    width: 1024,
    height: 1280,
    alt: "Цветни възрожденски къщи и калдаръмена улица в Стария Пловдив",
    location: "Пловдив",
    category: "Пътувания",
    themes: ["city", "architecture", "travel"],
    en: {
      title: "A street in the Old Town",
      alt: "Colourful Revival-era houses and a cobbled street in Old Plovdiv",
    },
  },
  {
    slug: "sofia-nevski-sinya-chas",
    title: "Синият час на Невски",
    image: sofiaCathedral,
    width: 1280,
    height: 960,
    alt: "Катедралата Александър Невски, осветена в синия час",
    location: "София",
    category: "Град",
    themes: ["city", "architecture"],
    en: { title: "Nevsky at blue hour", alt: "The Alexander Nevsky Cathedral lit up at blue hour" },
  },
  {
    slug: "patyat-na-yug",
    title: "Пътят на юг",
    image: road,
    width: 1280,
    height: 864,
    alt: "Виещ се планински път в мъгла с малко село в долината",
    location: "Неуточнено",
    category: "Пътувания",
    themes: ["nature", "travel"],
    en: {
      title: "The road south",
      alt: "A winding mountain road in mist with a small village in the valley",
    },
  },
  ...newNessebarPhotos,
  ...batchPhotos,
  ...istanbulPhotos,
  ...parisPhotos,
  ...fourNewAlbumPhotos,
  ...lyonPhotos,
  ...rilaAdditions,
  ...sofiaAdditions,
  ...plovdivAdditions,
  ...edirneAdditions,
  ...sunnyBeachPhotos,
  ...fourAlbumAdditions,
  ...svetiVlasAdditions,
];

export const getPhoto = (slug: string) => photos.find((p) => p.slug === slug);

const CATEGORY_EN: Record<PhotoCategory, string> = {
  Море: "Sea",
  Град: "City",
  Залези: "Sunsets",
  Пътувания: "Travels",
};
const LOCATION_EN: Record<string, string> = {
  Несебър: "Nesebar",
  София: "Sofia",
  Пловдив: "Plovdiv",
  "Слънчев бряг": "Sunny Beach",
  "Свети Влас": "Sveti Vlas",
  Рила: "Rila",
  Тунис: "Tunisia",
  Париж: "Paris",
  Лион: "Lyon",
  Истанбул: "Istanbul",
  Бодрум: "Bodrum",
  Неуточнено: "Unspecified",
};

export const photoCategoryLabel = (c: string, locale: Locale) =>
  locale === "en" ? (CATEGORY_EN[c as PhotoCategory] ?? c) : c;
export const locationLabel = (l: string, locale: Locale) =>
  locale === "en" ? (LOCATION_EN[l] ?? l) : l;

/** Photo with text fields in the requested language (ids/slugs unchanged). */
export const localizePhoto = (p: Photo, locale: Locale): Photo => {
  if (locale === "bg") return p;
  const e = p.en ?? {};
  return {
    ...p,
    title: e.title ?? p.title,
    alt: e.alt ?? p.alt,
    story: e.story ?? p.story,
    device: e.device ?? p.device,
    caption: e.caption ?? p.caption,
    location: locationLabel(p.location, locale),
    category: p.category,
  };
};
