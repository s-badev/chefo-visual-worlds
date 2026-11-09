// Exhibition building blocks for AI Worlds: collection scenes, artwork images, return anchors
// and the discreet prompt note. Colors follow the dark Surface.
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AiCollection } from "@/content/ai-collections";
import type { AiWork } from "@/content/ai-works";
import type { LightboxItem } from "@/components/site";
import { useT } from "@/i18n";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Each collection's own backdrop scene (overview hall and collection page); its look is tuned
 * in styles.css (one place). */
const collectionBackgrounds = {
  "historical-eras-rulers": "historical",
  "professions-roles": "professions",
  "cinema-archetypes": "cinema",
  "chefo-around-the-world": "world",
} as const;

type CollectionBackground = (typeof collectionBackgrounds)[keyof typeof collectionBackgrounds];

const getCollectionBackground = (collection: AiCollection): CollectionBackground | undefined =>
  collectionBackgrounds[collection.slug as keyof typeof collectionBackgrounds];

/**
 * Decorative, blurred scene of a collection; it never becomes artwork content or a control.
 * "hall" fills one hall on /ai-worlds; "page" stays put behind a whole collection page (sticky)
 * while the works scroll over it.
 */
export function CollectionAtmosphere({
  collection,
  eager,
  variant,
}: {
  collection: AiCollection;
  eager: boolean;
  variant: "hall" | "page";
}) {
  const image = getCollectionBackground(collection);
  if (!image) return null;
  return (
    <div
      aria-hidden="true"
      data-ai-section-background={image}
      className={variant === "page" ? "ai-col-bd" : "ai-hall-bg"}
    >
      <picture aria-hidden="true" className={variant === "page" ? "ai-col-st" : undefined}>
        <source media="(max-width: 767px)" srcSet={`/background/ai-bg-${image}-960.webp`} />
        <img
          aria-hidden="true"
          src={`/background/ai-bg-${image}-1600.webp`}
          alt=""
          width={1600}
          height={900}
          loading={eager ? "eager" : "lazy"}
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
      className="pointer-events-none absolute inset-0 rounded-sm ring-1 ring-inset ring-interaction-gold/0 transition-shadow duration-(--dur-base) ease-cinematic group-hover:ring-interaction-gold/35 group-focus-within:ring-interaction-gold/60"
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

/**
 * A work in the viewer. `meta` is the gold eyebrow line (AI generation · collection); `detail`
 * offers the artwork page, left out when the viewer is opened on that page.
 */
export const toLightboxItem = (
  work: AiWork,
  options: { meta?: string | undefined; detail?: boolean } = {},
): LightboxItem => ({
  slug: work.slug,
  image: work.image,
  alt: work.alt,
  title: work.title,
  width: work.width,
  height: work.height,
  caption: work.description,
  meta: options.meta,
  detail: options.detail ? { to: "/ai-worlds/$slug", slug: work.slug } : undefined,
});

/** Anchor of a work on its collection page; detail pages link back to it. */
export const artworkAnchor = (slug: string) => `artwork-${slug}`;

/**
 * The artwork's prompt as in the approved mock (.pr): a gold serif label, the copy button, the
 * reconstruction note for reconstructed prompts, six lines of text and "Show full prompt".
 */
export function PromptNote({ work, prompt }: { work: AiWork; prompt: string }) {
  const { t } = useT();
  const m = t.ai;
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);
  const hasPrompt = Boolean(prompt.trim());
  const long = prompt.length > 220;
  const reconstructed = work.promptKind === "illustrative";

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
    <section aria-labelledby="prompt-h" className="ai-prompt">
      <div className="ai-prompt-head">
        <h2 id="prompt-h" className="ai-prompt-label">
          {reconstructed ? m.promptRecon : m.prompt}
        </h2>
        {hasPrompt && (
          <button
            type="button"
            onClick={handleCopy}
            disabled={copying}
            className={cn(
              "ai-prompt-copy interaction-control interaction-text-button inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border py-2 text-xs font-semibold disabled:cursor-wait",
              copied
                ? "border-gold bg-gold text-navy"
                : "border-gold/60 bg-navy text-gold hover:border-interaction-gold hover:bg-surface-raised",
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
      {hasPrompt && reconstructed && <p className="ai-prompt-note">{m.promptReconNote}</p>}
      {hasPrompt ? (
        <p
          id="prompt-text"
          lang="en"
          data-clamped={long && !expanded ? "true" : undefined}
          className="ai-prompt-text whitespace-pre-wrap"
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
          className="ai-prompt-more interaction-link interaction-text-button transition-colors"
        >
          {expanded ? m.showLessPrompt : m.showFullPrompt}
        </button>
      )}
    </section>
  );
}
