import { useEffect, useState } from "react";
import {
  collectionText,
  getAdjacentCollections,
  getCollectionCover,
  type AiCollection,
} from "@/content/ai-collections";
import { deckCoverSrc } from "@/lib/deck-covers";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { cn } from "@/lib/utils";

/** Collection covers in the artwork navigation's visual language; each card is one link. */
export function AiCollectionNav({ collection }: { collection: AiCollection }) {
  const { t, locale } = useT();
  const { prev, next } = getAdjacentCollections(collection);
  const [pressed, setPressed] = useState<string | null>(null);
  useEffect(() => {
    if (!pressed) return;
    const release = () => setPressed(null);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [pressed]);
  return (
    <nav
      aria-label={t.ai.collections}
      className="ai-col-nav"
      onPointerDownCapture={(event) => {
        if (event.pointerType === "mouse" || !(event.target instanceof Element)) return;
        const link = event.target.closest<HTMLAnchorElement>(".ai-col-nav-card");
        if (link && event.currentTarget.contains(link)) {
          setPressed(link.pathname.split("/").at(-1) ?? null);
        }
      }}
    >
      {[
        { collection: prev, label: t.ai.prevCollection, next: false },
        { collection: next, label: t.ai.nextCollection, next: true },
      ].map(({ collection: target, label, next: forward }) => {
        const title = collectionText(target.title, locale);
        const cover = getCollectionCover(target, locale);
        const small = cover ? deckCoverSrc(cover) : undefined;
        return (
          <LocaleLink
            key={target.slug}
            to="/ai-worlds/collections/$slug"
            slug={target.slug}
            aria-label={`${label}: ${title}`}
            className={cn(
              "ai-col-nav-card ai-col-nav-card--image",
              forward && "ai-col-nav-card--next",
              pressed === target.slug && "ai-col-nav-card--pressed",
            )}
          >
            {cover && (
              <>
                <span className="ai-col-nav-backdrop" aria-hidden="true">
                  <img
                    src={small}
                    alt=""
                    aria-hidden="true"
                    width={cover.width ?? 1024}
                    height={cover.height ?? 1280}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="ai-col-nav-thumb" aria-hidden="true">
                  <img
                    src={cover.image}
                    {...(small !== cover.image
                      ? {
                          srcSet: `${small} 96w, ${cover.image} ${cover.width ?? 1024}w`,
                          sizes: "(min-width: 1400px) 112px, (min-width: 1049px) 8vw, 80px",
                        }
                      : {})}
                    alt=""
                    aria-hidden="true"
                    width={cover.width ?? 1024}
                    height={cover.height ?? 1280}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
              </>
            )}
            <span className="ai-col-nav-copy">
              <small>
                {!forward && <span aria-hidden="true">← </span>}
                {label}
                {forward && <span aria-hidden="true"> →</span>}
              </small>
              <b>{title}</b>
              <span className="ai-col-nav-arrow" aria-hidden="true">
                <svg viewBox="0 0 56 20" focusable="false">
                  <path
                    d={forward ? "M1 10h52m-9-8 9 8-9 8" : "M55 10H2m9-8-9 8 9 8"}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </span>
            </span>
          </LocaleLink>
        );
      })}
    </nav>
  );
}
