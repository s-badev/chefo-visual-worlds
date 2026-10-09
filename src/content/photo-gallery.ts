import { getAlbumPhotos, getAlbums, getPublishedAlbums, type Album } from "./albums";
import { localizePhoto, photos, type Photo, type PhotoTheme } from "./photos";
import type { Locale } from "@/i18n";

export interface GalleryPhoto {
  photo: Photo;
  albumSlug: string | null;
}

export interface PhotoFilters {
  theme?: PhotoTheme | undefined;
  location?: string | undefined;
}

/** Every real photo appears once; unassigned photos remain discoverable under All. */
export function getAllGalleryPhotos(locale: Locale): GalleryPhoto[] {
  const assigned = getPublishedAlbums().flatMap((album) =>
    getAlbumPhotos(album, locale).map((photo) => ({ photo, albumSlug: album.slug })),
  );
  const seen = new Set<string>();
  const uniqueAssigned = assigned.filter((item) => {
    if (seen.has(item.photo.slug)) return false;
    seen.add(item.photo.slug);
    return true;
  });
  const unassigned = photos
    .filter((photo) => !seen.has(photo.slug))
    .map((photo) => ({ photo: localizePhoto(photo, locale), albumSlug: null }));
  return [...uniqueAssigned, ...unassigned];
}

export const getPhotoLocations = (): Album[] => getAlbums();

export function filterGalleryPhotos(items: GalleryPhoto[], filters: PhotoFilters): GalleryPhoto[] {
  return items.filter(
    ({ photo, albumSlug }) =>
      (!filters.theme || photo.themes.includes(filters.theme)) &&
      (!filters.location || albumSlug === filters.location),
  );
}
