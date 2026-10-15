import { useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import { albumText, getAlbumCover, getAlbumPhotos, getAlbums, type Album } from "@/content/albums";
import { getEditorialAlbum, type EditorialImage } from "@/content/editorial";
import { Lightbox } from "@/components/site";
import { Surface } from "@/components/surface";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

const imageStyle = (image: EditorialImage): CSSProperties =>
  ({
    "--album-column": image.column ?? "1 / -1",
    "--album-ratio": image.aspectRatio ?? "auto",
    "--album-offset": image.marginTop ?? "0rem",
  }) as CSSProperties;

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
  const previousAlbum = ordered[(position - 1 + ordered.length) % ordered.length];
  const nextAlbum = ordered[(position + 1) % ordered.length];
  const indexBySlug = new Map(items.map((photo, index) => [photo.slug, index]));
  const [lightbox, setLightbox] = useState<number | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const open = (slug: string, trigger: HTMLElement) => {
    const index = indexBySlug.get(slug);
    if (index === undefined) return;
    origin.current = trigger;
    setLightbox(index);
  };

  return (
    <Surface
      tone="light"
      as="article"
      className={`editorial-album editorial-album--${selection.treatment}`}
    >
      <div className="editorial-album-cover">
        {cover && (
          <button
            type="button"
            data-opening-photo-slug={cover.slug}
            aria-label={t.common.openFullscreen(coverPhoto?.title ?? cover.title)}
            onClick={(event) => open(cover.slug, event.currentTarget)}
          >
            <img
              src={cover.image}
              alt={coverPhoto?.alt ?? cover.alt}
              width={cover.width}
              height={cover.height}
              fetchPriority="high"
              decoding="async"
              sizes="100vw"
            />
            <span className="editorial-album-zoom-cue" aria-hidden="true">
              <ZoomIn size={18} />
            </span>
          </button>
        )}
      </div>
      <div className="container-page editorial-album-mast">
        <nav className="editorial-album-breadcrumb" aria-label={t.photos.backToAlbums}>
          <LocaleLink to="/photography" className="editorial-album-back">
            <ArrowLeft size={16} aria-hidden="true" /> {t.photos.backToAlbums}
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
          <a href="#editorial-album-all" className="editorial-album-jump">
            {t.photos.allPhotos} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="editorial-album-stories">
        {selection.chapters.map((chapter, chapterIndex) => (
          <div className="container-page editorial-album-chapter" key={chapterIndex}>
            <div className="editorial-album-spread">
              {chapter.images.map((image) => {
                const index = indexBySlug.get(image.photoSlug);
                if (index === undefined) return null;
                const photo = items[index]!;
                return (
                  <figure
                    key={photo.slug}
                    className={`editorial-album-figure${image.half ? " is-half" : ""}${image.wide ? " is-wide" : ""}`}
                    style={imageStyle(image)}
                  >
                    <button
                      type="button"
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
              })}
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
            <li key={photo.slug}>
              <figure>
                <button
                  type="button"
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
                  <LocaleLink to="/photography/$slug" slug={photo.slug}>
                    {photo.caption ?? photo.title}
                  </LocaleLink>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      <nav className="container-page editorial-album-navigation" aria-label={t.photos.albums}>
        {previousAlbum && (
          <LocaleLink
            to="/photography/albums/$slug"
            slug={previousAlbum.slug}
            aria-label={albumText(previousAlbum.title, locale)}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            <span>{albumText(previousAlbum.title, locale)}</span>
          </LocaleLink>
        )}
        {nextAlbum && (
          <LocaleLink
            to="/photography/albums/$slug"
            slug={nextAlbum.slug}
            aria-label={`${t.photos.nextAlbum}: ${albumText(nextAlbum.title, locale)}`}
          >
            <span>{albumText(nextAlbum.title, locale)}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </LocaleLink>
        )}
      </nav>
      <Lightbox items={items} index={lightbox} onIndex={setLightbox} returnFocusTo={origin} />
    </Surface>
  );
}
