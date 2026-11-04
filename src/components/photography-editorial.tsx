import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ArrowRight } from "lucide-react";
import { AlbumStamp } from "@/components/album-stamp";
import { albumText, getAlbum, getAlbumCover, getAlbums, type Album } from "@/content/albums";
import { photographyCover, photographyCoverAlt } from "@/content/photography-cover";
import { getPhoto, localizePhoto, type Photo } from "@/content/photos";
import { Surface } from "@/components/surface";
import { useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import {
  addStamp,
  EMPTY_PASSPORT,
  stampRotation,
  stampSpot,
  type PassportState,
} from "@/lib/album-passport";
import {
  ALBUM_PREVIEW,
  irisOriginFromRects,
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

/** Up to four photographs for the preview mini strip: the cover first, then ordered album frames. */
const stripPhotosOf = (album: Album): Photo[] => {
  const ordered = album.photos
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((entry) => {
      const photo = getPhoto(entry.photoSlug);
      return photo ? [photo] : [];
    });
  const cover = getAlbumCover(album);
  if (!cover) return ordered.slice(0, 4);
  return [cover, ...ordered.filter((photo) => photo.slug !== cover.slug)].slice(0, 4);
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const previewStyle = {
  "--preview-top": `${ALBUM_PREVIEW.headerRem + ALBUM_PREVIEW.stickyGapRem}rem`,
  "--preview-wipe-ms": `${ALBUM_PREVIEW.wipeMs}ms`,
  "--preview-iris-ms": `${ALBUM_PREVIEW.irisMs}ms`,
  "--preview-iris-ease": ALBUM_PREVIEW.irisEase,
  "--preview-ease": ALBUM_PREVIEW.ease,
  "--preview-zoom-from": ALBUM_PREVIEW.zoomFrom,
  "--preview-zoom-ms": `${ALBUM_PREVIEW.zoomMs}ms`,
} as CSSProperties;

const listStyle = {
  "--row-slide": `${ALBUM_PREVIEW.rowSlidePx}px`,
  "--arrow-slide": `${ALBUM_PREVIEW.arrowSlidePx}px`,
} as CSSProperties;

/** One stacked preview layer; layers after the first reveal via an iris clip from the active row. */
function PreviewLayerView({ layer, locale }: { layer: PreviewLayer; locale: Locale }) {
  const { t } = useT();
  const album = getAlbum(layer.slug);
  if (!album) return null;
  const source = previewOf(album);
  const layerStyle = layer.origin
    ? ({
        "--iris-x": layer.origin.x,
        "--iris-y": layer.origin.y,
      } as CSSProperties)
    : undefined;
  return (
    <div
      className="photography-editorial-preview-layer"
      data-dir={layer.dir ?? undefined}
      style={layerStyle}
    >
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
  // Server and first client render agree: the first album, no current row, empty passport.
  // The live preview (hover/focus, iris, passport stamps, warm-up) switches on after mount,
  // only with a fine, hovering pointer.
  const [enabled, setEnabled] = useState(false);
  const [current, setCurrent] = useState(firstSlug);
  const [layers, setLayers] = useState<PreviewLayer[]>([{ key: 0, slug: firstSlug, dir: null }]);
  const [passport, setPassport] = useState<PassportState>(EMPTY_PASSPORT);
  const [justStamped, setJustStamped] = useState<string | null>(null);
  const passportRef = useRef<PassportState>(EMPTY_PASSPORT);
  const currentRef = useRef(firstSlug);
  const nextKey = useRef(1);
  const warmed = useRef(new Set<string>([firstSlug]));
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  // Neighbouring covers are warmed only once the visitor reaches for the list.
  const [engaged, setEngaged] = useState(false);

  const select = useCallback(
    (slug: string, rowEl?: HTMLElement | null) => {
      if (!enabled) return;
      setEngaged(true);
      if (slug === currentRef.current) return;
      const slugs = albums.map((album) => album.slug);
      const dir = wipeDirection(slugs.indexOf(currentRef.current), slugs.indexOf(slug));
      const origin = irisOriginFromRects(
        rowEl?.getBoundingClientRect(),
        previewFrameRef.current?.getBoundingClientRect(),
      );
      currentRef.current = slug;
      setCurrent(slug);
      const key = nextKey.current++;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setLayers((stack) =>
        reduced
          ? [{ key, slug, dir: null }]
          : pushLayer(stack, slug, dir, key, ALBUM_PREVIEW.maxLayers, origin),
      );
    },
    [enabled, albums],
  );

  const stamp = useCallback(
    (slug: string) => {
      if (!enabled) return;
      const next = addStamp(passportRef.current, slug);
      if (!next.isNew) return;
      passportRef.current = next.state;
      setPassport(next.state);
      setJustStamped(slug);
    },
    [enabled],
  );

  const activateRow = useCallback(
    (slug: string, rowEl: HTMLElement | null) => {
      if (!enabled) return;
      select(slug, rowEl);
      stamp(slug);
    },
    [enabled, select, stamp],
  );

  const handleRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>, index: number) => {
      const nextIndex =
        event.key === "ArrowDown"
          ? index + 1
          : event.key === "ArrowUp"
            ? index - 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? albums.length - 1
                : -1;
      if (nextIndex < 0 || nextIndex >= albums.length || nextIndex === index) return;
      event.preventDefault();
      const rows = listRef.current?.querySelectorAll<HTMLAnchorElement>(
        "a.photography-editorial-row",
      );
      rows?.[nextIndex]?.focus();
    },
    [albums.length],
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
    if (focused?.dataset["albumSlug"]) select(focused.dataset["albumSlug"], focused);
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
  const currentIndex = Math.max(
    0,
    albums.findIndex((album) => album.slug === currentAlbum.slug),
  );
  const totalAlbums = albums.length;
  const stampedCount = passport.size;
  const allStamped = stampedCount >= totalAlbums && totalAlbums > 0;
  const currentStamped = passport.has(currentAlbum.slug);
  const currentJustStamped = currentStamped && justStamped === currentAlbum.slug;
  const currentSource = previewOf(currentAlbum);
  const stripPhotos = useMemo(() => stripPhotosOf(currentAlbum), [currentAlbum]);
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
        className="photography-editorial-index"
        aria-labelledby="photography-albums-title"
      >
        <div className="container-page photography-editorial-index-inner">
          <div className="photography-editorial-index-heading">
            <h2 id="photography-albums-title">{t.photos.albums}</h2>
            <button
              type="button"
              onClick={onAllPhotos}
              className="interaction-link interaction-text-button photography-editorial-all-photos"
            >
              {t.photos.allPhotos} <ArrowRight aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="photography-editorial-index-grid">
            <div
              className="photography-editorial-list-head"
              data-done={allStamped ? "true" : undefined}
            >
              <span>
                {t.photos.passport} ·{" "}
                <span className="photography-editorial-passport-count">
                  {t.photos.passportOf(stampedCount, totalAlbums)}
                </span>
              </span>
              <span className="photography-editorial-passport-hint">
                {t.photos.passportHint(stampedCount, totalAlbums)}
              </span>
            </div>
            <ul
              ref={listRef}
              className="photography-editorial-destination-list"
              style={listStyle}
              onMouseEnter={() => enabled && setEngaged(true)}
            >
              {albums.map((album, index) => {
                const cover = getAlbumCover(album);
                const localizedCover = cover ? localizePhoto(cover, locale) : undefined;
                const title = albumText(album.title, locale);
                const isStamped = passport.has(album.slug);
                const isJustStamped = isStamped && justStamped === album.slug;
                return (
                  <li
                    key={album.id}
                    data-album-slug={album.slug}
                    onMouseEnter={(e) => activateRow(album.slug, e.currentTarget)}
                    onFocus={(e) => activateRow(album.slug, e.currentTarget)}
                    onKeyDown={(e) => handleRowKeyDown(e, index)}
                  >
                    <LocaleLink
                      to="/photography/albums/$slug"
                      slug={album.slug}
                      aria-label={title}
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
                      <span className="photography-editorial-destination-name">{title}</span>
                      <span
                        className="photography-editorial-row-stamp"
                        aria-hidden="true"
                        data-stamped={isStamped ? "true" : undefined}
                        data-new={isJustStamped ? "true" : undefined}
                        style={{ "--stamp-rot": `${stampRotation(index)}deg` } as CSSProperties}
                      >
                        {isStamped && (
                          <AlbumStamp
                            index={index}
                            title={title}
                            count={album.photos.length}
                            total={totalAlbums}
                            size={40}
                          />
                        )}
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
              <div
                ref={previewFrameRef}
                className="photography-editorial-preview-frame photo-frame-print photo-frame-print--thin"
              >
                <span className="photography-editorial-preview-badge">
                  {`№ ${pad2(currentIndex + 1)} / ${totalAlbums} · ${albumText(currentAlbum.title, locale).toUpperCase()}`}
                </span>
                <div className="photography-editorial-preview-viewfinder" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div
                  className="photography-editorial-preview-corner-stamp"
                  data-stamped={currentStamped ? "true" : undefined}
                  data-new={currentJustStamped ? "true" : undefined}
                  aria-hidden="true"
                >
                  {currentStamped && (
                    <AlbumStamp
                      index={currentIndex}
                      title={albumText(currentAlbum.title, locale)}
                      count={currentAlbum.photos.length}
                      total={totalAlbums}
                      size={62}
                    />
                  )}
                </div>
                {layers.map((layer) => (
                  <PreviewLayerView key={layer.key} layer={layer} locale={locale} />
                ))}
              </div>
              <figcaption>
                <span>{albumText(currentAlbum.title, locale)}</span>
                <span>{t.photos.count(currentAlbum.photos.length)}</span>
              </figcaption>
              {description && (
                <p className="photography-editorial-preview-desc">
                  {currentSource.kind === "photo" && (
                    <>{localizePhoto(currentSource.photo, locale).title} — </>
                  )}
                  {description}
                </p>
              )}
              {stripPhotos.length > 0 && (
                <div className="photography-editorial-strip">
                  {stripPhotos.map((photo, k) => (
                    <span
                      key={`${currentAlbum.slug}-${photo.slug}`}
                      className="photography-editorial-strip-item"
                      style={{ "--strip-delay": `${60 + k * 80}ms` } as CSSProperties}
                    >
                      <img
                        src={photo.image}
                        alt=""
                        width={photo.width}
                        height={photo.height}
                        loading="lazy"
                        decoding="async"
                        sizes="140px"
                      />
                    </span>
                  ))}
                </div>
              )}
              <LocaleLink
                to="/photography/albums/$slug"
                slug={currentAlbum.slug}
                className="photography-editorial-preview-open"
              >
                {t.photos.openAlbum} <span aria-hidden="true">→</span>
              </LocaleLink>
            </figure>
            <aside className="photography-editorial-passport" aria-label={t.photos.passport}>
              <div
                className="photography-editorial-zone-title"
                data-done={allStamped ? "true" : undefined}
              >
                <span>
                  {t.photos.passport} ·{" "}
                  <span className="photography-editorial-passport-count">
                    {t.photos.passportOf(stampedCount, totalAlbums)}
                  </span>
                </span>
                <span className="photography-editorial-passport-hint">
                  {t.photos.passportHint(stampedCount, totalAlbums)}
                </span>
              </div>
              <div className="photography-editorial-passport-book">
                <i className="photography-editorial-passport-head photography-editorial-passport-head--left">
                  {t.photos.passportBookLeft}
                </i>
                <i className="photography-editorial-passport-head photography-editorial-passport-head--right">
                  {t.photos.passportBookRight}
                </i>
                <div className="photography-editorial-passport-page">
                  {stampedCount === 0 ? (
                    <div className="photography-editorial-passport-empty">
                      {t.photos.passportEmpty}
                    </div>
                  ) : (
                    albums.map((album, index) => {
                      if (!passport.has(album.slug)) return null;
                      const spot = stampSpot(index, totalAlbums);
                      return (
                        <div
                          key={album.slug}
                          className="photography-editorial-passport-stamp"
                          data-album-slug={album.slug}
                          data-new={justStamped === album.slug ? "true" : undefined}
                          style={
                            {
                              left: `${spot[0]}%`,
                              top: `${spot[1]}%`,
                              "--stamp-rot": `${stampRotation(index)}deg`,
                            } as CSSProperties
                          }
                        >
                          <AlbumStamp
                            index={index}
                            title={albumText(album.title, locale)}
                            count={album.photos.length}
                            total={totalAlbums}
                            size={96}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
                <i className="photography-editorial-passport-page-num photography-editorial-passport-page-num--left">
                  02
                </i>
                <i className="photography-editorial-passport-page-num photography-editorial-passport-page-num--right">
                  03
                </i>
              </div>
              <ul className="photography-editorial-passport-grid">
                {albums.map((album, index) => {
                  const isStamped = passport.has(album.slug);
                  const isJustStamped = isStamped && justStamped === album.slug;
                  const title = albumText(album.title, locale);
                  return (
                    <li key={album.id}>
                      <LocaleLink
                        to="/photography/albums/$slug"
                        slug={album.slug}
                        className="photography-editorial-passport-slot"
                        data-stamped={isStamped ? "true" : undefined}
                        data-new={isJustStamped ? "true" : undefined}
                        data-tip={title}
                        aria-label={`${title}, ${isStamped ? t.photos.stampOpened : t.photos.stampNotOpened}`}
                      >
                        <span className="photography-editorial-passport-slot-num">
                          {pad2(index + 1)}
                        </span>
                        {isStamped && (
                          <span
                            className="photography-editorial-passport-slot-stamp"
                            aria-hidden="true"
                            style={{ transform: `rotate(${stampRotation(index)}deg)` }}
                          >
                            <AlbumStamp
                              index={index}
                              title={title}
                              count={album.photos.length}
                              total={totalAlbums}
                              size={52}
                            />
                          </span>
                        )}
                      </LocaleLink>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>
        </div>
      </Surface>
    </div>
  );
}
