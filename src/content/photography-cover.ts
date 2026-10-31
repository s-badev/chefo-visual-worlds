import type { Locale } from "@/i18n";
import { locationLabel } from "./photos";

/**
 * Photography page cover: the owner's own collage, not an album photograph, so it has its own
 * file, alt text and caption. Places use the photo registry's names (English via LOCATION_EN).
 */
export const photographyCover = {
  image: "/covers/photography-journey-cover-2000.webp",
  srcSet:
    "/covers/photography-journey-cover-1200.webp 1200w, /covers/photography-journey-cover-2000.webp 2000w",
  width: 2000,
  height: 673,
  objectPosition: "50% 50%",
  places: ["София", "Париж", "Слънчев бряг", "Бодрум", "Тунис"],
  alt: "Колаж от мои снимки от София, Париж, Слънчев бряг, Бодрум и Тунис, обединени в една панорама.",
  en: {
    alt: "Collage of my photos from Sofia, Paris, Sunny Beach, Bodrum and Tunisia, merged into one panorama.",
  },
} as const;

export const photographyCoverAlt = (locale: Locale) =>
  locale === "en" ? photographyCover.en.alt : photographyCover.alt;

/**
 * "София · Париж · …": a line may only break after a separator, never inside a place name, and
 * the last two places stay together so a wrapped caption never ends on a lone word.
 */
export const photographyCoverCaption = (locale: Locale) => {
  const labels = photographyCover.places.map((place) =>
    locationLabel(place, locale).replaceAll(" ", "\u00a0"),
  );
  const last = labels.pop();
  return `${labels.join("\u00a0· ")}\u00a0·\u00a0${last}`;
};
