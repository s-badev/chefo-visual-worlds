import type { Locale } from "@/i18n";

/**
 * Photography page cover: the owner's own collage, not an album photograph, so it has its own
 * files and alt text. It carries no visible caption.
 */
export const photographyCover = {
  image: "/covers/photography-journey-cover-2000.webp",
  srcSet:
    "/covers/photography-journey-cover-1200.webp 1200w, /covers/photography-journey-cover-2000.webp 2000w",
  width: 2000,
  height: 673,
  objectPosition: "50% 50%",
  alt: "Колаж от мои снимки от София, Париж, Бургас, Слънчев бряг, Бодрум и Тунис, обединени в една панорама.",
  en: {
    alt: "Collage of my photos from Sofia, Paris, Burgas, Sunny Beach, Bodrum and Tunisia, merged into one panorama.",
  },
} as const;

export const photographyCoverAlt = (locale: Locale) =>
  locale === "en" ? photographyCover.en.alt : photographyCover.alt;
