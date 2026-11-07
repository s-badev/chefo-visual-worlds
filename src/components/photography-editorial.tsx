import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
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
  type IrisOrigin,
  type PreviewLayer,
} from "@/lib/album-preview";
import {
  ALBUM_MAP,
  easeInOutQuad,
  headingDeg,
  routeArcPoint,
  routeDotX,
  routeFlightDuration,
} from "@/lib/album-map";

// The map (geometry + relief) is its own chunk, fetched only when the map zone is shown.
const LazyAlbumMap = lazy(() => import("@/components/album-map"));

const SVG_NS = "http://www.w3.org/2000/svg";

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

/**
 * A tap from a finger or pen (not a mouse click, not keyboard or assistive activation, which
 * report `detail === 0`). Only such taps use the two-tap model on mobile.
 */
const isTouchTap = (event: MouseEvent<HTMLElement>): boolean => {
  if (event.detail === 0) return false;
  const pointerType = (event.nativeEvent as PointerEvent).pointerType;
  if (pointerType) return pointerType === "touch" || pointerType === "pen";
  return window.matchMedia(ALBUM_MAP.coarsePointer).matches;
};

const previewStyle = {
  "--preview-top": `${ALBUM_PREVIEW.headerRem + ALBUM_PREVIEW.stickyGapRem}rem`,
  "--preview-mobile-top": `${ALBUM_PREVIEW.headerRem}rem`,
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

/** One stacked preview layer; layers after the first reveal via an iris clip from the active row or center. */
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
          sizes="(min-width: 1024px) 45vw, (max-width: 767px) 92vw, 1px"
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

/**
 * Mobile route bar (container <= 767px): 13 dots, the selected one larger and gold, visited ones
 * in stamp ink, a gold progress line up to the selected dot and a small plane that arcs there.
 * Decorative: the list and the caption carry the same information.
 */
function MobileRouteStrip({
  albums,
  currentIndex,
  passport,
  mobile,
}: {
  albums: readonly Album[];
  currentIndex: number;
  passport: PassportState;
  mobile: boolean;
}) {
  const progRef = useRef<SVGLineElement | null>(null);
  const puffsRef = useRef<SVGGElement | null>(null);
  const planeRef = useRef<SVGGElement | null>(null);
  const prevIndexRef = useRef<number>(-1);
  const rafRef = useRef<number | null>(null);
  const total = albums.length;

  useEffect(() => {
    if (!mobile) return;
    const i0 = prevIndexRef.current;
    prevIndexRef.current = currentIndex;
    const x1 = routeDotX(currentIndex, total);
    const prog = progRef.current;
    const plane = planeRef.current;
    const puffs = puffsRef.current;

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (i0 < 0 || i0 === currentIndex || reduced) {
      if (plane) plane.style.display = "none";
      prog?.setAttribute("x2", String(x1));
      return;
    }

    const x0 = routeDotX(i0, total);
    const dur = routeFlightDuration(x1 - x0);
    const t0 = performance.now();
    let lastX: number | null = null;

    if (plane) plane.style.display = "";

    const step = (now: number) => {
      const tNorm = Math.min(1, (now - t0) / dur);
      const e = easeInOutQuad(tNorm);
      const a = routeArcPoint(x0, x1, e);
      const b = routeArcPoint(x0, x1, Math.min(1, e + 0.01));
      plane?.setAttribute("transform", `translate(${a[0]},${a[1]}) rotate(${headingDeg(a, b)})`);
      prog?.setAttribute("x2", String(a[0]));

      if (puffs && (lastX === null || Math.abs(a[0] - lastX) > 5)) {
        lastX = a[0];
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", String(a[0]));
        c.setAttribute("cy", String(a[1]));
        c.setAttribute("r", "1.8");
        c.setAttribute("class", "photography-editorial-route-puff");
        c.style.transition = `opacity ${ALBUM_MAP.puffMs}ms ease-out`;
        puffs.appendChild(c);
        void c.getBoundingClientRect();
        c.style.opacity = "0";
        window.setTimeout(() => c.remove(), ALBUM_MAP.puffMs + 50);
      }

      if (tNorm < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        if (plane) plane.style.display = "none";
        prog?.setAttribute("x2", String(x1));
      }
    };

    rafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [mobile, currentIndex, total]);

  const y = ALBUM_MAP.routeY;
  return (
    <div className="photography-editorial-route" aria-hidden="true">
      <svg viewBox="0 0 358 48" preserveAspectRatio="xMidYMid meet">
        <line
          className="photography-editorial-route-base"
          x1={routeDotX(0, total)}
          y1={y}
          x2={routeDotX(total - 1, total)}
          y2={y}
        />
        <line
          ref={progRef}
          className="photography-editorial-route-progress"
          x1={routeDotX(0, total)}
          y1={y}
          x2={routeDotX(currentIndex, total)}
          y2={y}
        />
        <g className="photography-editorial-route-dots">
          {albums.map((album, k) => {
            const isCurrent = k === currentIndex;
            return (
              <circle
                key={album.slug}
                cx={routeDotX(k, total)}
                cy={y}
                r={isCurrent ? 5.4 : 3.4}
                data-current={isCurrent ? "true" : undefined}
                data-visited={!isCurrent && passport.has(album.slug) ? "true" : undefined}
              />
            );
          })}
        </g>
        <g ref={puffsRef} className="photography-editorial-route-puffs" />
        <g ref={planeRef} className="photography-editorial-route-plane" style={{ display: "none" }}>
          <path d="M13 0L-9 -8L-4 0L-9 8Z" strokeWidth="1" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

/** P1 presentation. Published copy and covers remain in the production registries. */
export function PhotographyEditorial({ onAllPhotos }: { onAllPhotos: () => void }) {
  const { t, locale } = useT();
  const albums = useMemo(() => getAlbums(), []);
  const firstSlug = albums[0]!.slug;
  // Server and first client render agree: the first album, no current row, empty passport.
  // The live preview (hover/focus, iris, passport stamps, map, mobile two-tap) switches on after mount.
  const [enabled, setEnabled] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  // Width of the albums section (the CSS container `albums-section`), measured after mount.
  const [sectionWidth, setSectionWidth] = useState(0);
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Map zone: container >= 1680px with a fine pointer (otherwise never rendered nor downloaded).
  const mapWide = enabled && finePointer && sectionWidth >= ALBUM_MAP.mapMinWidth;
  // Mobile model (route bar, sticky caption, two taps): container <= 767px.
  const mobile = sectionWidth > 0 && sectionWidth <= ALBUM_MAP.mobileMaxWidth;
  const [current, setCurrent] = useState(firstSlug);
  const [mapSlug, setMapSlug] = useState(firstSlug);
  const [mobileSelectedSlug, setMobileSelectedSlug] = useState<string | null>(null);
  const [layers, setLayers] = useState<PreviewLayer[]>([{ key: 0, slug: firstSlug, dir: null }]);
  const [passport, setPassport] = useState<PassportState>(EMPTY_PASSPORT);
  const [justStamped, setJustStamped] = useState<string | null>(null);
  const passportRef = useRef<PassportState>(EMPTY_PASSPORT);
  const currentRef = useRef(firstSlug);
  const nextKey = useRef(1);
  const warmed = useRef(new Set<string>([firstSlug]));
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const dwellRef = useRef<number | null>(null);
  // Neighbouring covers are warmed only once the visitor reaches for the list.
  const [engaged, setEngaged] = useState(false);

  const selectWithOrigin = useCallback(
    (slug: string, origin: IrisOrigin) => {
      setEngaged(true);
      if (slug === currentRef.current) return;
      const slugs = albums.map((album) => album.slug);
      const dir = wipeDirection(slugs.indexOf(currentRef.current), slugs.indexOf(slug));
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
    [albums],
  );

  const select = useCallback(
    (slug: string, rowEl?: HTMLElement | null) => {
      if (!enabled) return;
      const origin = irisOriginFromRects(
        rowEl?.getBoundingClientRect(),
        previewFrameRef.current?.getBoundingClientRect(),
      );
      selectWithOrigin(slug, origin);
    },
    [enabled, selectWithOrigin],
  );

  const stamp = useCallback((slug: string) => {
    const next = addStamp(passportRef.current, slug);
    if (!next.isNew) return;
    passportRef.current = next.state;
    setPassport(next.state);
    setJustStamped(slug);
  }, []);

  const scheduleMapFlight = useCallback((slug: string) => {
    if (dwellRef.current !== null) {
      window.clearTimeout(dwellRef.current);
    }
    dwellRef.current = window.setTimeout(() => {
      dwellRef.current = null;
      setMapSlug(slug);
    }, ALBUM_MAP.dwellMs);
  }, []);

  const clearMapDwell = useCallback(() => {
    if (dwellRef.current !== null) {
      window.clearTimeout(dwellRef.current);
      dwellRef.current = null;
    }
  }, []);

  const activateRow = useCallback(
    (slug: string, rowEl: HTMLElement | null) => {
      if (!enabled) return;
      select(slug, rowEl);
      stamp(slug);
      scheduleMapFlight(slug);
    },
    [enabled, select, stamp, scheduleMapFlight],
  );

  const handleRowClickCapture = useCallback(
    (event: MouseEvent<HTMLLIElement>, slug: string) => {
      clearMapDwell();
      // First touch tap selects, the second opens; keyboard and mouse always open at once.
      if (!mobile || !isTouchTap(event)) return;
      if (mobileSelectedSlug !== slug) {
        event.preventDefault();
        event.stopPropagation();
        setMobileSelectedSlug(slug);
        selectWithOrigin(slug, { x: "50%", y: "50%" });
        stamp(slug);
      }
    },
    [mobile, mobileSelectedSlug, clearMapDwell, selectWithOrigin, stamp],
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
    const desktopQuery = window.matchMedia(ALBUM_PREVIEW.query);
    const fineQuery = window.matchMedia(ALBUM_MAP.finePointer);
    // The section has no inline padding, so its client width is the container query width.
    const section = innerRef.current?.parentElement ?? null;
    const measure = () => setSectionWidth(section?.clientWidth ?? 0);
    const sync = () => {
      setEnabled(desktopQuery.matches);
      setFinePointer(fineQuery.matches);
      measure();
    };
    sync();
    desktopQuery.addEventListener("change", sync);
    fineQuery.addEventListener("change", sync);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (section && observer) observer.observe(section);
    window.addEventListener("resize", measure);
    return () => {
      desktopQuery.removeEventListener("change", sync);
      fineQuery.removeEventListener("change", sync);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (dwellRef.current !== null) window.clearTimeout(dwellRef.current);
    };
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
    if ((!enabled && !mobile) || !engaged) return;
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
  }, [enabled, mobile, engaged, current, albums]);

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
  const mobileSelectedAlbum = mobileSelectedSlug ? getAlbum(mobileSelectedSlug) : undefined;
  const mobileLiveText =
    mobile && mobileSelectedAlbum
      ? t.photos.selectedLive(
          albumText(mobileSelectedAlbum.title, locale),
          t.photos.count(mobileSelectedAlbum.photos.length),
        )
      : "";
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
        <div ref={innerRef} className="container-page photography-editorial-index-inner">
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
            {enabled && mapWide && (
              <Suspense fallback={null}>
                <LazyAlbumMap activeSlug={mapSlug} albums={albums} />
              </Suspense>
            )}
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
            <div className="sr-only" aria-live="polite" data-mobile-live>
              {mobileLiveText}
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
                const isMobileSelected = mobile && mobileSelectedSlug === album.slug;
                return (
                  <li
                    key={album.id}
                    data-album-slug={album.slug}
                    onMouseEnter={(e) => activateRow(album.slug, e.currentTarget)}
                    onMouseLeave={clearMapDwell}
                    onFocus={(e) => activateRow(album.slug, e.currentTarget)}
                    onClickCapture={(e) => handleRowClickCapture(e, album.slug)}
                    onKeyDown={(e) => handleRowKeyDown(e, index)}
                  >
                    <LocaleLink
                      to="/photography/albums/$slug"
                      slug={album.slug}
                      aria-label={`${title}, ${t.photos.count(album.photos.length)}`}
                      aria-current={
                        (enabled && album.slug === current) || isMobileSelected ? "true" : undefined
                      }
                      data-mobile-selected={isMobileSelected ? "true" : undefined}
                      data-selected={enabled && album.slug === mapSlug ? "true" : undefined}
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
                            title={albumText(album.title, "en")}
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
                        size={15}
                        aria-hidden="true"
                      />
                      <span className="photography-editorial-row-go" aria-hidden="true">
                        {t.photos.openShort} →
                      </span>
                    </LocaleLink>
                  </li>
                );
              })}
            </ul>
            {/* Sticky preview column: the figure is decorative on desktop (the rows carry the same
                information); the open-album pill after it is a real link. On mobile the figure is
                the interactive sticky bar + strip and the pill is hidden. */}
            <div className="photography-editorial-preview-col" style={previewStyle}>
              <figure
                className="photography-editorial-preview"
                aria-hidden={mobile ? undefined : "true"}
                inert={!mobile}
              >
                <div className="photography-editorial-preview-sticky">
                  <MobileRouteStrip
                    albums={albums}
                    currentIndex={currentIndex}
                    passport={passport}
                    mobile={mobile}
                  />
                  <div
                    ref={previewFrameRef}
                    className="photography-editorial-preview-frame photo-frame-print photo-frame-print--thin"
                  >
                    <span className="photography-editorial-preview-badge">
                      {`${t.photos.albumNo(currentIndex + 1, totalAlbums)} · ${albumText(currentAlbum.title, locale).toUpperCase()}`}
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
                          title={albumText(currentAlbum.title, "en")}
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
                  {/* Shown by CSS only in the mobile layout; its 44px height comes from the pill,
                    so the name and count filling in after mount shift nothing. */}
                  <div className="photography-editorial-mobile-cap">
                    <div className="photography-editorial-mobile-cap-meta">
                      {mobile && (
                        <>
                          <b>{albumText(currentAlbum.title, locale)}</b>
                          <span>{t.photos.count(currentAlbum.photos.length)}</span>
                        </>
                      )}
                    </div>
                    <LocaleLink
                      to="/photography/albums/$slug"
                      slug={currentAlbum.slug}
                      className="photography-editorial-mobile-open"
                    >
                      {t.photos.openAlbum}
                    </LocaleLink>
                  </div>
                </div>
                <div className="photography-editorial-preview-info">
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
                </div>
              </figure>
              <LocaleLink
                to="/photography/albums/$slug"
                slug={currentAlbum.slug}
                className="photography-editorial-preview-open"
                aria-label={t.photos.openAlbumFor(albumText(currentAlbum.title, locale))}
              >
                <span className="photography-editorial-open-stamp" aria-hidden="true">
                  <AlbumStamp
                    key={currentAlbum.slug}
                    index={currentIndex}
                    title={albumText(currentAlbum.title, "en")}
                    count={currentAlbum.photos.length}
                    total={totalAlbums}
                    size={38}
                    shape="round"
                    ink="currentColor"
                  />
                </span>
                <span className="photography-editorial-open-label">{t.photos.openAlbum}</span>
                <span className="photography-editorial-open-arrow" aria-hidden="true">
                  <b>→</b>
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M3 11.5L21 4l-6.2 16.2-3.2-6.8z" />
                    <path d="M11.6 13.4L21 4" />
                  </svg>
                </span>
              </LocaleLink>
            </div>
            <aside className="photography-editorial-passport" aria-label={t.photos.passport}>
              <div
                className="photography-editorial-zone-title"
                data-done={allStamped ? "true" : undefined}
              >
                <span>{t.photos.passport}</span>
                <span className="photography-editorial-passport-count">
                  {t.photos.passportOf(stampedCount, totalAlbums)}
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
                            title={albumText(album.title, "en")}
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
                              title={albumText(album.title, "en")}
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
