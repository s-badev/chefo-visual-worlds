// Local content layer for photography.
// Shape mirrors a future database table `photos` — replace items or swap the
// getters below for a real fetch later.
// TODO: replace the imported sample images with your real photos (same field: `image`).
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

export interface Photo {
  slug: string;
  title: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  location: string;
  category: PhotoCategory;
  date: string; // ISO date
  story: string;
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
    location: "Несебър", category: "Море", date: "2025-08-14",
    // TODO: напишете истинската история зад кадъра
    story: "Място за вашата история: какво ви накара да спрете точно тук и какво се случваше в този момент.",
    device: "Телефон — добавете модел",
    en: { title: "Golden hour over the old town", alt: "Old Nesebar with wooden houses and stone walls above the sea at sunset", story: "Space for your story: what made you stop right here and what was happening at that moment.", device: "Phone — add the model" },
  },
  {
    slug: "sofia-tramvay-12",
    title: "Трамвай 12 при здрач",
    image: sofiaTram, width: 1024, height: 1280,
    alt: "Жълт трамвай по мокри павета в София при здрач, на фона куполите на катедралата",
    location: "София", category: "Град", date: "2025-03-02",
    story: "Място за вашата история за този кадър от София.",
    en: { title: "Tram 12 at dusk", alt: "A yellow tram on wet cobblestones in Sofia at dusk, with the cathedral domes in the background", story: "Space for your story about this shot from Sofia." },
  },
  {
    slug: "nesebar-vyatarnata-melnitsa",
    title: "Вятърната мелница",
    image: nesebarWindmill, width: 1280, height: 960,
    alt: "Дървената вятърна мелница на провлака на Несебър при оранжев залез",
    location: "Несебър", category: "Залези", date: "2025-07-28",
    story: "Място за вашата история за този залез.",
    en: { title: "The windmill", alt: "The wooden windmill on the Nesebar isthmus at an orange sunset", story: "Space for your story about this sunset." },
  },
  {
    slug: "plovdiv-staria-grad",
    title: "Улица в Стария град",
    image: plovdiv, width: 1024, height: 1280,
    alt: "Цветни възрожденски къщи и калдаръмена улица в Стария Пловдив",
    location: "Пловдив", category: "Пътувания", date: "2024-10-19",
    story: "Място за вашата история от Пловдив.",
    en: { title: "A street in the Old Town", alt: "Colourful Revival-era houses and a cobbled street in Old Plovdiv", story: "Space for your story from Plovdiv." },
  },
  {
    slug: "sofia-nevski-sinya-chas",
    title: "Синият час на Невски",
    image: sofiaCathedral, width: 1280, height: 960,
    alt: "Катедралата Александър Невски, осветена в синия час",
    location: "София", category: "Град", date: "2024-11-05",
    story: "Място за вашата история за този кадър.",
    en: { title: "Nevsky at blue hour", alt: "The Alexander Nevsky Cathedral lit up at blue hour", story: "Space for your story about this shot." },
  },
  {
    slug: "slanchev-bryag-zalez",
    title: "Последните минути на деня",
    image: sunnySunset, width: 1280, height: 864,
    alt: "Силуети на хора по брега на Слънчев бряг на фона на оранжев залез",
    location: "Слънчев бряг", category: "Залези", date: "2025-08-03",
    story: "Място за вашата история от плажа.",
    en: { title: "The last minutes of the day", alt: "Silhouettes of people on the shore of Sunny Beach against an orange sunset", story: "Space for your story from the beach." },
  },
  {
    slug: "nesebar-hram-pantokrator",
    title: "Камък и тухла",
    image: nesebarChurch, width: 1024, height: 1280,
    alt: "Средновековна църква от камък и тухла в Несебър на калдъръмен площад",
    location: "Несебър", category: "Пътувания", date: "2025-08-15",
    story: "Място за вашата история за този храм.",
    en: { title: "Stone and brick", alt: "A medieval stone-and-brick church on a cobbled square in Nesebar", story: "Space for your story about this church." },
  },
  {
    slug: "patyat-na-yug",
    title: "Пътят на юг",
    image: road, width: 1280, height: 864,
    alt: "Виещ се планински път в мъгла с малко село в долината",
    location: "Пловдив", category: "Пътувания", date: "2024-10-21",
    story: "Място за вашата история от пътуването.",
    en: { title: "The road south", alt: "A winding mountain road in mist with a small village in the valley", story: "Space for your story from the trip." },
  },
];

export const getPhoto = (slug: string) => photos.find((p) => p.slug === slug);

const CATEGORY_EN: Record<PhotoCategory, string> = { Море: "Sea", Град: "City", Залези: "Sunsets", Пътувания: "Travels" };
const LOCATION_EN: Record<string, string> = { Несебър: "Nesebar", София: "Sofia", Пловдив: "Plovdiv", "Слънчев бряг": "Sunny Beach" };

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
