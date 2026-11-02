import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { albumText, getAlbum, getAlbumCover, getAlbums, type Album } from "@/content/albums";
import { photographyCover, photographyCoverAlt } from "@/content/photography-cover";
import { getPhoto, localizePhoto } from "@/content/photos";
import { Surface } from "@/components/surface";
import { useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import {
  ALBUM_PREVIEW,
  previewSource,
  pushLayer,
  settleLayers,
  warmSlugs,
  wipeDirection,
  type PreviewLayer,
} from "@/lib/album-preview";

/** The album's preview image: its cover, else its first photo, else a typographic panel. */
const previewOf = (album: Album) => {
  const first = album.photos.slice().sort((a, b) => a.order - b.order)[0];
  return previewSource(getAlbumCover(album), first ? getPhoto(first.photoSlug) : undefined);
};

const previewStyle = {
  "--preview-top": `${ALBUM_PREVIEW.headerRem + ALBUM_PREVIEW.stickyGapRem}rem`,
  "--preview-wipe-ms": `${ALBUM_PREVIEW.wipeMs}ms`,
  "--preview-ease": ALBUM_PREVIEW.ease,
  "--preview-zoom-from": ALBUM_PREVIEW.zoomFrom,
  "--preview-zoom-ms": `${ALBUM_PREVIEW.zoomMs}ms`,
} as CSSProperties;

const listStyle = {
  "--row-slide": `${ALBUM_PREVIEW.rowSlidePx}px`,
  "--arrow-slide": `${ALBUM_PREVIEW.arrowSlidePx}px`,
} as CSSProperties;

/** One stacked preview layer; layers after the first wipe in from the side the pointer came from. */
function PreviewLayerView({ layer, locale }: { layer: PreviewLayer; locale: Locale }) {
  const { t } = useT();
  const album = getAlbum(layer.slug);
  if (!album) return null;
  const source = previewOf(album);
  return (
    <div className="photography-editorial-preview-layer" data-dir={layer.dir ?? undefined}>
      {source.kind === "photo" ? (
        <img
          src={source.photo.image}
          alt=""
          width={source.photo.width}
          height={source.photo.height}
          loading={layer.key === 0 ? "lazy" : "eager"}
          decoding="async"
          sizes="(min-width: 1024px) 45vw, 1px"
        />
      ) : (
        <div className="photography-editorial-preview-type">
          <em>{albumText(album.title, locale)}</em>
          <span>{t.photos.count(album.photos.length)}</span>
        </div>
      )}
    </div>
  );
}

/** P1 presentation. Published copy and covers remain in the production registries. */
export function PhotographyEditorial({ onAllPhotos }: { onAllPhotos: () => void }) {
  const { t, locale } = useT();
  const albums = useMemo(() => getAlbums(), []);
  const firstSlug = albums[0]!.slug;
  // Server and first client render agree: the first album, no current row. The live preview
  // (hover/focus, wipes, warm-up) switches on after mount, only with a fine, hovering pointer.
  const [enabled, setEnabled] = useState(false);
  const [current, setCurrent] = useState(firstSlug);
  const [layers, setLayers] = useState<PreviewLayer[]>([{ key: 0, slug: firstSlug, dir: null }]);
  const currentRef = useRef(firstSlug);
  const nextKey = useRef(1);
  const warmed = useRef(new Set<string>([firstSlug]));
  // Neighbouring covers are warmed only once the visitor reaches for the list.
  const [engaged, setEngaged] = useState(false);

  const select = useCallback(
    (slug: string) => {
      if (!enabled) return;
      setEngaged(true);
      if (slug === currentRef.current) return;
      const slugs = albums.map((album) => album.slug);
      const dir = wipeDirection(slugs.indexOf(currentRef.current), slugs.indexOf(slug));
      currentRef.current = slug;
      setCurrent(slug);
      const key = nextKey.current++;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setLayers((stack) =>
        reduced ? [{ key, slug, dir: null }] : pushLayer(stack, slug, dir, key),
      );
    },
    [enabled, albums],
  );

  useEffect(() => {
    const query = window.matchMedia(ALBUM_PREVIEW.query);
    const sync = () => setEnabled(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // A row focused before hydration becomes current once the preview is live.
  useEffect(() => {
    if (!enabled) return;
    const focused = document.activeElement?.closest<HTMLElement>(
      ".photography-editorial-destination-list [data-album-slug]",
    );
    if (focused?.dataset["albumSlug"]) select(focused.dataset["albumSlug"]);
  }, [enabled, select]);

  // Layers under the current one leave once its wipe is done (the cap bounds rapid sweeps).
  useEffect(() => {
    if (layers.length < 2) return;
    const id = window.setTimeout(() => setLayers(settleLayers), ALBUM_PREVIEW.removeAfterMs);
    return () => window.clearTimeout(id);
  }, [layers]);

  // Once the list is in use, fetch the covers next to the current row when the browser is idle
  // (never all at once, nothing extra at page load).
  useEffect(() => {
    if (!enabled || !engaged) return;
    const slugs = albums.map((album) => album.slug);
    const warm = () => {
      for (const slug of warmSlugs(slugs, slugs.indexOf(current))) {
        if (warmed.current.has(slug)) continue;
        warmed.current.add(slug);
        const album = getAlbum(slug);
        const source = album ? previewOf(album) : null;
        if (source?.kind !== "photo") continue;
        const img = new Image();
        img.decoding = "async";
        img.src = source.photo.image;
      }
    };
    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void, opts: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idle.requestIdleCallback) {
      const id = idle.requestIdleCallback(warm, { timeout: ALBUM_PREVIEW.idleTimeoutMs });
      return () => idle.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warm, ALBUM_PREVIEW.idleTimeoutMs);
    return () => window.clearTimeout(id);
  }, [enabled, engaged, current, albums]);

  const currentAlbum = getAlbum(current) ?? albums[0]!;
  const currentSource = previewOf(currentAlbum);
  const description = albumText(currentAlbum.description, locale);
  const headingWords = t.home.photoTitle.split(" ");
  const headingLastWord = headingWords.pop();

  return (
    <div className="photography-editorial">
      <Surface
        tone="light"
        className="photography-editorial-opening"
        aria-labelledby="photography-title"
      >
        <figure className="photography-editorial-opening-photo" data-photo-opening>
          <img
            src={photographyCover.image}
            srcSet={photographyCover.srcSet}
            alt={photographyCoverAlt(locale)}
            width={photographyCover.width}
            height={photographyCover.height}
            fetchPriority="high"
            decoding="async"
            sizes="100vw"
            style={{ objectPosition: photographyCover.objectPosition }}
          />
        </figure>
        <div className="container-page photography-editorial-mast">
          <div className="photography-editorial-heading">
            <p className="eyebrow">{t.photos.eyebrow}</p>
            <h1 id="photography-title">
              {headingWords.join(" ")} <em>{headingLastWord}</em>
            </h1>
          </div>
          <div className="photography-editorial-lead">
            <p>{t.home.photoText}</p>
          </div>
        </div>
      </Surface>

      <Surface
        tone="light"
        className="container-page photography-editorial-index"
        aria-labelledby="photography-albums-title"
      >
        <div className="photography-editorial-index-heading">
          <h2 id="photography-albums-title">{t.photos.albums}</h2>
          <button type="button" onClick={onAllPhotos} className="interaction-link interaction-text-button photography-editorial-all-photos">
            {t.photos.allPhotos} <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="photography-editorial-index-grid">
          <ul
            className="photography-editorial-destination-list"
            style={listStyle}
            onMouseEnter={() => enabled && setEngaged(true)}
          >
            {albums.map((album) => {
              const cover = getAlbumCover(album);
              const localizedCover = cover ? localizePhoto(cover, locale) : undefined;
              return (
                <li
                  key={album.id}
                  data-album-slug={album.slug}
                  onMouseEnter={() => select(album.slug)}
                  onFocus={() => select(album.slug)}
                >
                  <LocaleLink
                    to="/photography/albums/$slug"
                    slug={album.slug}
                    aria-label={albumText(album.title, locale)}
                    aria-current={enabled && album.slug === current ? "true" : undefined}
                    className="photography-editorial-row"
                  >
                    {localizedCover && (
                      <span
                        className="photography-editorial-thumb photo-frame-keyline"
                        aria-hidden="true"
                      >
                        <img
                          src={localizedCover.image}
                          alt=""
                          width={localizedCover.width}
                          height={localizedCover.height}
                          loading="lazy"
                          decoding="async"
                          sizes="72px"
                        />
                      </span>
                    )}
                    <span className="photography-editorial-destination-name">
                      {albumText(album.title, locale)}
                    </span>
                    <span className="photography-editorial-count">
                      {t.photos.count(album.photos.length)}
                    </span>
                    <ArrowRight
                      className="photography-editorial-row-arrow"
                      size={17}
                      aria-hidden="true"
                    />
                  </LocaleLink>
                </li>
              );
            })}
          </ul>
          {/* Decorative: the focused row already carries the same name and count. */}
          <figure
            className="photography-editorial-preview"
            aria-hidden="true"
            inert
            style={previewStyle}
          >
            <div className="photography-editorial-preview-frame photo-frame-print photo-frame-print--thin">
              {layers.map((layer) => (
                <PreviewLayerView key={layer.key} layer={layer} locale={locale} />
              ))}
            </div>
            <figcaption>
              <span>{albumText(currentAlbum.title, locale)}</span>
              <span>{t.photos.count(currentAlbum.photos.length)}</span>
            </figcaption>
            {description && (
              <p>
                {currentSource.kind === "photo" && (
                  <>{localizePhoto(currentSource.photo, locale).title} — </>
                )}
                {description}
              </p>
            )}
          </figure>
        </div>
      </Surface>
    </div>
  );
}
