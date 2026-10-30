// Exhibition building blocks for AI Worlds: collection halls, exhibited works,
// and the discreet prompt note. Colors follow the dark Surface.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Copy, Expand } from "lucide-react";
import {
  collectionText,
  getAiCollections,
  getCollectionCover,
  getCollectionWorkSlugs,
  type AiCollection,
} from "@/content/ai-collections";
import { AtlasCover } from "@/components/ai-atlas";
import { toolLabel, type AiWork } from "@/content/ai-works";
import type { LightboxItem } from "@/components/site";
import { reveal } from "@/hooks/use-reveal";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

export const pad2 = (n: number) => String(n).padStart(2, "0");

const collectionBackgrounds = {
  "historical-eras-rulers": {
    image: "historical",
    position: "62% 38%",
    mobilePosition: "35% 0%",
    overlay: 0.15,
    mobileOverlay: 0.12,
    brightness: 1.35,
  },
  "professions-roles": {
    image: "professions",
    position: "58% 45%",
    mobilePosition: "58% 45%",
    overlay: 0.3,
    mobileOverlay: 0.3,
    brightness: 1.25,
  },
  "cinema-archetypes": {
    image: "cinema",
    position: "72% 32%",
    mobilePosition: "72% 32%",
    overlay: 0.07,
    mobileOverlay: 0.3,
    brightness: 1.25,
  },
  "chefo-around-the-world": {
    image: "world",
    position: "68% 38%",
    mobilePosition: "68% 38%",
    overlay: 0.45,
    mobileOverlay: 0.2,
    brightness: 1.25,
  },
} as const;

type CollectionBackground = (typeof collectionBackgrounds)[keyof typeof collectionBackgrounds];

/** Decorative atmosphere for a collection hall; it never becomes artwork content or a control. */
function CollectionAtmosphere({ background }: { background: CollectionBackground }) {
  const style = {
    "--ai-section-bg-position": background.position,
    "--ai-section-bg-mobile-position": background.mobilePosition,
    "--ai-section-bg-overlay": background.overlay,
    "--ai-section-bg-mobile-overlay": background.mobileOverlay,
    "--ai-section-bg-brightness": background.brightness,
  } as CSSProperties;
  return (
    <div
      aria-hidden="true"
      data-ai-section-background={background.image}
      className="ai-section-background"
      style={style}
    >
      <picture aria-hidden="true">
        <source
          media="(max-width: 768px)"
          srcSet={`/background/ai-bg-${background.image}-960.webp`}
        />
        <img
          aria-hidden="true"
          src={`/background/ai-bg-${background.image}-1600.webp`}
          alt=""
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
        />
      </picture>
    </div>
  );
}

/** Soft gold edge that answers hover and keyboard focus on an artwork. */
export function ArtEdge() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-gold/0 transition-shadow duration-(--dur-base) ease-cinematic group-hover:ring-gold/35 group-focus-within:ring-gold/60"
    />
  );
}

/** An artwork image at its own proportions (no cropping), with a slow, slight zoom. */
export function ArtImage({
  work,
  eager,
  className,
}: {
  work: Pick<AiWork, "image" | "alt" | "width" | "height">;
  eager?: boolean;
  className?: string;
}) {
  return (
    <img
      src={work.image}
      alt={work.alt}
      width={work.width}
      height={work.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : {})}
      className={cn(
        "h-auto w-full transition-transform duration-(--dur-slow) ease-cinematic motion-safe:group-hover:scale-[1.02]",
        className,
      )}
    />
  );
}

/** Empty collection cover: a double gold hairline frame instead of a borrowed image. */
function EmptyCollectionCover({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-sm bg-surface-raised/60",
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-4 rounded-sm border border-gold/25" />
      <span aria-hidden="true" className="absolute inset-6 rounded-[2px] border border-gold/10" />
      <span className="relative flex flex-col items-center gap-4 px-8 text-center">
        <span aria-hidden="true" className="font-serif text-4xl text-gold/70">
          ✦
        </span>
      </span>
    </div>
  );
}

/**
 * Pointer users can open a hall from anywhere on it; keyboard and screen-reader users reach the
 * same place through its one link. The click is handed to that link (modifier keys included), so
 * the router and "open in new tab" behave as if the link itself was clicked.
 */
function openHall(event: React.MouseEvent<HTMLElement>) {
  const link = event.currentTarget.querySelector<HTMLAnchorElement>(".ai-presentation-link");
  if (!link || event.defaultPrevented || link.contains(event.target as Node)) return;
  // Selecting the curatorial text is not a request to leave the page.
  if (window.getSelection()?.type === "Range") return;
  link.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: event.button,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    }),
  );
}

/** One collection on the AI Worlds landing page: cover and curatorial label, mirrored per row. */
function CollectionHall({ collection, index }: { collection: AiCollection; index: number }) {
  const { t, locale } = useT();
  const m = t.ai;
  const cover = getCollectionCover(collection, locale);
  const finished = getCollectionWorkSlugs(collection).length;
  const isAtlas = collection.kind === "destinations";
  const mirrored = index % 2 === 1;
  const title = collectionText(collection.title, locale);
  const background = collectionBackgrounds[collection.slug as keyof typeof collectionBackgrounds];
  return (
    <li {...reveal(0)}>
      {/* Only the title and the button light up; the photo answers with its own slight zoom. */}
      <article
        onClick={openHall}
        className="ai-presentation ai-overview-hall relative isolate grid cursor-pointer items-center gap-8 overflow-hidden md:grid-cols-12 md:gap-0"
      >
        {background && <CollectionAtmosphere background={background} />}
        <div
          className={cn(
            "ai-presentation-media group relative overflow-hidden rounded-sm md:col-span-6",
            mirrored ? "md:col-start-7 md:row-start-1" : "md:col-start-1",
          )}
        >
          {cover ? (
            <>
              <ArtImage work={cover} eager={index === 0} />
              <ArtEdge />
            </>
          ) : isAtlas ? (
            <AtlasCover className="aspect-[4/5]" />
          ) : (
            <EmptyCollectionCover className="aspect-[4/3] md:aspect-[4/5]" />
          )}
        </div>
        <div
          className={cn(
            "md:col-span-5 md:row-start-1",
            mirrored ? "md:col-start-1" : "md:col-start-8",
          )}
        >
          <h2 className="ai-presentation-title title-section break-words">{title}</h2>
          {collection.tagline && (
            <p className="mt-3 font-serif text-xl italic text-gold">
              {collectionText(collection.tagline, locale)}
            </p>
          )}
          <p className="lead mt-5 text-muted-foreground">
            {collectionText(collection.intro, locale)}
          </p>
          {finished > 0 && (
            <p className="mt-6 text-sm text-muted-foreground">{m.count(finished)}</p>
          )}
          <LocaleLink
            to="/ai-worlds/collections/$slug"
            slug={collection.slug}
            aria-label={`${m.exploreCollection}: ${title}`}
            className="ai-presentation-link mt-8 inline-flex"
          >
            <span className="interaction-primary ai-artwork-action ai-artwork-action-primary text-sm font-semibold">
              {m.exploreCollection}
              <ArrowRight className="ai-artwork-action-arrow size-4" />
            </span>
          </LocaleLink>
        </div>
      </article>
    </li>
  );
}

export function CollectionHalls() {
  const collections = getAiCollections();
  return (
    <ol className="mt-14 space-y-24 md:mt-20 md:space-y-32">
      {collections.map((collection, index) => (
        <CollectionHall
          key={collection.slug}
          collection={collection}
          index={index}
        />
      ))}
    </ol>
  );
}

/** A work in the All Artworks gallery: image at its own ratio and a museum-style label. */
export function ExhibitWork({ work, index }: { work: AiWork; index: number }) {
  const { t, locale } = useT();
  const provider =
    work.tool === "ChatGPT Image Generation" || work.tool === "Gemini Nano Banana"
      ? toolLabel(work.tool, locale)
      : null;
  return (
    <article
      className={cn(
        "group relative min-w-0",
        index % 2 === 1 && "sm:mt-16 lg:mt-0",
        index % 3 === 1 && "lg:mt-20",
      )}
      {...reveal(index)}
    >
      <div className="ai-frame-compact relative overflow-hidden rounded-sm bg-surface-raised">
        <ArtImage work={work} />
        <ArtEdge />
        <span className="eyebrow absolute left-3 top-3 rounded-sm bg-navy/80 px-2 py-1 text-gold">
          {t.common.aiBadge}
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="title-card">
          <LocaleLink
            to="/ai-worlds/$slug"
            slug={work.slug}
            className="transition-colors duration-(--dur-base) after:absolute after:inset-0 group-hover:text-interaction-gold"
          >
            {work.title}
          </LocaleLink>
        </h3>
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 text-gold opacity-0 transition-[opacity,translate] duration-(--dur-base) ease-cinematic group-hover:opacity-100 motion-safe:-translate-x-1 motion-safe:group-hover:translate-x-0"
        />
      </div>
      {provider && (
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground">{provider}</p>
        </div>
      )}
    </article>
  );
}

export const toLightboxItem = (work: AiWork): LightboxItem => ({
  slug: work.slug,
  image: work.image,
  alt: work.alt,
  title: work.title,
  width: work.width,
  height: work.height,
  caption: work.description,
});

/** Anchor of a work on its collection page; detail pages link back to it. */
export const artworkAnchor = (slug: string) => `artwork-${slug}`;

/**
 * After the router has scrolled a collection to the work in the URL hash, moves focus to
 * that work's main link so keyboard and screen-reader users continue from there. A restored
 * Back/Forward position that shows other works keeps focus where it was.
 */
function useFocusLinkedWork() {
  // Detail pages are separate routes, so the wall mounts again on every return.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const raf = requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (!target) return;
      const { top } = target.getBoundingClientRect();
      if (top < 0 || top >= window.innerHeight) return;
      target
        .querySelector<HTMLElement>(".ai-artwork-action-primary")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(raf);
  }, []);
}

/** Collection page: each work hung large at its own ratio, labels alternating sides. */
export function ExhibitionWall({
  works,
  onOpen,
}: {
  works: AiWork[];
  onOpen: (index: number, trigger: HTMLButtonElement) => void;
}) {
  const { t, locale } = useT();
  const m = t.ai;
  useFocusLinkedWork();
  return (
    <ol className="container-page space-y-24 py-16 lg:space-y-36 lg:py-24">
      {works.map((work, index) => {
        const mirrored = index % 2 === 1;
        return (
          // The scroll margin keeps a linked work clear of the sticky header.
          <li key={work.slug} id={artworkAnchor(work.slug)} className="scroll-mt-20" {...reveal()}>
            {/* The title and "view" light up together; the link and the button stay independent. */}
            <article className="ai-presentation grid items-end gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-0">
              <figure
                className={cn(
                  "ai-presentation-media group relative overflow-hidden rounded-sm lg:col-span-7",
                  mirrored ? "lg:col-start-6 lg:row-start-1" : "lg:col-start-1",
                )}
              >
                <button
                  type="button"
                  onClick={(event) => onOpen(index, event.currentTarget)}
                  aria-label={t.common.openFullscreen(work.title)}
                  className="interaction-media block w-full cursor-zoom-in"
                >
                  <ArtImage work={work} eager={index === 0} />
                </button>
                <ArtEdge />
              </figure>
              <div
                className={cn(
                  "lg:col-span-4 lg:row-start-1 lg:grid lg:grid-rows-[minmax(0,1.7fr)_auto_minmax(0,1fr)]",
                  mirrored ? "lg:col-start-1" : "lg:col-start-9",
                )}
              >
                <div data-exhibit-copy-content className="lg:row-start-2">
                  <h2 className="ai-presentation-title title-section break-words">
                    <LocaleLink to="/ai-worlds/$slug" slug={work.slug}>
                      {work.title}
                    </LocaleLink>
                  </h2>
                  <p className="mt-5 font-serif text-xl leading-snug">{work.description}</p>
                  <div className="mt-7 flex flex-wrap items-center gap-3 text-sm font-semibold">
                    <LocaleLink
                      to="/ai-worlds/$slug"
                      slug={work.slug}
                      className="interaction-primary ai-artwork-action ai-artwork-action-primary group/link w-full sm:w-auto"
                      aria-label={`${m.viewWork}: ${work.title}`}
                    >
                      {m.viewWork}
                      <ArrowRight className="ai-artwork-action-arrow size-4" />
                    </LocaleLink>
                    <button
                      type="button"
                      onClick={(event) => onOpen(index, event.currentTarget)}
                      className="interaction-secondary ai-artwork-action ai-artwork-action-secondary w-full sm:w-auto"
                    >
                      <Expand aria-hidden="true" className="size-4" /> {m.fullscreen}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

/** Discreet editorial prompt with expandable text. */
export function PromptNote({ prompt }: { work: AiWork; prompt: string }) {
  const { t } = useT();
  const m = t.ai;
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);
  const hasPrompt = Boolean(prompt.trim());
  const long = prompt.length > 220;

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    window.clearTimeout(resetTimer.current);
    setCopied(false);
    setCopyError(false);
    setCopying(true);
    const result = await copyText(prompt);
    setCopying(false);
    if (result === "ok") {
      setCopied(true);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } else setCopyError(true);
  };

  return (
    <section aria-labelledby="prompt-h" className="mt-10 border-l border-gold/50 pl-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="prompt-h" className="eyebrow text-eyebrow">{m.prompt}</h2>
        {hasPrompt && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={copying}
            className={cn(
              "interaction-control inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold disabled:cursor-wait",
              copied
                ? "border-gold bg-gold text-navy"
                : "border-gold/60 bg-navy text-gold hover:border-gold hover:bg-surface-raised",
            )}
          >
            {copied ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
            <span>{copied ? m.copiedPromptButton : m.copyPromptButton}</span>
          </button>
        )}
      </div>
      {copied && (
        <span role="status" className="sr-only">
          {m.copiedPromptButton}
        </span>
      )}
      {copyError && (
        <p role="alert" className="mt-2 text-xs text-gold">
          {m.copyPromptError}
        </p>
      )}
      {hasPrompt ? (
        <p
          id="prompt-text"
          lang="en"
          className={cn(
            "mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground",
            long && !expanded && "line-clamp-4",
          )}
        >
          {prompt}
        </p>
      ) : null}
      {hasPrompt && long && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="prompt-text"
          onClick={() => setExpanded((e) => !e)}
          className="interaction-link mt-2 text-xs font-semibold underline decoration-border underline-offset-4 transition-colors"
        >
          {expanded ? m.showLessPrompt : m.showFullPrompt}
        </button>
      )}
    </section>
  );
}
