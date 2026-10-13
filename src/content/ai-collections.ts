// Curated AI collections. Like albums, they only reference completed works by slug.
// The curatorial intros are editable copy.
import { getPublishedDestinationSlugs } from "./ai-destinations";
import { getAiWork, localizeAiWork, type AiWork } from "./ai-works";
import type { Locale } from "@/i18n";

type LocalizedText = { bg: string; en: string };

export interface AiCollection {
  slug: string;
  order: number;
  title: LocalizedText;
  /** Short line under the title, e.g. "One Face. Many Cultures." */
  tagline?: LocalizedText;
  intro: LocalizedText;
  /**
   * "destinations": the collection is the atlas in ai-destinations.ts; its finished works
   * are the published destination portraits, so `works` stays empty.
   */
  kind?: "destinations";
  /** Selected published work used as the cover; null while the collection has no finished work. */
  coverWorkSlug: string | null;
  /** Completed works in exhibition order; other works remain in All Artworks. */
  works: string[];
}

const text = (bg: string, en: string): LocalizedText => ({ bg, en });

export const aiCollections: AiCollection[] = [
  {
    slug: "historical-eras-rulers",
    order: 1,
    title: text("Исторически епохи и владетели", "Historical Eras & Rulers"),
    intro: text(
      "Короните, кадифето и маслените бои на отминали векове. Портрети, в които влизам в ролята на владетели и личности от историята.",
      "Crowns, velvet and the oil paint of past centuries. Portraits in which I step into the roles of rulers and figures from history.",
    ),
    coverWorkSlug: "chefo-srednovekoven-ritsar",
    works: ["chefo-srednovekoven-ritsar", "renesansov-portret"],
  },
  {
    slug: "professions-roles",
    order: 2,
    title: text("Професии и роли", "Professions & Roles"),
    intro: text(
      "Портрети, които изследват идентичността през различни професионални роли.",
      "Portraits exploring identity through different professional roles.",
    ),
    coverWorkSlug: "chefo-taxi-driver",
    works: [
      "chefo-barber",
      "chefo-beach-bartender",
      "chefo-ticket-inspector",
      "chefo-taxi-driver",
      "chefo-econt-courier",
      "chefo-rakia-distiller",
      "chefo-ac-technician",
      "chefo-doner-chef",
      "chefo-nightclub-security",
      "chefo-fisherman",
      "chefo-market-vendor",
      "chefo-auto-mechanic",
      "chefo-coffee-break",
      "chefo-baker",
    ],
  },
  {
    slug: "cinema-archetypes",
    order: 3,
    title: text("Кино архетипи", "Cinema Archetypes"),
    intro: text(
      "Кинематографична светлина, характер и истории, пресъздадени чрез AI.",
      "Cinematic light, character and stories reimagined through AI.",
    ),
    coverWorkSlug: "chefo-v-badeshteto",
    works: ["chefo-v-badeshteto"],
  },
  {
    slug: "chefo-around-the-world",
    order: 4,
    kind: "destinations",
    title: text("По света", "Around the World"),
    tagline: text("Едно лице. Много култури.", "One Face. Many Cultures."),
    intro: text(
      "Пътешествие през 12 дестинации, в които облеклото, прическите и атмосферата се променят, но лицето остава същото. Различни култури, епохи и светове, пресъздадени с AI.",
      "A journey across 12 destinations where clothing, hairstyles, and atmosphere change, but the face remains the same. Different cultures, eras, and worlds reimagined with AI.",
    ),
    coverWorkSlug: null,
    works: [],
  },
];

export const collectionText = (value: LocalizedText, locale: Locale) => value[locale];

export const getAiCollections = () => aiCollections.slice().sort((a, b) => a.order - b.order);

export const getAiCollection = (slug: string) => aiCollections.find((c) => c.slug === slug);

/** Keep old collection links useful without keeping the retired halls in the exhibition. */
export const isRetiredAiCollectionSlug = (slug: string) =>
  slug === "fantasy-space" || slug === "retro-collages";

/** Slugs of a collection's finished works (for the atlas: its published destinations). */
export const getCollectionWorkSlugs = (collection: AiCollection) =>
  collection.kind === "destinations" ? getPublishedDestinationSlugs() : collection.works;

/** Completed works of a collection, localized, in exhibition order. */
export const getCollectionWorks = (collection: AiCollection, locale: Locale): AiWork[] =>
  getCollectionWorkSlugs(collection).flatMap((slug) => {
    const work = getAiWork(slug);
    return work ? [localizeAiWork(work, locale)] : [];
  });

export const getCollectionCover = (collection: AiCollection, locale: Locale) => {
  const slug = collection.coverWorkSlug ?? getCollectionWorkSlugs(collection)[0];
  const work = slug ? getAiWork(slug) : undefined;
  return work ? localizeAiWork(work, locale) : undefined;
};

export const getCollectionForWork = (workSlug: string) =>
  aiCollections.find((c) => getCollectionWorkSlugs(c).includes(workSlug));

/** Neighbouring collections for exhibition navigation (wraps around). */
export const getAdjacentCollections = (collection: AiCollection) => {
  const ordered = getAiCollections();
  const i = ordered.findIndex((c) => c.slug === collection.slug);
  return {
    prev: ordered[(i - 1 + ordered.length) % ordered.length]!,
    next: ordered[(i + 1) % ordered.length]!,
  };
};
