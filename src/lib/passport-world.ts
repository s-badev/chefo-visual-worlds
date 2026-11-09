import { WORLD_SLIDES } from "@/content/world-slider";

export type PassportWorld = "sofia" | "istanbul" | "paris";

/** Owner-approved destination for each real album; keep the mapping in one place. */
export const PASSPORT_WORLDS: Readonly<Record<string, PassportWorld>> = {
  sofia: "sofia",
  "sunny-beach": "istanbul",
  "sveti-vlas": "istanbul",
  nessebar: "istanbul",
  burgas: "istanbul",
  plovdiv: "sofia",
  rila: "sofia",
  tunisia: "paris",
  paris: "paris",
  lyon: "paris",
  istanbul: "istanbul",
  edirne: "istanbul",
  bodrum: "istanbul",
};

export const passportWorld = (albumSlug: string): PassportWorld =>
  PASSPORT_WORLDS[albumSlug] ?? "sofia";

export const validateWorld = (value: unknown): PassportWorld | undefined =>
  value === "sofia" || value === "istanbul" || value === "paris" ? value : undefined;

/** The slider already owns the localized city names; the CTA reuses that canonical copy. */
export const passportWorldSlide = (albumSlug: string) =>
  WORLD_SLIDES.find((world) => world.slug === passportWorld(albumSlug))!;
