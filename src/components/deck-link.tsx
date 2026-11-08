import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { AlbumStamp } from "@/components/album-stamp";
import { albumText, getAlbums } from "@/content/albums";
import { getAiCollections, getCollectionCover } from "@/content/ai-collections";
import { LocaleLink } from "@/i18n/link";
import { deckCoverSrc } from "@/lib/deck-covers";

/** One mini item of the deck: an album stamp or a small cover image. */
export type DeckItem =
  | { type: "stamp"; key: string; index: number; title: string; count: number; total: number }
  | { type: "image"; key: string; src: string };

/** Albums whose stamps make the "all albums" deck: three different stamps of the route. */
const DECK_ALBUM_INDEXES = [0, 4, 8] as const;

function defaultItems(kind: DeckLinkProps["kind"]): DeckItem[] {
  if (kind === "albums") {
    const albums = getAlbums();
    return DECK_ALBUM_INDEXES.flatMap((index) => {
      const album = albums[index];
      return album
        ? [
            {
              type: "stamp" as const,
              key: album.slug,
              index,
              title: albumText(album.title, "en"),
              count: album.photos.length,
              total: albums.length,
            },
          ]
        : [];
    });
  }
  return getAiCollections().flatMap((collection) => {
    const cover = getCollectionCover(collection, "bg");
    return cover
      ? [{ type: "image" as const, key: collection.slug, src: deckCoverSrc(cover) }]
      : [];
  });
}

export interface DeckLinkProps {
  to: "/photography" | "/ai-worlds";
  label: string;
  kind: "albums" | "ai";
  items?: DeckItem[];
  className?: string;
}

/**
 * Pill link with a small fanned deck of three items, the label and a round arrow. The deck and
 * the arrow are decorative: the accessible name is the label only. Colours follow the section
 * through --dl-base (see .deck-link in styles.css).
 */
export function DeckLink({ to, label, kind, items, className }: DeckLinkProps) {
  const deck = (items ?? defaultItems(kind)).slice(0, 3);
  return (
    <LocaleLink
      to={to}
      className={`deck-link${className ? ` ${className}` : ""}`}
      data-deck-kind={kind}
    >
      <span className="deck-link-deck" aria-hidden="true">
        {deck.map((item, i) => (
          <span
            key={item.key}
            className={`deck-link-item${item.type === "stamp" ? " deck-link-item--stamp" : ""}`}
            style={{ "--i": i } as CSSProperties}
          >
            {item.type === "stamp" ? (
              <AlbumStamp
                index={item.index}
                title={item.title}
                count={item.count}
                total={item.total}
                size={30}
                shape="round"
                ink="currentColor"
              />
            ) : (
              <img src={item.src} alt="" width={30} height={38} loading="lazy" decoding="async" />
            )}
          </span>
        ))}
      </span>
      <span className="deck-link-label">{label}</span>
      <span className="deck-link-arrow" aria-hidden="true">
        <ArrowRight className="deck-link-arrow-out" />
        <ArrowRight className="deck-link-arrow-in" />
      </span>
    </LocaleLink>
  );
}
