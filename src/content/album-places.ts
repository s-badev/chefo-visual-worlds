export type AlbumPlace = {
  lat: number;
  lon: number;
  layer: "europe" | "balkans";
  coast?: true;
};

/** Geographic coordinates and map layer for every photography destination album. */
export const ALBUM_PLACES: Record<string, AlbumPlace> = {
  sofia: { lat: 42.7, lon: 23.32, layer: "balkans" },
  "sunny-beach": { lat: 42.69, lon: 27.71, layer: "balkans", coast: true },
  "sveti-vlas": { lat: 42.71, lon: 27.76, layer: "balkans", coast: true },
  nessebar: { lat: 42.66, lon: 27.73, layer: "balkans", coast: true },
  burgas: { lat: 42.5, lon: 27.47, layer: "balkans", coast: true },
  plovdiv: { lat: 42.14, lon: 24.75, layer: "balkans" },
  rila: { lat: 42.13, lon: 23.34, layer: "balkans" },
  tunisia: { lat: 36.81, lon: 10.18, layer: "europe" },
  paris: { lat: 48.86, lon: 2.35, layer: "europe" },
  lyon: { lat: 45.76, lon: 4.84, layer: "europe" },
  istanbul: { lat: 41.01, lon: 28.98, layer: "balkans" },
  edirne: { lat: 41.68, lon: 26.56, layer: "balkans" },
  bodrum: { lat: 37.04, lon: 27.43, layer: "europe" },
};
