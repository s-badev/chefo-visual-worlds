import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import { AlbumStamp } from "@/components/album-stamp";
import { albumText, getAlbums, type Album } from "@/content/albums";
import type { Photo } from "@/content/photos";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

/** The album stamp's ink on the dark cover (the mock's stampSVG(i, 120, "#F1DFB5")). */
export const ALBUM_HERO_STAMP_INK = "#F1DFB5";

/**
 * The top of an album page, as in the approved mock (.ah): the cover fills the band and slides
 * under the transparent header; the way back, the title, the description and the count sit on
 * the photograph above a navy scrim, the album's passport stamp beside them.
 */
export function AlbumHero({
  album,
  cover,
  coverAlt,
  count,
  objectPosition,
  coverClassName,
}: {
  album: Album;
  cover: Photo | undefined;
  coverAlt: string | undefined;
  count: number;
  objectPosition?: string | undefined;
  /** The page's own cover hook (unified-album-cover / editorial-album-cover). */
  coverClassName?: string | undefined;
}) {
  const { t, locale } = useT();
  const albums = getAlbums();
  const index = Math.max(
    0,
    albums.findIndex((item) => item.slug === album.slug),
  );
  const imageStyle: CSSProperties | undefined = objectPosition ? { objectPosition } : undefined;
  return (
    <section
      data-header-theme="dark"
      className="album-hero surface-dark"
      aria-labelledby="album-title"
    >
      {/* While this strip is in view the header stays transparent over the cover (SiteHeader). */}
      <div aria-hidden="true" data-header-sentinel className="album-hero-sentinel" />
      <div className={coverClassName ? `album-hero-media ${coverClassName}` : "album-hero-media"}>
        {cover && (
          <img
            className="album-hero-image"
            data-opening-photo-slug={cover.slug}
            src={cover.image}
            alt={coverAlt ?? cover.alt}
            width={cover.width}
            height={cover.height}
            style={imageStyle}
            fetchPriority="high"
            decoding="async"
            sizes="100vw"
          />
        )}
      </div>
      <div className="album-hero-in">
        <div className="album-hero-copy">
          <nav aria-label={t.photos.backToAlbums}>
            <LocaleLink to="/photography" className="interaction-control album-hero-back">
              <span className="album-hero-back-badge" aria-hidden="true">
                <ArrowLeft size={16} />
              </span>
              {t.photos.backToAlbums}
            </LocaleLink>
          </nav>
          <h1 id="album-title" tabIndex={-1}>
            {albumText(album.title, locale)}
          </h1>
          <p className="album-hero-text">{albumText(album.description, locale)}</p>
          <p className="album-hero-meta">
            <span>{t.photos.count(count)}</span>
          </p>
        </div>
        <div className="album-hero-stamp" aria-hidden="true">
          <AlbumStamp
            index={index}
            title={albumText(album.title, "en")}
            slug={album.slug}
            count={count}
            total={albums.length}
            size={120}
            ink={ALBUM_HERO_STAMP_INK}
          />
        </div>
      </div>
    </section>
  );
}
