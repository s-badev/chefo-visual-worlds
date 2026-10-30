import { ArrowLeft, ArrowRight } from "lucide-react";
import { albumText, type Album } from "@/content/albums";
import { getPilotEditorialAlbum } from "@/content/editorial";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

const albumCardCovers: Record<string, { image: string; width: number; height: number }> = {
  sofia: { image: "/photos/sofia/sofia-cover-card.webp", width: 720, height: 405 },
  "sunny-beach": {
    image: "/photos/sunny-beach/sunny-beach-cover-card.webp",
    width: 720,
    height: 405,
  },
  "sveti-vlas": {
    image: "/photos/sveti-vlas/sveti-vlas-cover-card.webp",
    width: 720,
    height: 405,
  },
  nessebar: { image: "/photos/nessebar/nessebar-cover-card.webp", width: 720, height: 405 },
  plovdiv: { image: "/photos/plovdiv/plovdiv-cover-card.webp", width: 720, height: 480 },
  rila: { image: "/photos/rila/rila-cover-card.webp", width: 720, height: 405 },
  tunisia: { image: "/photos/tunisia/tunisia-cover-card.webp", width: 720, height: 405 },
  paris: { image: "/photos/paris/paris-cover-card.webp", width: 720, height: 405 },
  lyon: { image: "/photos/lyon/lyon-cover-card.webp", width: 720, height: 405 },
  istanbul: { image: "/photos/istanbul/istanbul-cover-card.webp", width: 720, height: 405 },
  edirne: { image: "/photos/edirne/edirne-cover-card.webp", width: 720, height: 480 },
  bodrum: { image: "/photos/bodrum/bodrum-cover-card.webp", width: 720, height: 405 },
};

export function NextAlbumCard({
  album,
  direction = "next",
}: {
  album: Album;
  direction?: "previous" | "next";
}) {
  const { t, locale } = useT();
  const cover = albumCardCovers[album.slug];
  const coverPosition = getPilotEditorialAlbum(album.slug)?.coverObjectPosition;
  const label = direction === "previous" ? t.photos.previousAlbum : t.photos.nextAlbum;
  const Arrow = direction === "previous" ? ArrowLeft : ArrowRight;
  const arrow = (
    <span className="next-album-card-arrow" aria-hidden="true">
      <Arrow size={18} />
    </span>
  );

  return (
    <LocaleLink
      to="/photography/albums/$slug"
      slug={album.slug}
      className={`interaction-card next-album-card next-album-card--${direction} ${cover ? "next-album-card--image" : "next-album-card--fallback"}`}
      aria-label={`${label}: ${albumText(album.title, locale)}`}
    >
      {cover && (
        <img
          className="next-album-card-cover"
          src={cover.image}
          alt=""
          width={cover.width}
          height={cover.height}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
          style={coverPosition ? { objectPosition: coverPosition } : undefined}
        />
      )}
      <span className="next-album-card-shade" aria-hidden="true" />
      {direction === "previous" && arrow}
      <span className="next-album-card-text">
        <span className="next-album-card-eyebrow">{label}</span>
        <span className="next-album-card-name">{albumText(album.title, locale)}</span>
      </span>
      {direction === "next" && arrow}
    </LocaleLink>
  );
}
