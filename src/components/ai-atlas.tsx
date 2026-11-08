// "Chefo Around the World": the atlas cover, the destination index and destination pages.
// Planned destinations show elegant placeholders; a published destination shows its
// finished AiWork (same slug) with full-screen viewing and Copy Prompt.
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand } from "lucide-react";
import { collectionText, getAiCollection } from "@/content/ai-collections";
import {
  destinationText,
  getAdjacentDestinations,
  getDestinationWork,
  getDestinations,
  type Destination,
} from "@/content/ai-destinations";
import { getMessages, notFoundHead, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { Lightbox } from "@/components/site";
import { Surface } from "@/components/surface";
import { AiBackLink } from "@/components/ai-back-link";
import {
  ArtEdge,
  ArtImage,
  artworkAnchor,
  PromptNote,
  pad2,
  toLightboxItem,
} from "@/components/ai-exhibition";
import { reveal } from "@/hooks/use-reveal";
import { toolLabel } from "@/content/ai-works";
import { cn } from "@/lib/utils";

export const ATLAS_SLUG = "chefo-around-the-world";

/** Short name for indexes: use only location detail that is actually known. */
const shortName = (d: Destination, locale: Locale) =>
  destinationText(d.place ?? d.country ?? d.title, locale);

/** City and country when both are known; otherwise the most specific verified location. */
const whereLine = (d: Destination, locale: Locale) => {
  if (d.place && d.country) {
    return `${destinationText(d.place, locale)}, ${destinationText(d.country, locale)}`;
  }
  return destinationText(d.place ?? d.country ?? d.title, locale);
};

/** Small placeholder plate for a destination without a portrait yet. */
function PlannedPlate({ destination, large }: { destination: Destination; large?: boolean }) {
  const { t, locale } = useT();
  return (
    <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-sm bg-surface-raised/70">
      <span aria-hidden="true" className="absolute inset-2 rounded-[2px] border border-gold/20" />
      {large && (
        <span aria-hidden="true" className="absolute inset-5 rounded-[2px] border border-gold/10" />
      )}
      <span className="relative flex flex-col items-center gap-3 px-4 text-center">
        <span
          aria-hidden="true"
          className={cn("font-serif tabular-nums text-gold/70", large ? "text-6xl" : "text-2xl")}
        >
          {pad2(destination.order)}
        </span>
        {large && (
          <>
            <span className="font-serif text-2xl">{shortName(destination, locale)}</span>
            <span className="eyebrow text-muted-foreground">{t.ai.portraitPlanned}</span>
          </>
        )}
      </span>
    </div>
  );
}

function StyleTags({ destination }: { destination: Destination }) {
  const { t, locale } = useT();
  return (
    <ul className="flex flex-wrap gap-2">
      {destination.styles.map((s) => (
        <li
          key={s.kind}
          className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
        >
          {s.kind === "modern" ? t.ai.styleModern : t.ai.styleHistorical}
          {s.period && ` · ${destinationText(s.period, locale)}`}
        </li>
      ))}
    </ul>
  );
}

export const destinationHead = (locale: Locale, destination: Destination | undefined) => {
  if (!destination) return notFoundHead(locale);
  const m = getMessages(locale).ai;
  const atlas = getAiCollection(ATLAS_SLUG)!;
  return pageHead(
    locale,
    `/ai-worlds/${destination.slug}`,
    `${destinationText(destination.title, locale)} — ${collectionText(atlas.title, locale)} · ${m.title} · CHEFO`,
    getDestinationWork(destination, locale)?.description ?? destinationText(destination.description, locale),
    { type: "article" },
  );
};

/** One destination: portrait (or placeholder), creative brief, prompt and navigation. */
export function DestinationView({ destination: d }: { destination: Destination }) {
  const { t, locale } = useT();
  const m = t.ai;
  const atlas = getAiCollection(ATLAS_SLUG)!;
  const total = getDestinations().length;
  const work = getDestinationWork(d, locale);
  const { prev, next } = getAdjacentDestinations(d);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const viewerThumb = useRef<HTMLButtonElement>(null);
  const tool = work ? work.tool : d.tool;
  const details = work?.portraitDetails;

  const brief: [string, React.ReactNode][] = [
    [
      t.photos.place,
      <>
        {whereLine(d, locale)}
        {d.context && (
          <span className="block text-muted-foreground">{destinationText(d.context, locale)}</span>
        )}
      </>,
    ],
    ...(!work ? [[m.styleLabel, <StyleTags key="styles" destination={d} />] as [string, React.ReactNode]] : []),
    [m.clothing, destinationText(details?.clothing ?? d.clothing, locale)],
    [m.grooming, destinationText(details?.grooming ?? d.grooming, locale)],
    ...(!work ? [[m.inspiration, destinationText(d.inspiration, locale)] as [string, React.ReactNode]] : []),
    [m.settingLabel, destinationText(details?.setting ?? d.setting, locale)],
    ...(tool
      ? [[work ? m.tool : m.plannedTool, toolLabel(tool, locale)] as [string, React.ReactNode]]
      : []),
    [m.status, work ? m.statusPublished : m.statusPlanned],
  ];

  return (
    <Surface tone="dark" as="article">
      <nav aria-label={m.title} className="container-page pt-10 text-sm md:pt-14">
        <AiBackLink
          to="/ai-worlds/collections/$slug"
          slug={ATLAS_SLUG}
          // Only a published destination hangs in the collection with an anchor.
          hash={work ? artworkAnchor(d.slug) : undefined}
          label={m.backToCollection}
        />
        <ol className="mt-3 flex flex-wrap items-center gap-2 text-muted-foreground">
          <li>
            <LocaleLink to="/ai-worlds" className="interaction-link transition-colors">
              {m.title}
            </LocaleLink>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <LocaleLink
              to="/ai-worlds/collections/$slug"
              slug={ATLAS_SLUG}
              className="interaction-link transition-colors"
            >
              {collectionText(atlas.title, locale)}
            </LocaleLink>
          </li>
        </ol>
      </nav>

      <div
        className={cn(
          "container-page gap-10 pb-20 pt-8 lg:gap-12 lg:pb-28",
          work ? "flex flex-col" : "grid lg:grid-cols-12",
        )}
      >
        <div className={cn("space-y-8", work ? "mx-auto w-full max-w-[68rem]" : "lg:col-span-6")}>
          {work ? (
            <figure className="group relative overflow-hidden rounded-sm">
              <button
                ref={viewerThumb}
                type="button"
                onClick={() => setLightbox(0)}
                aria-label={t.common.openFullscreen(work.title)}
                className="interaction-media block w-full cursor-zoom-in"
              >
                <ArtImage work={work} eager className="object-contain motion-safe:group-hover:scale-100" />
                <span className="eyebrow absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-sm bg-navy/80 px-2 py-1 text-interaction-gold opacity-0 transition-opacity duration-(--dur-base) group-hover:opacity-100 group-focus-within:opacity-100">
                  <Expand aria-hidden="true" className="size-3.5" /> {m.fullscreen}
                </span>
              </button>
              <ArtEdge />
            </figure>
          ) : (
            <PlannedPlate destination={d} large />
          )}
          {d.video && (
            <figure>
              <video
                controls
                preload="none"
                playsInline
                src={d.video.src}
                poster={d.video.poster}
                aria-label={destinationText(d.video.title, locale)}
                className="w-full rounded-sm bg-surface-raised"
              />
              <figcaption className="mt-2 text-xs text-muted-foreground">
                {m.video}: {destinationText(d.video.title, locale)}
              </figcaption>
            </figure>
          )}
        </div>

        <div
          className={cn(
            work ? "mx-auto w-full max-w-[68rem]" : "lg:sticky lg:top-24 lg:col-span-6 lg:self-start",
          )}
        >
          <p className="eyebrow tabular-nums text-gold">
            {m.destinationLabel(`${pad2(d.order)} / ${pad2(total)}`)}
          </p>
          <h1 className="title-detail mt-5 break-words">{destinationText(d.title, locale)}</h1>
          {work && work.title !== destinationText(d.title, locale) && (
            <p className="mt-3 font-serif text-xl text-gold">{work.title}</p>
          )}
          <p className="mt-6 font-serif text-2xl leading-snug">
            {work?.description ?? destinationText(d.description, locale)}
          </p>
          <dl className="mt-8 divide-y divide-border border-y border-border text-sm">
            {brief.map(([key, value]) => (
              <div key={key} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <dt className="eyebrow pt-0.5 text-muted-foreground">{key}</dt>
                <dd className="leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>

          {work ? (
            <PromptNote work={work} prompt={work.prompt} />
          ) : (
            <section
              aria-labelledby="prompt-draft-h"
              className="mt-10 border-l border-gold/30 pl-5"
            >
              <h2 id="prompt-draft-h" className="eyebrow text-eyebrow">
                {m.promptDraft}
              </h2>
              <p lang="en" className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {d.promptDraft}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{m.promptDraftNote}</p>
            </section>
          )}
        </div>
      </div>

      {work && (
        <Lightbox
          items={[toLightboxItem(work, { meta: t.common.aiBadge })]}
          index={lightbox}
          onIndex={setLightbox}
          getThumb={() => viewerThumb.current}
          variant="artwork"
        />
      )}

      <nav
        aria-label={m.allDestinations}
        className="seam-top container-page grid grid-cols-2 gap-6 py-10 md:py-14"
      >
        {[
          { dest: prev, label: m.prevDestination, align: "start" as const, Icon: ArrowLeft },
          { dest: next, label: m.nextDestination, align: "end" as const, Icon: ArrowRight },
        ].map(({ dest, label, align, Icon }) => {
          const destWork = getDestinationWork(dest, locale);
          return (
            <LocaleLink
              key={align}
              to="/ai-worlds/$slug"
              slug={dest.slug}
              className={cn(
                "interaction-link group flex items-center gap-4 transition-colors",
                align === "end" && "flex-row-reverse text-right",
              )}
            >
              <span className="relative hidden w-14 shrink-0 overflow-hidden rounded-sm sm:block">
                {destWork ? <ArtImage work={destWork} /> : <PlannedPlate destination={dest} />}
              </span>
              <Icon aria-hidden="true" className="size-4 shrink-0 sm:hidden" />
              <span className="min-w-0">
                <span className="eyebrow block text-muted-foreground">{label}</span>
                <span className="mt-1 block font-serif text-lg leading-snug">
                  {destinationText(dest.title, locale)}
                </span>
              </span>
            </LocaleLink>
          );
        })}
      </nav>
    </Surface>
  );
}
