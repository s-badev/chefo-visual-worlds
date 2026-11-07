/**
 * Pin positions for the Photography albums map, keyed by album slug. Same 600x400 Web Mercator
 * viewBox as the geometry in `album-map.generated.ts` (approved mock tables `EU` and `RG`).
 * Which layer an album belongs to and whether it sits on the coast come from `ALBUM_PLACES`.
 */
export type MapPoint = readonly [number, number];

/** Europe layer: every album has a pin here (coast albums share the Sunny Beach pin). */
export const MAP_PINS_EUROPE: Readonly<Record<string, MapPoint>> = {
  sofia: [399.8, 207.7],
  "sunny-beach": [464, 207.9],
  "sveti-vlas": [464.8, 207.5],
  nessebar: [464.3, 208.5],
  burgas: [460.5, 211.7],
  plovdiv: [420.7, 218.8],
  rila: [400.1, 219],
  tunisia: [207.5, 319.9],
  paris: [92.9, 78.3],
  lyon: [129.4, 145.2],
  istanbul: [482.6, 240.9],
  edirne: [447.2, 227.9],
  bodrum: [460, 315.7],
};

/** Balkans layer (and the coast lens, which uses the same coordinates): Balkan albums only. */
export const MAP_PINS_BALKANS: Readonly<Record<string, MapPoint>> = {
  sofia: [75.6, 141.1],
  "sunny-beach": [436.4, 142.3],
  "sveti-vlas": [440.5, 140],
  nessebar: [438.1, 145.6],
  burgas: [416.7, 163.5],
  plovdiv: [193.2, 203.5],
  rila: [77.3, 204.6],
  istanbul: [540.8, 327.7],
  edirne: [341.9, 254.3],
};

/** Coast albums share this album's pin on the Europe and Balkans layers. */
export const COAST_PIN_SLUG = "sunny-beach";

/** Label offsets inside the coast lens: [dx, dy, text-anchor]. */
export const LENS_LABEL_OFFSETS: Readonly<
  Record<string, readonly [number, number, "start" | "end"]>
> = {
  "sunny-beach": [-1.4, -1.6, "end"],
  "sveti-vlas": [1.4, -1.4, "start"],
  nessebar: [1.6, 1.8, "start"],
  burgas: [1.6, 1.2, "start"],
};

/** The Europe layer's country label for Bulgaria. */
export const BULGARIA_LABEL: MapPoint = [388, 196];

/** Balkans-layer label that ends at its pin instead of starting there (east edge). */
export const BALKANS_LABEL_END = new Set(["istanbul"]);

/** Where the plane enters a layer when the previous album has no pin on it. */
export const FLIGHT_ENTRY: Readonly<Record<"europe" | "balkans", MapPoint>> = {
  europe: [640, 200],
  balkans: [-30, 60],
};
