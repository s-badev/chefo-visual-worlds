import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowLeft, ZoomIn } from "lucide-react";
import { albumText, getAlbumCover, getAlbumPhotos, getAlbums, type Album } from "@/content/albums";
import { getPilotEditorialAlbum } from "@/content/editorial";
import {
  createHighlightBasis,
  createMosaicPlan,
  mosaicCss,
  mosaicInsetCss,
  type MosaicBreakpoint,
} from "@/content/album-mosaic";
import type { Photo } from "@/content/photos";
import { Lightbox } from "@/components/site";
import { Surface } from "@/components/surface";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { NextAlbumCard } from "@/components/next-album-card";

function FullGallery({
  items,
  open,
  sectionRef,
}: {
  items: Photo[];
  open: (slug: string, trigger: HTMLElement) => void;
  sectionRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useT();
  const plan = useMemo(() => createMosaicPlan(items), [items]);
  const galleryStyle = Object.fromEntries(
    (Object.keys(plan.height) as MosaicBreakpoint[]).map((mode) => [
      `--mosaic-${mode}-height`,
      mosaicCss(plan.height[mode]),
    ]),
  ) as CSSProperties;

  return (
    <section
      className="container-page unified-album-gallery"
      aria-labelledby="unified-gallery-title"
      id="all-photos"
      ref={sectionRef}
    >
      <div className="unified-album-section-head">
        <h2 id="unified-gallery-title">{t.photos.allPhotos}</h2>
        <p>{t.photos.count(items.length)}</p>
      </div>
      <ul className="unified-album-grid" style={galleryStyle}>
        {items.map((photo, index) => (
          <li
            key={photo.slug}
            style={
              Object.fromEntries(
                (Object.keys(plan.cells) as MosaicBreakpoint[]).map((mode) => {
                  const cell = plan.cells[mode][index]!;
                  return [`--mosaic-${mode}`, mosaicInsetCss(plan.height[mode], cell)];
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
  for (let start = 0; start < highlightItems.length; ) {
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
  const allPhotos = useRef<HTMLElement | null>(null);
  const ordered = getAlbums();
  const position = ordered.findIndex((item) => item.slug === album.slug);
  const previousAlbum = position > 0 ? ordered[position - 1] : undefined;
  const nextAlbum = position >= 0 && position < ordered.length - 1 ? ordered[position + 1] : undefined;
  const open = (slug: string, trigger: HTMLElement) => {
    const index = indexBySlug.get(slug);
    if (index === undefined) return;
    origin.current = trigger;
    setLightbox(index);
  };

  useEffect(() => {
    if (view !== "all") return;
    let settle: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      const target = allPhotos.current;
      if (!target) return;
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const align = (behavior: ScrollBehavior) => {
        const stickyHeader = document.querySelector<HTMLElement>("header.sticky");
        const offset = (stickyHeader?.getBoundingClientRect().height ?? 64) + 16;
        const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset);
        window.scrollTo({ top, behavior });
      };
      align(reducedMotion ? "instant" : "smooth");
      if (!reducedMotion) settle = window.setTimeout(() => align("auto"), 800);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (settle !== undefined) window.clearTimeout(settle);
    };
  }, [album.slug, view]);

  return (
    <Surface
      tone="light"
      as="article"
      className={`unified-album unified-album--${selection.variant}`}
    >
      <div className="unified-album-cover">
        {cover && (
          <img
            data-opening-photo-slug={cover.slug}
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
      <section className="container-page unified-album-highlights" aria-label={t.photos.highlights}>
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
      </section>
      <FullGallery key={album.slug} items={items} open={open} sectionRef={allPhotos} />
      {(previousAlbum || nextAlbum) && (
        <nav
          className={`container-page album-navigation unified-album-next${previousAlbum && nextAlbum ? "" : " album-navigation--single"}`}
          aria-label={t.photos.albums}
        >
          {previousAlbum && <NextAlbumCard album={previousAlbum} direction="previous" />}
          {nextAlbum && <NextAlbumCard album={nextAlbum} />}
        </nav>
      )}
      <Lightbox items={items} index={lightbox} onIndex={setLightbox} returnFocusTo={origin} />
    </Surface>
  );
}
