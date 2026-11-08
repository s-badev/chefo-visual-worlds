import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AlbumStamp } from "@/components/album-stamp";
import { albumText, getAlbums } from "@/content/albums";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

/** Resting tilt of each stamp card, repeating by album index. */
export const STAMP_TILTS = [-5, 3, -2, 5, -4, 2, -6, 4, -3, 6, -1, 3, -5] as const;
/** Rise-in stagger per card and the most steps it adds up to. */
export const STAMP_STAGGER_MS = 60;
export const STAMP_STAGGER_STEPS = 8;
/** Prev/next scroll by this share of the visible row. */
const STEP_RATIO = 0.8;
/** Pixels of slack before a side counts as scrollable. */
const EDGE = 2;

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const REDUCED = "(prefers-reduced-motion: reduce)";

/**
 * Home: a horizontally scrolling row of every album's passport stamp under the featured cards.
 * Plain navigation: it links to each album and never touches the Photography passport state.
 * Server HTML and the first client render show every card; the rise-in only applies after mount
 * to a row still below the fold.
 */
export function HomeStampRow() {
  const { t, locale } = useT();
  const albums = getAlbums();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [fine, setFine] = useState(false);

  // Scroll state: which sides can still scroll (edge fades + prev/next buttons).
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = row.scrollWidth - row.clientWidth;
      setCanPrev(max > EDGE && row.scrollLeft > EDGE);
      setCanNext(max > EDGE && row.scrollLeft < max - EDGE);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    row.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resize?.observe(row);
    return () => {
      cancelAnimationFrame(raf);
      row.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize?.disconnect();
    };
  }, []);

  // Prev/next exist only for a fine, hover-capable pointer; touch just swipes.
  useEffect(() => {
    const query = window.matchMedia(FINE_POINTER);
    const sync = () => setFine(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // A button that hides at the end hands focus to the other one instead of dropping it.
  useEffect(() => {
    const active = document.activeElement;
    if (!canNext && active === nextRef.current) prevRef.current?.focus();
    if (!canPrev && active === prevRef.current) nextRef.current?.focus();
  }, [canPrev, canNext]);

  // First entry into view, as in the mock: the row rises and its stamps land one after another
  // (only for a row below the fold). Its own attribute, so the global [data-reveal] rule of
  // use-reveal never animates the row a second time.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia(REDUCED).matches) return;
    let observer: IntersectionObserver | undefined;
    const raf = requestAnimationFrame(() => {
      if (wrap.getBoundingClientRect().top <= window.innerHeight) return;
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          wrap.dataset["stampsReveal"] = "shown";
        },
        { threshold: 0.3 },
      );
      wrap.dataset["stampsReveal"] = "pending";
      observer.observe(wrap);
    });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      // Never leave the cards hidden when the page changes underneath.
      if (wrap.dataset["stampsReveal"] === "pending") delete wrap.dataset["stampsReveal"];
    };
  }, []);

  const go = useCallback((direction: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const reduced = window.matchMedia(REDUCED).matches;
    row.scrollBy({
      left: direction * row.clientWidth * STEP_RATIO,
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  // Tab moves through the links; keep the focused card fully inside the row.
  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(".home-stamp")) return;
    const reduced = window.matchMedia(REDUCED).matches;
    target.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: reduced ? "auto" : "smooth",
    });
  }, []);

  return (
    <div
      ref={wrapRef}
      className="home-stamps"
      data-fade-start={canPrev ? "" : undefined}
      data-fade-end={canNext ? "" : undefined}
    >
      <button
        ref={prevRef}
        type="button"
        className="home-stamps-step home-stamps-prev"
        aria-label={t.home.stampsPrev}
        hidden={!(fine && canPrev)}
        onClick={() => go(-1)}
      >
        <ArrowLeft aria-hidden="true" className="size-[18px]" />
      </button>
      <nav
        ref={rowRef}
        aria-label={t.home.stampsLabel}
        className="home-stamps-row"
        onFocus={onFocus}
      >
        <ol className="home-stamps-list">
          {albums.map((album, index) => {
            const count = album.photos.length;
            return (
              <li
                key={album.id}
                className="home-stamps-item"
                style={
                  {
                    "--stamp-tilt": `${STAMP_TILTS[index % STAMP_TILTS.length]}deg`,
                    "--stamp-delay": `${Math.min(index, STAMP_STAGGER_STEPS) * STAMP_STAGGER_MS}ms`,
                  } as CSSProperties
                }
              >
                <LocaleLink to="/photography/albums/$slug" slug={album.slug} className="home-stamp">
                  <span className="home-stamp-art" aria-hidden="true">
                    <AlbumStamp
                      index={index}
                      title={albumText(album.title, "en")}
                      count={count}
                      total={albums.length}
                      size={112}
                    />
                  </span>
                  <span className="home-stamp-name">{albumText(album.title, locale)}</span>
                  <span className="home-stamp-count">{t.photos.count(count)}</span>
                </LocaleLink>
              </li>
            );
          })}
        </ol>
      </nav>
      <button
        ref={nextRef}
        type="button"
        className="home-stamps-step home-stamps-next"
        aria-label={t.home.stampsNext}
        hidden={!(fine && canNext)}
        onClick={() => go(1)}
      >
        <ArrowRight aria-hidden="true" className="size-[18px]" />
      </button>
    </div>
  );
}
