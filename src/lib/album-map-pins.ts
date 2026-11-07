/*
 * Pin lookups for the albums map (loaded only with the lazy map chunk and in tests).
 */
import {
  COAST_PIN_SLUG,
  FLIGHT_ENTRY,
  MAP_PINS_BALKANS,
  MAP_PINS_EUROPE,
  type MapPoint,
} from "@/content/album-map";
import { ALBUM_PLACES } from "@/content/album-places";

export type MapLayer = "europe" | "balkans";

export const mapLayerOf = (slug: string): MapLayer =>
  ALBUM_PLACES[slug]?.layer === "europe" ? "europe" : "balkans";

export const isCoastSlug = (slug: string): boolean => Boolean(ALBUM_PLACES[slug]?.coast);

/** The pin an album uses on the Europe/Balkans layers (coast albums share one). */
export const pinSlugOf = (slug: string): string => (isCoastSlug(slug) ? COAST_PIN_SLUG : slug);

/** The album's pin on a layer, or null when that layer has no pin for it. */
export function pinPoint(layer: MapLayer, slug: string): MapPoint | null {
  const table = layer === "europe" ? MAP_PINS_EUROPE : MAP_PINS_BALKANS;
  return table[pinSlugOf(slug)] ?? null;
}

/** A coast album's own pin inside the lens (Balkans coordinates). */
export const lensPoint = (slug: string): MapPoint | null =>
  isCoastSlug(slug) ? (MAP_PINS_BALKANS[slug] ?? null) : null;

/** Where a flight to `slug` starts: the previous album on the target layer, else the layer edge. */
export function flightStart(prevSlug: string | null, slug: string): MapPoint {
  const layer = mapLayerOf(slug);
  return (prevSlug ? pinPoint(layer, prevSlug) : null) ?? FLIGHT_ENTRY[layer];
}
