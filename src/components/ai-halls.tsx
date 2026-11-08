// AI Worlds, Collections view: the sticky collection tab bar and one hall per collection, as in
// the approved mock. A hall shows three works of its collection beside its counter, title, intro
// and the "Explore the collection" button, over a blurred scene tinted with the collection glow.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  collectionText,
  getAiCollections,
  getCollectionWorks,
  type AiCollection,
} from "@/content/ai-collections";
import { CollectionAtmosphere, pad2 } from "@/components/ai-exhibition";
import { CollectionTabs } from "@/components/collection-tabs";
import { HALL_GLOW, hallId } from "@/lib/ai-halls";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import {
  ACTIVE_LINE,
  TAB_LOCK_IDLE_MS,
  TAB_LOCK_MAX_MS,
  activeSceneIndex,
  tabScrollTarget,
} from "@/lib/world-tabs";

const REDUCED = "(prefers-reduced-motion: reduce)";

export function AiHalls() {
  const { t } = useT();
  const collections = getAiCollections();
  const rootRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const { active, select } = useHallTabs(rootRef, tabsRef);
  useHallReveal(rootRef);
  return (
    // The tab band is sticky inside this block only: never over All works, the footer or the slider.
    <div ref={rootRef} className="ai-halls">
      <CollectionTabs
        ref={tabsRef}
        mode="scroll"
        label={t.ai.hallsNav}
        active={active}
        onSelect={select}
        className="ai-tabs-band"
      />
      {collections.map((collection, index) => (
        <CollectionHall key={collection.slug} collection={collection} index={index} />
      ))}
    </div>
  );
}

/** One collection: three works, then (or beside) its counter, title, intro and button. */
export function CollectionHall({ collection, index }: { collection: AiCollection; index: number }) {
  const { t, locale } = useT();
  const m = t.ai;
  const works = getCollectionWorks(collection, locale);
  const title = collectionText(collection.title, locale);
  const titleId = `${hallId(collection.slug)}-title`;
  return (
    <article
      id={hallId(collection.slug)}
      aria-labelledby={titleId}
      data-hall
      className="ai-hall surface-dark"
      style={{ "--glow": HALL_GLOW[collection.slug] } as CSSProperties}
    >
      <CollectionAtmosphere collection={collection} eager={index === 0} variant="hall" />
      <div className="ai-hall-col container-page">
        <div className="ai-hall-media">
          {works.slice(0, 3).map((work) => (
            <LocaleLink
              key={work.slug}
              to="/ai-worlds/$slug"
              slug={work.slug}
              className="ai-hall-shot"
            >
              <img
                src={work.image}
                alt={work.alt}
                width={work.width ?? 1024}
                height={work.height ?? 1280}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
              <span aria-hidden="true" className="ai-hall-cap">
                {work.title}
              </span>
            </LocaleLink>
          ))}
        </div>
        <div className="ai-hall-text">
          <span className="ai-hall-count">
            {pad2(index + 1)} · {m.count(works.length)}
          </span>
          <h2 id={titleId} className="ai-hall-title">
            {title}
          </h2>
          <p className="ai-hall-intro">{collectionText(collection.intro, locale)}</p>
          <p>
            <LocaleLink
              to="/ai-worlds/collections/$slug"
              slug={collection.slug}
              aria-label={`${m.exploreCollection}: ${title}`}
              className="ai-fan"
            >
              <span className="ai-fan-label">{m.exploreCollection}</span>
              <span aria-hidden="true" className="ai-fan-arrow">
                →
              </span>
            </LocaleLink>
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * The tab that follows the scroll. Not an IntersectionObserver: a rAF-throttled scroll/resize
 * handler measures every hall's top and takes the last one at or above the reading line
 * (activeSceneIndex). A click scrolls the hall just under the header and the band, shows its tab
 * at once and holds it until scrolling has been idle (hard limit), or until the visitor scrolls,
 * touches or types.
 */
function useHallTabs(
  rootRef: RefObject<HTMLElement | null>,
  tabsRef: RefObject<HTMLElement | null>,
) {
  const [active, setActive] = useState(0);
  const selectRef = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia(REDUCED);
    let raf = 0;
    let locked = false;
    let idle = 0;
    let hard = 0;
    let alive = true;
    const headerHeight = () =>
      document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const halls = () => Array.from(root.querySelectorAll<HTMLElement>("[data-hall]"));
    const hallTops = () => {
      const rects = halls().map((hall) => hall.getBoundingClientRect());
      // Nothing laid out (hidden, or no layout at all): keep the current tab.
      return rects.some((rect) => rect.height > 0) ? rects.map((rect) => rect.top) : [];
    };
    const sync = () => {
      raf = 0;
      if (locked) return;
      const index = activeSceneIndex(hallTops(), window.innerHeight * ACTIVE_LINE);
      if (index >= 0) setActive(index);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    const unlock = () => {
      locked = false;
      window.clearTimeout(idle);
      window.clearTimeout(hard);
      schedule();
    };
    const onScroll = () => {
      if (!locked) return schedule();
      window.clearTimeout(idle);
      idle = window.setTimeout(unlock, TAB_LOCK_IDLE_MS);
    };
    const onVisitor = () => {
      if (locked) unlock();
    };
    const placeBar = () => root.style.setProperty("--ai-tabs-top", `${headerHeight()}px`);
    const onResize = () => {
      placeBar();
      schedule();
    };

    selectRef.current = (index: number) => {
      const hall = halls()[index];
      if (!hall) return;
      const top = tabScrollTarget(
        hall.getBoundingClientRect().top + window.scrollY,
        headerHeight(),
        tabsRef.current?.offsetHeight ?? 0,
      );
      locked = true;
      setActive(index);
      window.clearTimeout(idle);
      window.clearTimeout(hard);
      hard = window.setTimeout(unlock, TAB_LOCK_MAX_MS);
      window.scrollTo({ top, behavior: reduced.matches ? "auto" : "smooth" });
    };

    placeBar();
    sync();
    const soon = window.setTimeout(schedule, 150);
    const later = window.setTimeout(schedule, 700);
    document.fonts?.ready.then(() => alive && schedule()).catch(() => {});
    const visitorEvents = ["wheel", "touchstart", "keydown"] as const;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    for (const type of visitorEvents) window.addEventListener(type, onVisitor, { passive: true });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      for (const timer of [idle, hard, soon, later]) window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      for (const type of visitorEvents) window.removeEventListener(type, onVisitor);
    };
  }, [rootRef, tabsRef]);

  const select = useCallback((index: number) => selectRef.current(index), []);
  return { active, select };
}

/**
 * Halls rise in once as they enter (the mock's .rv). The server HTML and the first client render
 * show everything; only halls still below the fold after mount get the hidden pre-state, and
 * reduced motion keeps every hall as it is.
 */
function useHallReveal(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia(REDUCED).matches) return;
    const halls = Array.from(root.querySelectorAll<HTMLElement>("[data-hall]"));
    let observer: IntersectionObserver | undefined;
    const raf = requestAnimationFrame(() => {
      const pending = halls.filter((hall) => hall.getBoundingClientRect().top > window.innerHeight);
      if (!pending.length) return;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const hall = entry.target as HTMLElement;
            hall.dataset["hallReveal"] = "shown";
            observer?.unobserve(hall);
          }
        },
        { threshold: 0.15 },
      );
      for (const hall of pending) {
        hall.dataset["hallReveal"] = "pending";
        observer.observe(hall);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      // Never leave a hall hidden when the page changes underneath.
      for (const hall of halls)
        if (hall.dataset["hallReveal"] === "pending") delete hall.dataset["hallReveal"];
    };
  }, [rootRef]);
}
