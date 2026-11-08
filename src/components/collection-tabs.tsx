import { forwardRef, useEffect, useRef } from "react";
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
 * keeps the current tab in view.
 */
export const CollectionTabs = forwardRef<HTMLElement, CollectionTabsProps>(
  function CollectionTabs(props, ref) {
    const { locale } = useT();
    const collections = getAiCollections();
    const listRef = useRef<HTMLDivElement>(null);
    const { active } = props;
    useSlidingIndicator(listRef, active, ".collection-tab");
    const first = useRef(true);

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
        ref={ref}
        aria-label={props.label}
        className={cn("collection-tabs", props.className)}
        data-mode={props.mode}
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
