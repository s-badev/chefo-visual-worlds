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
  places: ["София", "Париж", "Бургас", "Слънчев бряг", "Бодрум", "Тунис"],
  alt: "Колаж от мои снимки от София, Париж, Бургас, Слънчев бряг, Бодрум и Тунис, обединени в една панорама.",
  en: {
    alt: "Collage of my photos from Sofia, Paris, Burgas, Sunny Beach, Bodrum and Tunisia, merged into one panorama.",
  },
} as const;

export const photographyCoverAlt = (locale: Locale) =>
  locale === "en" ? photographyCover.en.alt : photographyCover.alt;

/** Caption places in order; styles.css draws the "·" between them (.photography-cover-caption). */
export const photographyCoverPlaces = (locale: Locale) =>
  photographyCover.places.map((place) => locationLabel(place, locale));
