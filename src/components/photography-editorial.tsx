import {
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
import { getPhoto, localizePhoto, type Photo } from "@/content/photos";
import { Surface } from "@/components/surface";
import { useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import {
  addStamp,
  EMPTY_PASSPORT,
  isPassportComplete,
  PASSPORT_FINALE_TIMINGS,
  passportCountText,
  passportMrzLines,
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
import { ALBUM_LAYOUT } from "@/lib/album-layout";
import { passportAlbum } from "@/lib/passport-album";

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

type PassportFinaleStage = 0 | 1 | 2 | 3;

function CompletionSeal({ total, compact = false }: { total: number; compact?: boolean }) {
  const width = compact ? 78 : 300;
  const height = compact ? 26 : 110;
  const inset = compact ? 5 : 8;
  const count = passportCountText(total);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} focusable="false" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width={width - 4}
        height={height - 4}
        rx="4"
        fill="none"
        stroke="#A16A56"
        strokeWidth={compact ? 1.8 : 3}
      />
      <rect
        x={inset}
        y={inset}
        width={width - inset * 2}
        height={height - inset * 2}
        rx="2"
        fill="none"
        stroke="#A16A56"
        strokeWidth="1"
      />
      <text
        x={width / 2}
        y={compact ? height * 0.66 : height * 0.47}
        textAnchor="middle"
        fontFamily={
          compact ? "Manrope, system-ui, sans-serif" : "Cormorant Garamond, Georgia, serif"
        }
        fontWeight={compact ? 700 : 600}
        fontSize={compact ? height * 0.42 : height * 0.36}
        letterSpacing={compact ? 1 : 4}
        fill="#A16A56"
      >
        COMPLETE
      </text>
      {!compact && (
        <text
          x={width / 2}
          y={height * 0.75}
          textAnchor="middle"
          fontFamily="Manrope, system-ui, sans-serif"
          fontWeight="600"
          fontSize={height * 0.12}
          letterSpacing="2.4"
          fill="#A16A56"
        >
          {count} · TRAVEL PASSPORT
        </text>
      )}
    </svg>
  );
}

function PassportVisa({ total }: { total: number }) {
  const [firstMrz, secondMrz] = passportMrzLines(total);
  return (
    <div className="photography-editorial-visa" data-passport-count={total} aria-hidden="true">
      <div className="photography-editorial-visa-inner">
        <div className="photography-editorial-visa-top">
          <b>VISA</b>
          <span>CHEFO VISUAL WORLDS</span>
        </div>
        <div className="photography-editorial-visa-body">
          <div className="photography-editorial-visa-portrait">
            <svg viewBox="0 0 40 48" focusable="false">
              <circle cx="20" cy="17" r="8" fill="none" stroke="#8A6A32" strokeWidth="1.4" />
              <path
                d="M6 44c2-9 8-13 14-13s12 4 14 13"
                fill="none"
                stroke="#8A6A32"
                strokeWidth="1.4"
              />
            </svg>
          </div>
          <dl>
            <dt>TYPE</dt>
            <dd>AI WORLDS</dd>
            <dt>ENTRIES</dt>
            <dd>MULTIPLE</dd>
            <dt>GRANTED FOR</dt>
            <dd>{passportCountText(total)} REAL PLACES</dd>
            <dt>HOLDER</dt>
            <dd>YOU</dd>
          </dl>
        </div>
        <div className="photography-editorial-visa-mrz">
          {firstMrz}
          <br />
          {secondMrz}
        </div>
        <i className="photography-editorial-visa-hologram" />
      </div>
    </div>
  );
}

/**
 * A tap from a finger or pen (not a mouse click, not keyboard or assistive activation, which
 * report `detail === 0`). Only such taps use the two-tap model at any section width.
 */
const isTouchTap = (event: MouseEvent<HTMLElement>): boolean => {
  if (event.detail === 0) return false;
  const pointerType = (event.nativeEvent as PointerEvent).pointerType;
  if (pointerType) return pointerType === "touch" || pointerType === "pen";
  return window.matchMedia(ALBUM_LAYOUT.coarsePointer).matches;
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

/** P1 presentation. Published copy and covers remain in the production registries. */
export function PhotographyEditorial() {
  const { t, locale } = useT();
  const albums = useMemo(() => getAlbums(), []);
  const firstSlug = albums[0]!.slug;
  // Server and first client render agree: the first album, no current row, empty passport.
  // The live preview (hover/focus, iris, passport stamps, mobile two-tap) switches on after mount.
  const [enabled, setEnabled] = useState(false);
  // Width of the albums section (the CSS container `albums-section`), measured after mount.
  const [sectionWidth, setSectionWidth] = useState(0);
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Mobile model (sticky caption, two taps): container <= 767px.
  const mobile = sectionWidth > 0 && sectionWidth <= ALBUM_LAYOUT.mobileMaxWidth;
  const [current, setCurrent] = useState(firstSlug);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [mobileSelectedSlug, setMobileSelectedSlug] = useState<string | null>(null);
  const [layers, setLayers] = useState<PreviewLayer[]>([{ key: 0, slug: firstSlug, dir: null }]);
  const [passport, setPassport] = useState<PassportState>(EMPTY_PASSPORT);
  const [justStamped, setJustStamped] = useState<string | null>(null);
  const [finaleStage, setFinaleStage] = useState<PassportFinaleStage>(0);
  const [completionAnnouncement, setCompletionAnnouncement] = useState("");
  const passportRef = useRef<PassportState>(EMPTY_PASSPORT);
  const completionAnnouncedRef = useRef(false);
  const currentRef = useRef(firstSlug);
  const nextKey = useRef(1);
  const warmed = useRef(new Set<string>([firstSlug]));
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
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

  const activateRow = useCallback(
    (slug: string, rowEl: HTMLElement | null) => {
      if (!enabled) return;
      setHighlightedSlug(slug);
      select(slug, rowEl);
      stamp(slug);
    },
    [enabled, select, stamp],
  );

  const handleRowClickCapture = useCallback(
    (event: MouseEvent<HTMLLIElement>, slug: string) => {
      // First touch tap selects, the second opens; keyboard and mouse always open at once.
      if (!isTouchTap(event)) return;
      if (mobileSelectedSlug !== slug) {
        event.preventDefault();
        event.stopPropagation();
        setMobileSelectedSlug(slug);
        selectWithOrigin(slug, { x: "50%", y: "50%" });
        stamp(slug);
      }
    },
    [mobileSelectedSlug, selectWithOrigin, stamp],
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
    // The section has no inline padding, so its client width is the container query width.
    const section = innerRef.current?.parentElement ?? null;
    const measure = () => setSectionWidth(section?.clientWidth ?? 0);
    const sync = () => {
      setEnabled(desktopQuery.matches);
      measure();
    };
    sync();
    desktopQuery.addEventListener("change", sync);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (section && observer) observer.observe(section);
    window.addEventListener("resize", measure);
    return () => {
      desktopQuery.removeEventListener("change", sync);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
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
  const destination = passportAlbum(currentAlbum.slug);
  const destinationCity = albumText(destination.title, locale);
  const currentIndex = Math.max(
    0,
    albums.findIndex((album) => album.slug === currentAlbum.slug),
  );
  const totalAlbums = albums.length;
  const stampedCount = passport.size;
  const allStamped = isPassportComplete(passport, totalAlbums);
  const finaleStarted = finaleStage >= 1;
  const finaleSealVisible = finaleStage >= 2;
  const finaleCtaVisible = finaleStage >= 3;
  const passportHintCount = allStamped && !finaleStarted ? totalAlbums - 1 : stampedCount;
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

  useEffect(() => {
    if (!allStamped) return;

    const advanceFinale = (next: PassportFinaleStage) => {
      setFinaleStage((currentStage) => (next > currentStage ? next : currentStage));
    };
    const announce = () => {
      if (completionAnnouncedRef.current) return;
      completionAnnouncedRef.current = true;
      setCompletionAnnouncement(t.photos.passportCompleteLive(totalAlbums));
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      advanceFinale(3);
      announce();
      return;
    }

    const visaTimer = window.setTimeout(() => {
      advanceFinale(1);
      announce();
    }, PASSPORT_FINALE_TIMINGS.startMs);
    const sealTimer = window.setTimeout(
      () => advanceFinale(2),
      PASSPORT_FINALE_TIMINGS.startMs + PASSPORT_FINALE_TIMINGS.sealAfterVisaMs,
    );
    const ctaTimer = window.setTimeout(
      () => advanceFinale(3),
      PASSPORT_FINALE_TIMINGS.startMs + PASSPORT_FINALE_TIMINGS.ctaAfterVisaMs,
    );

    return () => {
      window.clearTimeout(visaTimer);
      window.clearTimeout(sealTimer);
      window.clearTimeout(ctaTimer);
    };
  }, [allStamped, t.photos, totalAlbums]);

  return (
    <div className="photography-editorial">
      <Surface
        tone="light"
        className="photography-editorial-index"
        aria-labelledby="photography-albums-title"
      >
        <div ref={innerRef} className="container-page photography-editorial-index-inner">
          <div className="photography-editorial-index-heading">
            <h2 id="photography-albums-title">{t.photos.albums}</h2>
          </div>
          <div className="photography-editorial-index-grid">
            <div
              className="photography-editorial-list-head"
              data-done={finaleStarted ? "true" : undefined}
            >
              <span className="photography-editorial-passport-summary">
                {t.photos.passport} ·{" "}
                <span className="photography-editorial-passport-count">
                  {t.photos.passportOf(stampedCount, totalAlbums)}
                </span>
                {finaleStarted && (
                  <span className="photography-editorial-complete-seal-compact" aria-hidden="true">
                    <CompletionSeal total={totalAlbums} compact />
                  </span>
                )}
              </span>
              {finaleStarted ? (
                <LocaleLink
                  to="/photography/albums/$slug"
                  slug={destination.slug}
                  aria-label={t.photos.passportToCityLabel(destinationCity)}
                  className="photography-editorial-complete-link-compact"
                >
                  {t.photos.passportToCity(destinationCity)}
                </LocaleLink>
              ) : (
                <span className="photography-editorial-passport-hint">
                  {t.photos.passportHint(passportHintCount, totalAlbums)}
                </span>
              )}
            </div>
            <div className="sr-only" aria-live="polite" data-mobile-live>
              {mobileLiveText}
            </div>
            <div className="sr-only" aria-live="polite" data-passport-live>
              {completionAnnouncement}
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
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.contains(document.activeElement))
                        setHighlightedSlug(null);
                    }}
                    onFocus={(e) => activateRow(album.slug, e.currentTarget)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setHighlightedSlug(null);
                    }}
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
                      data-selected={enabled && album.slug === highlightedSlug ? "true" : undefined}
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
                            slug={album.slug}
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
                          slug={currentAlbum.slug}
                          count={currentAlbum.photos.length}
                          total={totalAlbums}
                          size={64}
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
              >
                <span className="photography-editorial-open-stamp" aria-hidden="true">
                  <AlbumStamp
                    key={currentAlbum.slug}
                    index={currentIndex}
                    title={albumText(currentAlbum.title, "en")}
                    slug={currentAlbum.slug}
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
                data-done={finaleStarted ? "true" : undefined}
              >
                <span className="photography-editorial-zone-name">
                  {t.photos.passport}
                  {finaleStarted && <small>{t.photos.passportCompleteHint}</small>}
                </span>
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
                            slug={album.slug}
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
                {finaleStarted && <PassportVisa total={totalAlbums} />}
                {finaleSealVisible && (
                  <div className="photography-editorial-complete-seal" aria-hidden="true">
                    <CompletionSeal total={totalAlbums} />
                  </div>
                )}
              </div>
              {finaleCtaVisible && (
                <LocaleLink
                  to="/photography/albums/$slug"
                  slug={destination.slug}
                  aria-label={t.photos.passportToCityLabel(destinationCity)}
                  className="photography-editorial-complete-link"
                >
                  {t.photos.passportToCity(destinationCity)}
                </LocaleLink>
              )}
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
                              slug={album.slug}
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
