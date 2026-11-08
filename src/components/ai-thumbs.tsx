// The compact artwork grid of the approved mock (.cgrid / .th): 4:5 tiles with a small "AI"
// chip and a two-line serif caption. All works (a tile opens the artwork page, as before) and
// a collection page (the image opens the full-screen viewer, the caption opens the artwork page,
// and each tile carries the return anchor of its work).
import type { CSSProperties } from "react";
import type { AiWork } from "@/content/ai-works";
import { artworkAnchor } from "@/components/ai-exhibition";
import { useFocusLinkedWork } from "@/hooks/use-focus-linked-work";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

/** Entrance stagger per tile and the most steps it adds up to (the mock's 32 ms, 16 steps). */
const STAGGER_MS = 32;
const STAGGER_STEPS = 16;
const tileStyle = (index: number) =>
  ({ "--thumb-delay": `${Math.min(index, STAGGER_STEPS) * STAGGER_MS}ms` }) as CSSProperties;

function ThumbImage({ work }: { work: AiWork }) {
  const { t } = useT();
  return (
    <>
      <img
        src={work.image}
        alt={work.alt}
        width={work.width ?? 1024}
        height={work.height ?? 1280}
        loading="lazy"
        decoding="async"
      />
      <span aria-hidden="true" className="ai-thumb-chip">
        {t.common.aiShort}
      </span>
    </>
  );
}

/** All works: each tile is one link to the artwork page. */
export function AiWorksGrid({ works, label }: { works: AiWork[]; label: string }) {
  return (
    <section aria-label={label}>
      <ul className="ai-thumb-grid">
        {works.map((work, index) => (
          <li key={work.slug} className="ai-thumb" style={tileStyle(index)}>
            <LocaleLink to="/ai-worlds/$slug" slug={work.slug} className="ai-thumb-link">
              <span className="ai-thumb-im">
                <ThumbImage work={work} />
              </span>
              <span className="ai-thumb-title">{work.title}</span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Collection page: the image opens the viewer, the caption opens the artwork page. */
export function AiCollectionGrid({
  works,
  onOpen,
}: {
  works: AiWork[];
  onOpen: (index: number, trigger: HTMLButtonElement) => void;
}) {
  const { t } = useT();
  useFocusLinkedWork(".ai-thumb-title");
  return (
    <ol className="ai-thumb-grid">
      {works.map((work, index) => (
        // The scroll margin keeps a linked work clear of the header and the sticky tab band.
        <li
          key={work.slug}
          id={artworkAnchor(work.slug)}
          className="ai-thumb"
          style={tileStyle(index)}
        >
          <button
            type="button"
            onClick={(event) => onOpen(index, event.currentTarget)}
            aria-label={t.common.openFullscreen(work.title)}
            className="ai-thumb-im"
          >
            <ThumbImage work={work} />
          </button>
          <LocaleLink to="/ai-worlds/$slug" slug={work.slug} className="ai-thumb-title">
            {work.title}
          </LocaleLink>
        </li>
      ))}
    </ol>
  );
}
