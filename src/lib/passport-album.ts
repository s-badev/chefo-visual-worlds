import { getAlbum } from "@/content/albums";

type PassportAlbum = "plovdiv" | "sofia" | "istanbul" | "paris" | "lyon" | "edirne";

/** Owner-approved next destination for each real album; never the current preview. */
export const PASSPORT_ALBUMS: Readonly<Record<string, PassportAlbum>> = {
  sofia: "plovdiv",
  "sunny-beach": "istanbul",
  "sveti-vlas": "istanbul",
  nessebar: "istanbul",
  burgas: "istanbul",
  plovdiv: "sofia",
  rila: "sofia",
  tunisia: "paris",
  paris: "lyon",
  lyon: "paris",
  istanbul: "edirne",
  edirne: "istanbul",
  bodrum: "istanbul",
};

/** Reuse the target album's canonical BG/EN title and route slug. */
export const passportAlbum = (albumSlug: string) =>
  getAlbum(PASSPORT_ALBUMS[albumSlug] ?? "plovdiv")!;
