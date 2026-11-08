import { useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import { albumText, getAlbumCover, getAlbumPhotos, getAlbums, type Album } from "@/content/albums";
import { getChapterRows, getEditorialAlbum, type EditorialImage } from "@/content/editorial";
import { Lightbox } from "@/components/site";
import { Surface } from "@/components/surface";
import { NextAlbumCard } from "@/components/next-album-card";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { albumThumb } from "@/lib/lightbox";
import { photoLightboxItem } from "@/lib/lightbox-items";

const ratioValue = (ratio: EditorialImage["aspectRatio"]) => {
  if (!ratio) return 1;
  const [width, height] = ratio.split("/").map(Number);
  return width! / height!;
};

/** Justified rows: the grow factor equals the frame ratio, so every image in a row is equally tall. */
const justifiedStyle = (image: EditorialImage): CSSProperties =>
  ({
    "--album-ratio": image.aspectRatio ?? "auto",
    "--album-grow": String(ratioValue(image.aspectRatio)),
  }) as CSSProperties;

const toRows = <T,>(images: readonly T[], rows: readonly number[]) => {
  let start = 0;
  return rows.map((count) => images.slice(start, (start += count)));
};

/** Ratio sum and count let CSS cap a row's height; rows with a wide image stay uncapped. */
const rowStyle = (row: readonly EditorialImage[]): CSSProperties | undefined =>
  row.some((image) => image.wide)
    ? undefined
    : ({
        "--row-ratio": String(row.reduce((sum, image) => sum + ratioValue(image.aspectRatio), 0)),
        "--row-count": String(row.length),
      } as CSSProperties);

/** Paris and Istanbul only. Photo records and the complete gallery order stay in albums.ts. */
export function EditorialAlbumView({ album }: { album: Album }) {
  const { t, locale } = useT();
  const selection = getEditorialAlbum(album.slug);
  if (!selection) throw new Error(`Missing editorial selection for ${album.slug}`);
  const items = getAlbumPhotos(album, locale);
  const cover = getAlbumCover(album);
  const coverPhoto = items.find((photo) => photo.slug === cover?.slug);
  const ordered = getAlbums();
  const position = ordered.findIndex((item) => item.slug === album.slug);
  const previousAlbum = position > 0 ? ordered[position - 1] : undefined;
  const nextAlbum = position >= 0 && position < ordered.length - 1 ? ordered[position + 1] : undefined;
  const indexBySlug = new Map(items.map((photo, index) => [photo.slug, index]));
  const [lightbox, setLightbox] = useState<number | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const open = (slug: string, trigger: HTMLElement) => {
    const index = indexBySlug.get(slug);
    if (index === undefined) return;
    origin.current = trigger;
    setLightbox(index);
  };
  const renderFigure = (image: EditorialImage, style: CSSProperties) => {
    const index = indexBySlug.get(image.photoSlug);
    if (index === undefined) return null;
    const photo = items[index]!;
    return (
      <figure
        key={photo.slug}
        className={`editorial-album-figure${image.half ? " is-half" : ""}${image.wide ? " is-wide" : ""}`}
        style={style}
      >
        <button
          type="button"
          className="interaction-media"
          data-curated-photo-slug={photo.slug}
          data-full-index={index}
          aria-label={t.common.openFullscreen(photo.title)}
          onClick={(event) => open(photo.slug, event.currentTarget)}
        >
          <span className="editorial-album-image-frame">
            <img
              src={photo.image}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              loading="lazy"
              decoding="async"
              sizes={image.wide ? "100vw" : "(min-width: 900px) 65vw, 100vw"}
            />
            <span className="editorial-album-zoom-cue" aria-hidden="true">
              <ZoomIn size={18} />
            </span>
          </span>
        </button>
        <figcaption>{photo.caption ?? photo.title}</figcaption>
      </figure>
    );
  };

  return (
    <Surface
      tone="light"
      as="article"
      className={`editorial-album editorial-album--${selection.treatment}`}
    >
      <div className="editorial-album-cover">
        {cover && (
          <img
            data-opening-photo-slug={cover.slug}
            src={cover.image}
            alt={coverPhoto?.alt ?? cover.alt}
            width={cover.width}
            height={cover.height}
            fetchPriority="high"
            decoding="async"
            sizes="100vw"
          />
        )}
      </div>
      <div className="container-page editorial-album-mast">
        <nav className="editorial-album-breadcrumb" aria-label={t.photos.backToAlbums}>
          <LocaleLink to="/photography" className="interaction-control back-pill editorial-album-back">
            <span className="back-pill-badge" aria-hidden="true">
              <ArrowLeft size={18} />
            </span>
            {t.photos.backToAlbums}
          </LocaleLink>
        </nav>
        <div>
          <p className="eyebrow text-eyebrow">{t.photos.eyebrow}</p>
          <h1>{albumText(album.title, locale)}</h1>
        </div>
        <div className="editorial-album-intro">
          <p>{albumText(album.description, locale)}</p>
          <div className="editorial-album-meta">
            <strong>{t.photos.count(items.length)}</strong>
            {cover && (
              <span>{items.find((photo) => photo.slug === cover.slug)?.title ?? cover.title}</span>
            )}
          </div>
          <a href="#editorial-album-all" className="interaction-link interaction-text-button editorial-album-jump">
            {t.photos.allPhotos} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="editorial-album-stories">
        {selection.chapters.map((chapter, chapterIndex) => (
          <div className="container-page editorial-album-chapter" key={chapterIndex}>
            <div className="editorial-album-spread is-justified">
              {toRows(chapter.images, getChapterRows(chapter)).map((row, rowIndex) => (
                <div className="editorial-album-row" key={rowIndex} style={rowStyle(row)}>
                  {row.map((image) => renderFigure(image, justifiedStyle(image)))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section
        className="container-page editorial-album-all"
        id="editorial-album-all"
        aria-labelledby="editorial-album-all-title"
      >
        <div className="editorial-album-all-head">
          <h2 id="editorial-album-all-title">{t.photos.allPhotos}</h2>
          <p>{t.photos.count(items.length)}</p>
        </div>
        <ul className="editorial-album-all-grid">
          {items.map((photo, index) => (
            <li
              key={photo.slug}
              style={{ "--gallery-ratio": String(photo.width / photo.height) } as CSSProperties}
            >
              <figure>
                <button
                  type="button"
                  className="interaction-media"
                  data-album-photo-slug={photo.slug}
                  data-full-index={index}
                  aria-label={t.common.openFullscreen(photo.title)}
                  onClick={(event) => open(photo.slug, event.currentTarget)}
                >
                  <img
                    src={photo.image}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1200px) 22vw, (min-width: 768px) 30vw, 48vw"
                  />
                  <span className="editorial-album-zoom-cue" aria-hidden="true">
                    <ZoomIn size={18} />
                  </span>
                </button>
                <figcaption>
                  <LocaleLink to="/photography/$slug" slug={photo.slug} className="interaction-link">
                    {photo.caption ?? photo.title}
                  </LocaleLink>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <nav
        className={`container-page album-navigation editorial-album-navigation${previousAlbum && nextAlbum ? "" : " album-navigation--single"}`}
        aria-label={t.photos.albums}
      >
        {previousAlbum && (
          <NextAlbumCard album={previousAlbum} direction="previous" />
        )}
        {nextAlbum && <NextAlbumCard album={nextAlbum} />}
      </nav>
      <Lightbox
        items={items.map((photo) =>
          photoLightboxItem(photo, albumText(album.title, locale), locale),
        )}
        index={lightbox}
        onIndex={setLightbox}
        returnFocusTo={origin}
        getThumb={(index) => albumThumb(origin.current, index)}
      />
    </Surface>
  );
}
