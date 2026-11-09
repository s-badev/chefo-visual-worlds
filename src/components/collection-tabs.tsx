import { forwardRef, useEffect, useRef, useState } from "react";
import { collectionText, getAiCollections } from "@/content/ai-collections";
import { useSlidingIndicator } from "@/hooks/use-sliding-indicator";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { cn } from "@/lib/utils";

const REDUCED = "(prefers-reduced-motion: reduce)";

type CollectionTabsProps = {
  /** Accessible name of the navigation. */
  label: string;
  /** Index of the current collection (data order). */
  active: number;
  className?: string;
} & (
  | {
      /** Buttons that scroll to a scene on the same page (aria-current="true"). */
      mode: "scroll";
      onSelect: (index: number) => void;
    }
  | {
      /** Links to the collection pages (aria-current="page"). */
      mode: "links";
    }
);

/**
 * One pill tab per AI collection (short title from the data). The current tab is a cream pill
 * with navy text; the pill slides between tabs. On narrow screens the row scrolls sideways and
 * keeps the current tab in view. At rest the band is only its pills; once it sticks under the
 * header it becomes glass (data-stuck, set after mount from an observer on the band itself).
 */
export const CollectionTabs = forwardRef<HTMLElement, CollectionTabsProps>(
  function CollectionTabs(props, ref) {
    const { locale } = useT();
    const collections = getAiCollections();
    const listRef = useRef<HTMLDivElement>(null);
    const { active } = props;
    useSlidingIndicator(listRef, active, ".collection-tab");
    const first = useRef(true);
    const navRef = useRef<HTMLElement | null>(null);
    const [stuck, setStuck] = useState(false);

    // Stuck = the band's top edge sits on its sticky offset. The observer's top margin is that offset
    // plus one pixel and the only threshold is "fully inside": a band resting on its sticky line is
    // one pixel outside, a band still lower on the page (even if cut off at the bottom) is not.
    useEffect(() => {
      const nav = navRef.current;
      if (!nav || typeof IntersectionObserver === "undefined") return;
      let observer: IntersectionObserver | undefined;
      let frame = 0;
      const observe = () => {
        observer?.disconnect();
        const top = Math.round(Number.parseFloat(getComputedStyle(nav).top) || 0);
        observer = new IntersectionObserver(
          ([entry]) =>
            setStuck(!!entry && entry.intersectionRatio < 1 && entry.boundingClientRect.top <= top),
          { rootMargin: `-${top + 1}px 0px 0px 0px`, threshold: [1] },
        );
        observer.observe(nav);
      };
      observe();
      // --ai-tabs-top (the measured header height) is written by the parent after this effect.
      frame = window.requestAnimationFrame(observe);
      window.addEventListener("resize", observe);
      return () => {
        window.cancelAnimationFrame(frame);
        observer?.disconnect();
        window.removeEventListener("resize", observe);
      };
    }, []);

    const setNav = (node: HTMLElement | null) => {
      navRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    // Keep the current tab inside the row when it overflows (phones); no glide on first paint.
    useEffect(() => {
      const initial = first.current;
      first.current = false;
      const list = listRef.current;
      const tab = list?.querySelectorAll<HTMLElement>(".collection-tab")[active];
      if (!list || !tab || list.scrollWidth <= list.clientWidth + 2) return;
      const reduced = window.matchMedia(REDUCED).matches;
      list.scrollTo({
        left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
        behavior: reduced || initial ? "auto" : "smooth",
      });
    }, [active]);

    return (
      <nav
        ref={setNav}
        aria-label={props.label}
        className={cn("collection-tabs", props.className)}
        data-mode={props.mode}
        data-stuck={stuck ? "" : undefined}
      >
        <div className="collection-tabs-inner container-page">
          <div ref={listRef} className="collection-tabs-list">
            <span aria-hidden="true" data-slide-indicator className="slide-indicator" />
            {collections.map((collection, i) => {
              const short = collectionText(collection.shortTitle, locale);
              const title = collectionText(collection.title, locale);
              const current = i === active;
              return props.mode === "scroll" ? (
                <button
                  key={collection.slug}
                  type="button"
                  aria-current={current ? "true" : undefined}
                  aria-label={title}
                  data-current={current ? "" : undefined}
                  onClick={() => props.onSelect(i)}
                  className="collection-tab"
                >
                  {short}
                </button>
              ) : (
                <CollectionTabLink
                  key={collection.slug}
                  slug={collection.slug}
                  current={current}
                  label={short}
                />
              );
            })}
          </div>
        </div>
      </nav>
    );
  },
);

function CollectionTabLink({
  slug,
  current,
  label,
}: {
  slug: string;
  current: boolean;
  label: string;
}) {
  // aria-current is set on the element itself: LocaleLink passes extra attributes through.
  return (
    <LocaleLink
      to="/ai-worlds/collections/$slug"
      slug={slug}
      className="collection-tab"
      {...(current ? { "aria-current": "page", "data-current": "" } : {})}
    >
      {label}
    </LocaleLink>
  );
}
