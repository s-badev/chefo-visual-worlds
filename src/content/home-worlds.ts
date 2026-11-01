// Home "One face, four worlds": one front-facing portrait per AI collection, with its eyes
// measured so the face can be held at the same place while the worlds change.
import { getAiCollections, type AiCollection } from "./ai-collections";
import { getAiWork, type AiWork } from "./ai-works";

/**
 * Pupils in the image's natural pixels: the midpoint between them (mx, my) and their distance d.
 * Measured by hand on 5-8x crops with a pixel grid (2026-11-01).
 */
export interface EyeAnchor {
  mx: number;
  my: number;
  d: number;
}

export interface WorldPortrait {
  collection: AiCollection;
  work: AiWork;
  eyes: EyeAnchor;
}

/**
 * Collection -> portrait. The taxi driver is the professions cover. The other three covers are
 * 1.9-2.2 MB PNGs (the knight is also turned three-quarters), so each uses the nearest
 * front-facing WebP work of the same collection with both eyes clearly visible.
 */
export const WORLD_PORTRAITS: Record<string, { workSlug: string; eyes: EyeAnchor }> = {
  "historical-eras-rulers": {
    workSlug: "medieval-bulgarian-tsar-in-throne-hall",
    // Pupils (486.5, 331) and (610, 354).
    eyes: { mx: 548.25, my: 342.5, d: 125.62 },
  },
  "professions-roles": {
    workSlug: "chefo-taxi-driver",
    // Pupils (488, 287) and (565.5, 305.5).
    eyes: { mx: 526.75, my: 296.25, d: 79.68 },
  },
  "cinema-archetypes": {
    workSlug: "escape-in-the-rain",
    // Pupils (527.5, 406.5) and (643, 424.5).
    eyes: { mx: 585.25, my: 415.5, d: 116.89 },
  },
  "chefo-around-the-world": {
    workSlug: "chefo-rainy-new-york",
    // Pupils (471, 279) and (576, 289.5).
    eyes: { mx: 523.5, my: 284.25, d: 105.52 },
  },
};

/** The four worlds in collection order; a collection without a measured portrait is skipped. */
export const getWorldPortraits = (): WorldPortrait[] =>
  getAiCollections().flatMap((collection) => {
    const entry = WORLD_PORTRAITS[collection.slug];
    const work = entry && getAiWork(entry.workSlug);
    return entry && work ? [{ collection, work, eyes: entry.eyes }] : [];
  });
