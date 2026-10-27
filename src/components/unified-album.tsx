import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ZoomIn } from "lucide-react";
import { albumText, getAlbumCover, getAlbumPhotos, getAlbums, type Album } from "@/content/albums";
import { getPilotEditorialAlbum } from "@/content/editorial";
import {
  createHighlightBasis,
  createMosaicPlan,
  mosaicCss,
  type MosaicBreakpoint,
} from "@/content/album-mosaic";
import type { Photo } from "@/content/photos";
import { Lightbox } from "@/components/site";
import { Surface } from "@/components/surface";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export { ALBUM_BATCH_SIZE } from "@/content/album-mosaic";

function FullGallery({
  items,
  open,
}: {
  items: Photo[];
  open: (slug: string, trigger: HTMLElement) => void;
}) {
  const { t } = useT();
  const plan = useMemo(() => createMosaicPlan(items), [items]);
  const [shown, setShown] = useState(plan.batchEnds[0] ?? 0);
  const gallery = useRef<HTMLUListElement | null>(null);
  const finalFocusIndex = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (finalFocusIndex.current === null) return;
    const target = gallery.current?.querySelector<HTMLButtonElement>(
      `button[data-full-index="${finalFocusIndex.current}"]`,
    );
    finalFocusIndex.current = null;
    target?.focus({ preventScroll: true });
    if (target) {
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 0 || bounds.top >= window.innerHeight) {
        target.scrollIntoView({ block: "nearest" });
      }
    }
  }, [shown]);

  const showMore = () => {
    const next = plan.batchEnds.find((end) => end > shown) ?? items.length;
    if (next === items.length) finalFocusIndex.current = shown;
    setShown(next);
  };

  const batchIndex = plan.batchEnds.findIndex((end) => end === shown);
  const galleryStyle = Object.fromEntries(
    (Object.keys(plan.revealHeights) as MosaicBreakpoint[]).map((mode) => [
      `--mosaic-${mode}-height`,
      mosaicCss(plan.revealHeights[mode][batchIndex]!),
    ]),
  ) as CSSProperties;

  return (
    <section
      className="container-page unified-album-gallery"
      aria-labelledby="unified-gallery-title"
    >
      <div className="unified-album-section-head">
        <h2 id="unified-gallery-title">{t.photos.fullGallery}</h2>
        <p>{t.photos.count(items.length)}</p>
      </div>
      <ul className="unified-album-grid" ref={gallery} style={galleryStyle}>
        {items.slice(0, shown).map((photo, index) => (
          <li
            key={photo.slug}
            data-mosaic-mobile-row={plan.cells.mobile[index]?.row}
            data-mosaic-smalltablet-row={plan.cells.smallTablet[index]?.row}
            data-mosaic-mediumtablet-row={plan.cells.mediumTablet[index]?.row}
            data-mosaic-tablet-row={plan.cells.tablet[index]?.row}
            data-mosaic-desktop-row={plan.cells.desktop[index]?.row}
            data-mosaic-mobile-block={plan.cells.mobile[index]?.block}
            data-mosaic-smalltablet-block={plan.cells.smallTablet[index]?.block}
            data-mosaic-mediumtablet-block={plan.cells.mediumTablet[index]?.block}
            data-mosaic-tablet-block={plan.cells.tablet[index]?.block}
            data-mosaic-desktop-block={plan.cells.desktop[index]?.block}
            data-mosaic-mobile-stack={plan.cells.mobile[index]?.stackPosition}
            data-mosaic-smalltablet-stack={plan.cells.smallTablet[index]?.stackPosition}
            data-mosaic-mediumtablet-stack={plan.cells.mediumTablet[index]?.stackPosition}
            data-mosaic-tablet-stack={plan.cells.tablet[index]?.stackPosition}
            data-mosaic-desktop-stack={plan.cells.desktop[index]?.stackPosition}
            style={
              Object.fromEntries(
                (Object.keys(plan.cells) as MosaicBreakpoint[]).flatMap((mode) => {
                  const cell = plan.cells[mode][index]!;
                  return (["x", "y", "width", "height"] as const).map((property) => [
                    `--mosaic-${mode}-${property}`,
                    mosaicCss(cell[property]),
                  ]);
                }),
              ) as CSSProperties
            }
          >
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
                <span className="unified-album-zoom-cue" aria-hidden="true">
                  <ZoomIn size={18} />
                </span>
              </button>
            </figure>
          </li>
        ))}
      </ul>
      <div className="unified-album-progress">
        <output aria-live="polite" aria-atomic="true">
          {t.photos.shownCount(shown, items.length)}
        </output>
        {shown < items.length && (
          <button type="button" className="action-pill unified-album-show-more" onClick={showMore}>
            {t.photos.showMore} <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

/** Shared Phase 2D album UI; Paris and Istanbul retain their editorial renderer. */
export function UnifiedAlbumView({ album, view }: { album: Album; view: "highlights" | "all" }) {
  const { t, locale } = useT();
  const selection = getPilotEditorialAlbum(album.slug);
  if (!selection) throw new Error(`Missing pilot editorial selection for ${album.slug}`);
  const items = getAlbumPhotos(album, locale);
  const cover = getAlbumCover(album);
  const coverPhoto = items.find((photo) => photo.slug === cover?.slug);
  const indexBySlug = new Map(items.map((photo, index) => [photo.slug, index]));
  // Wide curated frames remain full-width; consecutive smaller frames share
  // proportional rows without changing the published highlight sequence.
  const highlightStyles = new Map<string, CSSProperties>();
  const highlightItems = selection.highlights.slice(1);
  for (let start = 0; start < highlightItems.length;) {
    if (highlightItems[start]?.role === "wide") {
      start++;
      continue;
    }
    let end = start + 1;
    while (end < highlightItems.length && highlightItems[end]?.role !== "wide") end++;
    const segment = highlightItems
      .slice(start, end)
      .map((item) => items[indexBySlug.get(item.photoSlug) ?? -1])
      .filter((photo): photo is Photo => Boolean(photo));
    // Sveti Vlas keeps its four curated photos, but gives each landscape and
    // following portrait a proportional row instead of squeezing all four together.
    const groups =
      album.slug === "sveti-vlas" ? [segment.slice(0, 2), segment.slice(2)] : [segment];
    for (const group of groups) {
      if (!group.length) continue;
      const plan = createHighlightBasis(group);
      group.forEach((photo, index) =>
        highlightStyles.set(photo.slug, {
          "--highlight-tablet-basis": plan.tablet[index],
          "--highlight-desktop-basis": plan.desktop[index],
          "--mosaic-grow": photo.width / photo.height,
        } as CSSProperties),
      );
    }
    start = end;
  }
  const [lightbox, setLightbox] = useState<number | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const ordered = getAlbums();
  const position = ordered.findIndex((item) => item.slug === album.slug);
  const nextAlbum = ordered[(position + 1) % ordered.length];
  const open = (slug: string, trigger: HTMLElement) => {
    const index = indexBySlug.get(slug);
    if (index === undefined) return;
    origin.current = trigger;
    setLightbox(index);
  };
  const route = locale === "en" ? "/en/photography/albums/$slug" : "/photography/albums/$slug";

  return (
    <Surface
      tone="light"
      as="article"
      className={`unified-album unified-album--${selection.variant}`}
    >
      <div className="unified-album-cover">
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
              style={
                selection.coverObjectPosition
                  ? { objectPosition: selection.coverObjectPosition }
                  : undefined
              }
              fetchPriority="high"
              decoding="async"
              sizes="100vw"
            />
            <span className="unified-album-zoom-cue" aria-hidden="true">
              <ZoomIn size={18} />
            </span>
          </button>
        )}
      </div>
      <div className="container-page unified-album-mast">
        <nav aria-label={t.photos.backToAlbums}>
          <LocaleLink to="/photography" className="back-pill unified-album-back">
            <span className="back-pill-badge" aria-hidden="true">
              <ArrowLeft size={18} />
            </span>
            {t.photos.backToAlbums}
          </LocaleLink>
        </nav>
        <div className="unified-album-heading">
          <p className="eyebrow text-eyebrow">{t.photos.eyebrow}</p>
          <h1>{albumText(album.title, locale)}</h1>
        </div>
        <div className="unified-album-intro">
          <p>{albumText(album.description, locale)}</p>
          <strong>{t.photos.count(items.length)}</strong>
        </div>
      </div>
      <nav className="container-page unified-album-view-nav" aria-label={t.photos.albumViews}>
        <Link
          to={route}
          params={{ slug: album.slug }}
          search={(previous) => ({ ...previous, view: undefined })}
          activeOptions={{ exact: true, includeSearch: true, explicitUndefined: true }}
          replace={view === "highlights"}
          resetScroll={false}
          aria-current={view === "highlights" ? "page" : undefined}
        >
          {t.photos.highlights}
        </Link>
        <Link
          to={route}
          params={{ slug: album.slug }}
          search={(previous) => ({ ...previous, view: "all" })}
          activeOptions={{ exact: true, includeSearch: true, explicitUndefined: true }}
          replace={view === "all"}
          resetScroll={false}
          aria-current={view === "all" ? "page" : undefined}
        >
          {t.photos.fullGallery}
        </Link>
      </nav>
      {view === "all" ? (
        <FullGallery key={album.slug} items={items} open={open} />
      ) : (
        <section
          className="container-page unified-album-highlights"
          aria-label={t.photos.highlights}
        >
          {selection.highlights.slice(1).map((highlight) => {
            const index = indexBySlug.get(highlight.photoSlug);
            if (index === undefined) return null;
            const photo = items[index]!;
            return (
              <figure
                className={`unified-album-highlight unified-album-highlight--${highlight.role}`}
                key={photo.slug}
                style={highlightStyles.get(photo.slug)}
              >
                <button
                  type="button"
                  data-highlight-photo-slug={photo.slug}
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
                    sizes={highlight.role === "wide" ? "100vw" : "(min-width: 768px) 45vw, 90vw"}
                  />
                  <span className="unified-album-zoom-cue" aria-hidden="true">
                    <ZoomIn size={18} />
                  </span>
                </button>
                <figcaption>{photo.caption ?? photo.title}</figcaption>
              </figure>
            );
          })}
          <div className="unified-album-gallery-action">
            <Link
              to={route}
              params={{ slug: album.slug }}
              search={(previous) => ({ ...previous, view: "all" })}
              resetScroll={false}
              className="action-pill unified-album-gallery-link"
            >
              {t.photos.fullGallery} <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
      {nextAlbum && (
        <nav className="container-page unified-album-next" aria-label={t.photos.nextAlbum}>
          <LocaleLink
            to="/photography/albums/$slug"
            slug={nextAlbum.slug}
            className="next-album-card"
            aria-label={`${t.photos.nextAlbum}: ${albumText(nextAlbum.title, locale)}`}
          >
            <span className="next-album-card-text">
              <span className="eyebrow text-eyebrow">{t.photos.nextAlbum}</span>
              <span className="next-album-card-name">{albumText(nextAlbum.title, locale)}</span>
            </span>
            <span className="next-album-card-arrow" aria-hidden="true">
              <ArrowRight size={18} />
            </span>
          </LocaleLink>
        </nav>
      )}
      <Lightbox items={items} index={lightbox} onIndex={setLightbox} returnFocusTo={origin} />
    </Surface>
  );
}
