// Exhibition building blocks for AI Worlds: collection halls, exhibited works,
// and the discreet prompt note. Colors follow the dark Surface.
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Expand } from "lucide-react";
import {
  collectionText,
  getAiCollections,
  getCollectionCover,
  getCollectionWorkSlugs,
  type AiCollection,
} from "@/content/ai-collections";
import { AtlasCover } from "@/components/ai-atlas";
import {
  aiEraLabel,
  aiRoleLabel,
  aiSettingLabel,
  toolLabel,
  type AiWork,
} from "@/content/ai-works";
import type { LightboxItem } from "@/components/site";
import { reveal } from "@/hooks/use-reveal";
import { formatDate, useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

export const pad2 = (n: number) => String(n).padStart(2, "0");

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
 * One collection on the AI Worlds landing page: 4:5 cover and curatorial label, mirrored per row
 * from md up; on mobile the cover always comes first. The button is the hall's only focusable link;
 * the cover repeats it for pointer users and is hidden from assistive tech and the tab order.
 */
function CollectionHall({
  collection,
  index,
  total,
}: {
  collection: AiCollection;
  index: number;
  total: number;
}) {
  const { t, locale } = useT();
  const m = t.ai;
  const cover = getCollectionCover(collection, locale);
  const finished = getCollectionWorkSlugs(collection).length;
  const isAtlas = collection.kind === "destinations";
  const mirrored = index % 2 === 1;
  const titleId = `ai-collection-${collection.slug}-title`;
  return (
    <li {...reveal(0)}>
      <article className="grid items-center gap-8 md:grid-cols-12 md:gap-0">
        <LocaleLink
          to="/ai-worlds/collections/$slug"
          slug={collection.slug}
          aria-hidden="true"
          tabIndex={-1}
          className={cn(
            "group relative block overflow-hidden rounded-sm md:col-span-5 md:row-start-1",
            cover && "ai-frame-portal",
            mirrored ? "md:col-start-8" : "md:col-start-1",
          )}
        >
          {cover ? (
            <>
              <ArtImage work={cover} eager={index === 0} className="aspect-[4/5] object-cover" />
              <ArtEdge />
            </>
          ) : isAtlas ? (
            <AtlasCover className="aspect-[4/5]" />
          ) : (
            <EmptyCollectionCover className="aspect-[4/5]" />
          )}
        </LocaleLink>
        <div
          className={cn(
            "md:col-span-6 md:row-start-1",
            mirrored ? "md:col-start-1" : "md:col-start-7",
          )}
        >
          <p className="eyebrow text-eyebrow">
            {m.collectionNumber(pad2(index + 1), pad2(total))}
          </p>
          <h2 id={titleId} className="title-section mt-4 break-words text-foreground">
            {collectionText(collection.title, locale)}
          </h2>
          {collection.tagline && (
            <p className="mt-3 font-serif text-xl italic text-gold">
              {collectionText(collection.tagline, locale)}
            </p>
          )}
          <p className="lead mt-5 text-muted-foreground">
            {collectionText(collection.intro, locale)}
          </p>
          {finished > 0 && (
            <p className="mt-4 text-sm text-muted-foreground">{m.count(finished)}</p>
          )}
          <LocaleLink
            to="/ai-worlds/collections/$slug"
            slug={collection.slug}
            aria-describedby={titleId}
            className="cta-pill mt-8"
          >
            {m.exploreCollection}
            <span aria-hidden="true" className="cta-pill-badge">
              <ArrowRight className="cta-pill-arrow" />
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
    <ol className="mt-14 space-y-20 md:mt-20 md:space-y-24">
      {collections.map((collection, index) => (
        <CollectionHall
          key={collection.slug}
          collection={collection}
          index={index}
          total={collections.length}
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
            className="transition-colors duration-(--dur-base) after:absolute after:inset-0 group-hover:text-gold"
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

/** Small metadata line for a work: tool · date · era/setting/role where known. */
export function workFacts(work: AiWork, locale: "bg" | "en") {
  return [
    work.tool ? toolLabel(work.tool, locale) : null,
    work.date ? formatDate(work.date, locale) : null,
    work.era ? aiEraLabel(work.era, locale) : null,
    work.setting ? aiSettingLabel(work.setting, locale) : null,
    work.role ? aiRoleLabel(work.role, locale) : null,
  ].filter(Boolean) as string[];
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

/** Collection page: each work hung large at its own ratio, labels alternating sides. */
export function ExhibitionWall({
  works,
  onOpen,
}: {
  works: AiWork[];
  onOpen: (index: number) => void;
}) {
  const { t, locale } = useT();
  const m = t.ai;
  return (
    <ol className="container-page space-y-24 py-16 lg:space-y-36 lg:py-24">
      {works.map((work, index) => {
        const mirrored = index % 2 === 1;
        const facts = workFacts(work, locale);
        return (
          <li key={work.slug} {...reveal()}>
            <article className="grid items-end gap-8 lg:grid-cols-12 lg:items-stretch lg:gap-0">
              <figure
                className={cn(
                  "ai-frame-portal group relative overflow-hidden rounded-sm lg:col-span-7",
                  mirrored ? "lg:col-start-6 lg:row-start-1" : "lg:col-start-1",
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpen(index)}
                  aria-label={t.common.openFullscreen(work.title)}
                  className="block w-full cursor-zoom-in"
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
                  <h2 className="title-section break-words">
                    <LocaleLink
                      to="/ai-worlds/$slug"
                      slug={work.slug}
                      className="transition-colors hover:text-gold"
                    >
                      {work.title}
                    </LocaleLink>
                  </h2>
                  <p className="mt-5 font-serif text-xl leading-snug">{work.description}</p>
                  {facts.length > 0 && (
                    <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                      {facts.join(" · ")}
                    </p>
                  )}
                  <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold">
                    <LocaleLink
                      to="/ai-worlds/$slug"
                      slug={work.slug}
                      className="group/link inline-flex items-center gap-2 border-b border-gold/50 pb-1 transition-colors hover:border-gold hover:text-gold"
                      aria-label={`${m.viewWork}: ${work.title}`}
                    >
                      {m.viewWork}
                      <ArrowRight className="size-4 transition-transform motion-safe:group-hover/link:translate-x-1" />
                    </LocaleLink>
                    <button
                      type="button"
                      onClick={() => onOpen(index)}
                      className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold"
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
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-wait",
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
          className="mt-2 text-xs font-semibold underline decoration-border underline-offset-4 transition-colors hover:text-gold"
        >
          {expanded ? m.showLessPrompt : m.showFullPrompt}
        </button>
      )}
    </section>
  );
}
