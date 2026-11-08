import type { LightboxItem } from "@/components/lightbox";
import type { Photo } from "@/content/photos";
import { formatDate, type Locale } from "@/i18n";

/** A photograph in the viewer: its gold eyebrow line is the album, the date and the camera. */
export const photoLightboxItem = (
  photo: Photo,
  album: string | undefined,
  locale: Locale,
): LightboxItem => ({
  ...photo,
  meta: [album ?? photo.location, photo.date && formatDate(photo.date, locale), photo.device]
    .filter(Boolean)
    .join(" · "),
});
