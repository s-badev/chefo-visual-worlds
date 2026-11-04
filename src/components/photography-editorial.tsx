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

const routeDotX = (index: number, total: number) => 14 + index * (330 / Math.max(1, total - 1));

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

/** Mobile 48px route strip with 13 destination dots and sine-arc airplane flight. */
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
    const dur = Math.max(1100, Math.min(2000, 800 + Math.abs(x1 - x0) * 5));
    const t0 = performance.now();
    let lastX: number | null = null;
    const timers: number[] = [];

    if (plane) plane.style.display = "";

    const step = (now: number) => {
      const tNorm = Math.min(1, (now - t0) / dur);
      const e = tNorm < 0.5 ? 2 * tNorm * tNorm : 1 - Math.pow(-2 * tNorm + 2, 2) / 2;
      const x = x0 + (x1 - x0) * e;
      const y = 34 - Math.sin(e * Math.PI) * 22;
      const e2 = Math.min(1, e + 0.01);
      const x2 = x0 + (x1 - x0) * e2;
      const y2 = 34 - Math.sin(e2 * Math.PI) * 22;
      const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;

      plane?.setAttribute("transform", `translate(${x},${y}) rotate(${angle})`);
      prog?.setAttribute("x2", String(x));

      if (puffs && (lastX === null || Math.abs(x - lastX) > 5)) {
        lastX = x;
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("cx", String(x));
        c.setAttribute("cy", String(y));
        c.setAttribute("r", "1.8");
        c.setAttribute("fill", "#B8935A");
        c.style.transition = "opacity 1.6s";
        puffs.appendChild(c);
        void c.getBoundingClientRect();
        c.style.opacity = "0";
        const id = window.setTimeout(() => c.remove(), 1650);
        timers.push(id);
      }

      if (tNorm < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        if (plane) plane.style.display = "none";
        prog?.setAttribute("x2", String(x1));
        if (puffs) {
          const rg = document.createElementNS(SVG_NS, "circle");
          rg.setAttribute("cx", String(x1));
          rg.setAttribute("cy", "34");
          rg.setAttribute("r", "5");
          rg.setAttribute("fill", "none");
          rg.setAttribute("stroke", "#C9A46B");
          rg.setAttribute("stroke-width", "1.4");
          rg.style.transition = "r 0.8s ease-out, opacity 0.8s";
          puffs.appendChild(rg);
          void rg.getBoundingClientRect();
          rg.setAttribute("r", "16");
          rg.style.opacity = "0";
          const id = window.setTimeout(() => rg.remove(), 850);
          timers.push(id);
        }
      }
    };

    rafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      for (const id of timers) window.clearTimeout(id);
    };
  }, [mobile, currentIndex, total]);

  return (
    <div className="photography-editorial-route" aria-hidden="true">
      <svg viewBox="0 0 358 48" preserveAspectRatio="xMidYMid meet">
        <line
          x1={14}
          y1={34}
          x2={344}
          y2={34}
          stroke="rgba(22,33,58,.28)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <line
          ref={progRef}
          x1={14}
          y1={34}
          x2={routeDotX(currentIndex, total)}
          y2={34}
          stroke="#C9A46B"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <g className="photography-editorial-route-dots">
          {albums.map((album, k) => {
            const isCurrent = k === currentIndex;
            const isStamped = passport.has(album.slug);
            return (
              <circle
                key={album.slug}
                cx={routeDotX(k, total)}
                cy={34}
                r={isCurrent ? 5.4 : 3.4}
                fill={isCurrent ? "#C9A46B" : isStamped ? "#A16A56" : "#F8F1E4"}
                stroke="#8A6A32"
                strokeWidth={1.3}
              />
            );
          })}
        </g>
        <g ref={puffsRef} className="photography-editorial-route-puffs" />
        <g ref={planeRef} className="photography-editorial-route-plane" style={{ display: "none" }}>
          <path
            d="M13 0L-9 -8L-4 0L-9 8Z"
            fill="#16213A"
            stroke="#C9A46B"
            strokeWidth="1"
            strokeLinejoin="round"
          />
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
  const [mapWide, setMapWide] = useState(false);
  const [mobile, setMobile] = useState(false);
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
    }, ALBUM_PREVIEW.mapDwellMs);
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
      if (!mobile) return;
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
    const mapQuery = window.matchMedia(ALBUM_PREVIEW.mapQuery);
    const mobileQuery = window.matchMedia(ALBUM_PREVIEW.mobileQuery);
    const sync = () => {
      setEnabled(desktopQuery.matches);
      setMapWide(mapQuery.matches);
      setMobile(mobileQuery.matches);
    };
    sync();
    desktopQuery.addEventListener("change", sync);
    mapQuery.addEventListener("change", sync);
    mobileQuery.addEventListener("change", sync);
    return () => {
      desktopQuery.removeEventListener("change", sync);
      mapQuery.removeEventListener("change", sync);
      mobileQuery.removeEventListener("change", sync);
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
      ? t.photos.selectedLive(albumText(mobileSelectedAlbum.title, locale))
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
                      aria-label={title}
                      aria-current={
                        (enabled && album.slug === current) || isMobileSelected ? "true" : undefined
                      }
                      data-mobile-selected={isMobileSelected ? "true" : undefined}
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
                        size={17}
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
            {/* Decorative on desktop; interactive sticky bar + strip on mobile (<=767px). */}
            <figure
              className="photography-editorial-preview"
              aria-hidden={mobile ? undefined : "true"}
              inert={!mobile}
              style={previewStyle}
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
                {mobile && (
                  <div className="photography-editorial-mobile-cap">
                    <div className="photography-editorial-mobile-cap-meta">
                      <b>{albumText(currentAlbum.title, locale)}</b>
                      <span>{t.photos.count(currentAlbum.photos.length)}</span>
                    </div>
                    <LocaleLink
                      to="/photography/albums/$slug"
                      slug={currentAlbum.slug}
                      className="photography-editorial-mobile-open"
                    >
                      {t.photos.openAlbum}
                    </LocaleLink>
                  </div>
                )}
              </div>
              <div className="photography-editorial-preview-info">
                {!mobile && (
                  <figcaption>
                    <span>{albumText(currentAlbum.title, locale)}</span>
                    <span>{t.photos.count(currentAlbum.photos.length)}</span>
                  </figcaption>
                )}
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
              </div>
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
