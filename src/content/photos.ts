// Local content layer for photography.
// Shape mirrors a future database table `photos` — replace items or swap the
// getters below for a real fetch later.
// Keep existing imports. New local files can use /photos/<album>/<filename>
// after placing them in public/photos/<album>/.
import nesebarCoast from "@/assets/photo-nesebar-coast.jpg";
import nesebarChurch from "@/assets/photo-nesebar-church.jpg";
import nesebarWindmill from "@/assets/photo-nesebar-windmill.jpg";
import sofiaCathedral from "@/assets/photo-sofia-cathedral.jpg";
import sofiaTram from "@/assets/photo-sofia-tram.jpg";
import plovdiv from "@/assets/photo-plovdiv.jpg";
import sunnySunset from "@/assets/photo-sunny-sunset.jpg";
import road from "@/assets/photo-road.jpg";
import type { Locale } from "@/i18n";

export const PHOTO_CATEGORIES = ["Море", "Град", "Залези", "Пътувания"] as const;
export const PHOTO_LOCATIONS = ["Несебър", "София", "Пловдив", "Слънчев бряг"] as const;
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

export const photos: Photo[] = [
  {
    slug: "nesebar-zlaten-chas",
    title: "Златен час над стария град",
    image: nesebarCoast, width: 1280, height: 1600,
    alt: "Старият Несебър с дървени къщи и каменни стени над морето при залез",
    location: "Несебър", category: "Море", themes: ["sea", "sunsets", "architecture"],
    en: { title: "Golden hour over the old town", alt: "Old Nesebar with wooden houses and stone walls above the sea at sunset" },
  },
  {
    slug: "sofia-tramvay-12",
    title: "Трамвай 12 при здрач",
    image: sofiaTram, width: 1024, height: 1280,
    alt: "Жълт трамвай по мокри павета в София при здрач, на фона куполите на катедралата",
    location: "София", category: "Град", themes: ["city"],
    en: { title: "Tram 12 at dusk", alt: "A yellow tram on wet cobblestones in Sofia at dusk, with the cathedral domes in the background" },
  },
  {
    slug: "nesebar-vyatarnata-melnitsa",
    title: "Вятърната мелница",
    image: nesebarWindmill, width: 1280, height: 960,
    alt: "Дървената вятърна мелница на провлака на Несебър при оранжев залез",
    location: "Несебър", category: "Залези", themes: ["sunsets", "architecture"],
    en: { title: "The windmill", alt: "The wooden windmill on the Nesebar isthmus at an orange sunset" },
  },
  {
    slug: "plovdiv-staria-grad",
    title: "Улица в Стария град",
    image: plovdiv, width: 1024, height: 1280,
    alt: "Цветни възрожденски къщи и калдаръмена улица в Стария Пловдив",
    location: "Пловдив", category: "Пътувания", themes: ["city", "architecture", "travel"],
    en: { title: "A street in the Old Town", alt: "Colourful Revival-era houses and a cobbled street in Old Plovdiv" },
  },
  {
    slug: "sofia-nevski-sinya-chas",
    title: "Синият час на Невски",
    image: sofiaCathedral, width: 1280, height: 960,
    alt: "Катедралата Александър Невски, осветена в синия час",
    location: "София", category: "Град", themes: ["city", "architecture"],
    en: { title: "Nevsky at blue hour", alt: "The Alexander Nevsky Cathedral lit up at blue hour" },
  },
  {
    slug: "slanchev-bryag-zalez",
    title: "Последните минути на деня",
    image: sunnySunset, width: 1280, height: 864,
    alt: "Силуети на хора по брега на Слънчев бряг на фона на оранжев залез",
    location: "Слънчев бряг", category: "Залези", themes: ["sea", "sunsets"],
    en: { title: "The last minutes of the day", alt: "Silhouettes of people on the shore of Sunny Beach against an orange sunset" },
  },
  {
    slug: "nesebar-hram-pantokrator",
    title: "Камък и тухла",
    image: nesebarChurch, width: 1024, height: 1280,
    alt: "Средновековна църква от камък и тухла в Несебър на калдъръмен площад",
    location: "Несебър", category: "Пътувания", themes: ["architecture", "travel"],
    en: { title: "Stone and brick", alt: "A medieval stone-and-brick church on a cobbled square in Nesebar" },
  },
  {
    slug: "patyat-na-yug",
    title: "Пътят на юг",
    image: road, width: 1280, height: 864,
    alt: "Виещ се планински път в мъгла с малко село в долината",
    location: "Неуточнено", category: "Пътувания", themes: ["nature", "travel"],
    en: { title: "The road south", alt: "A winding mountain road in mist with a small village in the valley" },
  },
];

export const getPhoto = (slug: string) => photos.find((p) => p.slug === slug);

const CATEGORY_EN: Record<PhotoCategory, string> = { Море: "Sea", Град: "City", Залези: "Sunsets", Пътувания: "Travels" };
const LOCATION_EN: Record<string, string> = { Несебър: "Nesebar", София: "Sofia", Пловдив: "Plovdiv", "Слънчев бряг": "Sunny Beach", Неуточнено: "Unspecified" };

export const photoCategoryLabel = (c: string, locale: Locale) => (locale === "en" ? CATEGORY_EN[c as PhotoCategory] ?? c : c);
export const locationLabel = (l: string, locale: Locale) => (locale === "en" ? LOCATION_EN[l] ?? l : l);

/** Photo with text fields in the requested language (ids/slugs unchanged). */
export const localizePhoto = (p: Photo, locale: Locale): Photo => {
  if (locale === "bg") return p;
  const e = p.en ?? {};
  return {
    ...p,
    title: e.title ?? p.title, alt: e.alt ?? p.alt, story: e.story ?? p.story,
    device: e.device ?? p.device, caption: e.caption ?? p.caption,
    location: locationLabel(p.location, locale), category: p.category,
  };
};
