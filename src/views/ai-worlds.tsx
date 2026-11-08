import { useNavigate, useSearch } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand } from "lucide-react";
import {
  aiWorks,
  aiCategoryLabel,
  aiEraLabel,
  aiRoleLabel,
  aiSettingLabel,
  filterAiWorks,
  getAiFilterOptions,
  localizeAiWork,
  toolLabel,
  type AiWork,
} from "@/content/ai-works";
import {
  collectionText,
  getAiCollections,
  getAdjacentCollections,
  getCollectionCover,
  getCollectionForWork,
  getCollectionWorks,
  type AiCollection,
} from "@/content/ai-collections";
import { EmptyState, Lightbox, PageHeader } from "@/components/site";
import { Surface } from "@/components/surface";
import { AiFilterBar, countActiveFilters, type AiFilterValues } from "@/components/ai-filters";
import {
  ArtEdge,
  ArtImage,
  artworkAnchor,
  CollectionAtmosphere,
  ExhibitWork,
  ExhibitionWall,
  PromptNote,
  toLightboxItem,
} from "@/components/ai-exhibition";
import { AiBackLink } from "@/components/ai-back-link";
import { HomeWorlds } from "@/components/home-worlds";
import { CollectionTabs } from "@/components/collection-tabs";
import { useSlidingIndicator } from "@/hooks/use-sliding-indicator";
import { WorldSlider } from "@/components/world-slider";
import { destinationText, getDestination } from "@/content/ai-destinations";
import { cn } from "@/lib/utils";
import { formatDate, getMessages, notFoundHead, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export type AiSearch = AiFilterValues & { view?: "works" | undefined };

export const validateAiSearch = (s: Record<string, unknown>): AiSearch => {
  const options = getAiFilterOptions();
  return {
    view: s["view"] === "works" ? "works" : undefined,
    category: options.categories.find((value) => value === s["category"]),
    role: options.roles.find((value) => value === s["role"]),
    era: options.eras.find((value) => value === s["era"]),
    setting: options.settings.find((value) => value === s["setting"]),
    tool: options.tools.find((value) => value === s["tool"]),
  };
};

export const aiWorldsHead = (locale: Locale) => {
  const m = getMessages(locale).ai;
  return pageHead(locale, "/ai-worlds", m.metaTitle, m.metaDesc);
};

const NO_FILTERS: AiFilterValues = {
  category: undefined,
  role: undefined,
  era: undefined,
  setting: undefined,
  tool: undefined,
};

/**
 * AI Worlds landing: the world slider on top, then the intro with the view switch. Collections
 * is the pinned "One face, four worlds" scene; All Artworks (with filters) is the second view.
 */
export function AiWorldsView() {
  const { t, locale } = useT();
  const m = t.ai;
  const search = useSearch({ strict: false }) as AiSearch;
  const filters: AiFilterValues = {
    category: search.category,
    role: search.role,
    era: search.era,
    setting: search.setting,
    tool: search.tool,
  };
  const activeFilters = countActiveFilters(filters);
  // Any filter in the URL opens All Artworks, so older deep links keep working.
  const view = search.view === "works" || activeFilters > 0 ? "works" : "collections";
  const navigate = useNavigate();
  const set = (patch: AiSearch) =>
    navigate({
      to: ".",
      search: (p: Record<string, unknown>) => ({ ...p, ...patch }),
      replace: true,
    });
  const items = filterAiWorks(aiWorks, filters).map((w) => localizeAiWork(w, locale));
  const switchRef = useRef<HTMLDivElement>(null);
  useSlidingIndicator(switchRef, view === "works" ? 1 : 0, ".ai-view-switch-tab");

  return (
    <>
      <WorldSlider />

      <Surface tone="dark" as="div" className="ai-overview">
        <div className="ai-overview-intro container-page pt-16 md:pt-24">
          {/* Shrink-wrapped so the local text scrim sits behind the text and tabs only. */}
          <div className="ai-overview-intro-text">
            <PageHeader eyebrow={m.eyebrow} title={m.title} intro={m.intro} />

            {/* Segmented switch; selected and hover states live in styles.css (.ai-view-switch). */}
            <div ref={switchRef} role="group" aria-label={m.view} className="ai-view-switch mt-12">
              <span aria-hidden="true" data-slide-indicator className="slide-indicator" />
              <button
                type="button"
                aria-pressed={view === "collections"}
                onClick={() => set({ view: undefined, ...NO_FILTERS })}
                className="ai-view-switch-tab"
              >
                {m.collections}
              </button>
              <button
                type="button"
                aria-pressed={view === "works"}
                onClick={() => set({ view: "works" })}
                className="ai-view-switch-tab"
              >
                {m.allWorks}
              </button>
            </div>
          </div>
        </div>

        {view === "works" && (
          <div className="pb-16 duration-300 motion-safe:animate-in motion-safe:fade-in-0 md:pb-24">
            <div className="container-page mt-8">
              <AiFilterBar values={filters} count={items.length} onChange={(p) => set(p)} />
              {items.length ? (
                <section
                  aria-label={m.allWorks}
                  className="mt-12 grid grid-cols-1 items-start gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {items.map((work, i) => (
                    <ExhibitWork key={work.slug} work={work} index={i} />
                  ))}
                </section>
              ) : (
                <EmptyState text={m.empty} onClear={() => set(NO_FILTERS)} />
              )}
            </div>
          </div>
        )}
      </Surface>

      {/* A sibling of the overview, so the scene keeps the look it had on Home: the .ai-overview
          rules for the old halls (intro reach, clip) never reach it. */}
      {view === "collections" && (
        <div className="duration-300 motion-safe:animate-in motion-safe:fade-in-0">
          <HomeWorlds />
        </div>
      )}
    </>
  );
}

export const aiCollectionHead = (locale: Locale, collection: AiCollection | undefined) => {
  if (!collection) return notFoundHead(locale);
  return pageHead(
    locale,
    `/ai-worlds/collections/${collection.slug}`,
    `${collectionText(collection.title, locale)} — ${getMessages(locale).ai.title} · CHEFO`,
    collectionText(collection.intro, locale),
  );
};

export function AiCollectionNotFoundView() {
  const { t } = useT();
  return (
    <Surface tone="dark" as="div" className="px-5 py-32 text-center">
      <h1 className="text-4xl">{t.ai.collectionNotFound}</h1>
      <LocaleLink to="/ai-worlds" className="interaction-link mt-6 inline-block border-b border-gold pb-1">
        {t.ai.backToCollections}
      </LocaleLink>
    </Surface>
  );
}

/** A collection presented as an exhibition wall. */
export function AiCollectionView({ collection }: { collection: AiCollection }) {
  const { t, locale } = useT();
  const m = t.ai;
  const works = getCollectionWorks(collection, locale);
  const { prev, next } = getAdjacentCollections(collection);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const lightboxTrigger = useRef<HTMLButtonElement | null>(null);
  return (
    // The same scene as this collection's hall on the overview stays behind the page.
    <Surface tone="dark" as="article" className="ai-collection-page">
      <CollectionAtmosphere collection={collection} eager page />
      <header className="ai-collection-copy container-page pt-10 md:pt-14">
        <AiBackLink to="/ai-worlds" label={m.backToAiWorlds} />
        <div className="mt-10 grid gap-6 md:grid-cols-12 md:items-end">
          <div className="min-w-0 md:col-span-8">
            <h1 className="ai-collection-title break-words">
              {collectionText(collection.title, locale)}
            </h1>
            {collection.tagline && (
              <p className="mt-4 font-serif text-2xl italic text-gold md:text-3xl">
                {collectionText(collection.tagline, locale)}
              </p>
            )}
          </div>
          <div className="min-w-0 md:col-span-4">
            <p className="lead text-muted-foreground">{collectionText(collection.intro, locale)}</p>
            <p className="mt-4 flex flex-wrap gap-2">
              <span className="ai-chip ai-chip--gold">{t.common.aiBadge}</span>
              {works.length > 0 && <span className="ai-chip">{m.count(works.length)}</span>}
            </p>
          </div>
        </div>
      </header>

      <CollectionTabs
        mode="links"
        label={m.allCollections}
        active={getAiCollections().findIndex((c) => c.slug === collection.slug)}
        className="ai-collection-tabs mt-10 md:mt-12"
      />

      {works.length > 0 && (
        <>
          <ExhibitionWall
            works={works}
            onOpen={(index, trigger) => {
              lightboxTrigger.current = trigger;
              setLightbox(index);
            }}
          />
          <Lightbox
            items={works.map(toLightboxItem)}
            index={lightbox}
            onIndex={setLightbox}
            returnFocusTo={lightboxTrigger}
            variant="artwork"
          />
        </>
      )}
      <nav
        aria-label={m.collections}
        className="seam-top container-page grid grid-cols-2 gap-6 py-10 md:py-14"
      >
        {[
          { c: prev, label: m.prevCollection, align: "start" as const, Icon: ArrowLeft },
          { c: next, label: m.nextCollection, align: "end" as const, Icon: ArrowRight },
        ].map(({ c, label, align, Icon }) => {
          const cover = getCollectionCover(c, locale);
          return (
            <LocaleLink
              key={align}
              to="/ai-worlds/collections/$slug"
              slug={c.slug}
              className={cn(
                "interaction-card group flex min-h-24 items-center gap-4 rounded-sm border border-border bg-surface-raised/30 p-4 transition-[background-color,border-color,color] hover:bg-surface-raised/60 hover:text-interaction-gold focus-visible:text-interaction-gold sm:min-h-28 sm:p-5",
                align === "end" && "flex-row-reverse text-right",
              )}
            >
              <span className="relative hidden w-16 shrink-0 overflow-hidden rounded-sm sm:block">
                {cover ? (
                  <ArtImage work={cover} />
                ) : (
                  <span className="grid aspect-[4/5] place-items-center bg-surface-raised text-gold/70">
                    ✦
                  </span>
                )}
              </span>
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-5 shrink-0 text-gold transition-transform duration-(--dur-base) ease-cinematic",
                  align === "end" ? "group-hover:translate-x-1" : "group-hover:-translate-x-1",
                )}
              />
              <span className="min-w-0">
                <span className="eyebrow block text-muted-foreground">{label}</span>
                <span className="mt-1 block font-serif text-lg leading-snug sm:text-xl">
                  {collectionText(c.title, locale)}
                </span>
              </span>
            </LocaleLink>
          );
        })}
      </nav>
    </Surface>
  );
}

export const aiDetailHead = (locale: Locale, raw: AiWork | undefined) => {
  if (!raw) return notFoundHead(locale);
  const w = localizeAiWork(raw, locale);
  return pageHead(
    locale,
    `/ai-worlds/${w.slug}`,
    `${w.title} — ${getMessages(locale).ai.title} · CHEFO`,
    w.description,
    { type: "article" },
  );
};

export function AiNotFoundView() {
  const { t } = useT();
  return (
    <div className="py-32 text-center">
      <h1 className="text-4xl">{t.notFound.work}</h1>
      <LocaleLink to="/ai-worlds" className="interaction-link mt-6 inline-block border-b border-gold pb-1">
        {t.notFound.toAi}
      </LocaleLink>
    </div>
  );
}

export function AiDetailView({ work: raw }: { work: AiWork }) {
  const { t, locale } = useT();
  const m = t.ai;
  const work = localizeAiWork(raw, locale);
  const collection = getCollectionForWork(raw.slug);
  // A destination shown on this template keeps its brief (see Destination.artworkTemplate).
  const destination = getDestination(raw.slug);
  const details = work.portraitDetails;
  const idx = aiWorks.findIndex((w) => w.slug === raw.slug);
  const prev = localizeAiWork(aiWorks[(idx - 1 + aiWorks.length) % aiWorks.length]!, locale);
  const next = localizeAiWork(aiWorks[(idx + 1) % aiWorks.length]!, locale);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const viewerItems = [toLightboxItem(work)];
  const facts: [string, string][] = [
    ...(work.tool ? [[m.tool, toolLabel(work.tool, locale)] as [string, string]] : []),
    ...(work.date ? [[m.created, formatDate(work.date, locale)] as [string, string]] : []),
    [m.theme, aiCategoryLabel(work.category, locale)],
    ...(work.era ? [[m.era, aiEraLabel(work.era, locale)] as [string, string]] : []),
    ...(work.setting
      ? [[m.setting, aiSettingLabel(work.setting, locale)] as [string, string]]
      : []),
    ...(work.role ? [[m.role, aiRoleLabel(work.role, locale)] as [string, string]] : []),
    ...(destination
      ? ([
          [
            t.photos.place,
            [destination.place, destination.country]
              .filter((part) => part !== undefined)
              .map((part) => destinationText(part, locale))
              .join(", ") +
              (destination.context ? ` — ${destinationText(destination.context, locale)}` : ""),
          ],
          [m.clothing, destinationText(details?.clothing ?? destination.clothing, locale)],
          [m.grooming, destinationText(details?.grooming ?? destination.grooming, locale)],
          [m.settingLabel, destinationText(details?.setting ?? destination.setting, locale)],
          [m.status, destination.status === "published" ? m.statusPublished : m.statusPlanned],
        ] as [string, string][])
      : []),
  ];

  return (
    <Surface tone="dark" as="article">
      <nav aria-label={m.title} className="container-page pt-10 text-sm md:pt-14">
        {collection && (
          <AiBackLink
            to="/ai-worlds/collections/$slug"
            slug={collection.slug}
            hash={artworkAnchor(raw.slug)}
            label={m.backToCollection}
          />
        )}
        <ol className="mt-3 flex flex-wrap items-center gap-2 text-muted-foreground">
          <li>
            <LocaleLink to="/ai-worlds" className="interaction-link transition-colors">
              {m.title}
            </LocaleLink>
          </li>
          {collection && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <LocaleLink
                  to="/ai-worlds/collections/$slug"
                  slug={collection.slug}
                  className="interaction-link transition-colors"
                >
                  {collectionText(collection.title, locale)}
                </LocaleLink>
              </li>
            </>
          )}
        </ol>
      </nav>

      <div className="container-page grid gap-10 pb-20 pt-8 lg:grid-cols-12 lg:gap-12 lg:pb-28">
        <figure className="group relative min-w-0 self-start overflow-hidden rounded-sm lg:col-span-7">
          <button
            type="button"
            onClick={() => setLightbox(0)}
            aria-label={t.common.openFullscreen(work.title)}
            className="interaction-media block w-full cursor-zoom-in"
          >
            <ArtImage work={work} eager />
            <span className="eyebrow absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-sm bg-navy/80 px-2 py-1 text-interaction-gold opacity-0 transition-opacity duration-(--dur-base) group-hover:opacity-100 group-focus-within:opacity-100">
              <Expand aria-hidden="true" className="size-3.5" /> {m.fullscreen}
            </span>
          </button>
          <ArtEdge />
        </figure>

        <div className="min-w-0 lg:sticky lg:top-24 lg:col-span-5 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow rounded-sm border border-border px-2 py-1 text-gold">
              {t.common.aiBadge}
            </span>
            {collection && (
              <LocaleLink
                to="/ai-worlds/collections/$slug"
                slug={collection.slug}
                className="interaction-link eyebrow px-1 py-1 text-eyebrow transition-colors"
              >
                {collectionText(collection.title, locale)}
              </LocaleLink>
            )}
          </div>
          <h1 className="title-detail mt-5 break-words">{work.title}</h1>
          <p className="mt-6 font-serif text-2xl leading-snug">{work.description}</p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 text-sm">
            {facts.map(([key, value]) => (
              <div key={key}>
                <dt className="eyebrow text-muted-foreground">{key}</dt>
                <dd className="mt-1">{value}</dd>
              </div>
            ))}
          </dl>
          <PromptNote work={work} prompt={raw.prompt} />
        </div>
      </div>

      <Lightbox items={viewerItems} index={lightbox} onIndex={setLightbox} variant="artwork" />

      <nav
        aria-label={m.others}
        className="container-page grid grid-cols-2 gap-6 border-t border-border py-10 md:py-14"
      >
        {[
          { w: prev, label: m.prev, align: "start" as const, Icon: ArrowLeft },
          { w: next, label: m.next, align: "end" as const, Icon: ArrowRight },
        ].map(({ w, label, align, Icon }) => (
          <LocaleLink
            key={align}
            to="/ai-worlds/$slug"
            slug={w.slug}
            className={cn(
              "interaction-link group flex items-center gap-4 transition-colors",
              align === "end" && "flex-row-reverse text-right",
            )}
          >
            <span className="relative hidden w-14 shrink-0 overflow-hidden rounded-sm sm:block">
              <ArtImage work={w} />
            </span>
            <Icon aria-hidden="true" className="size-4 shrink-0 sm:hidden" />
            <span className="min-w-0">
              <span className="eyebrow block text-muted-foreground">{label}</span>
              <span className="mt-1 block font-serif text-lg leading-snug">{w.title}</span>
            </span>
          </LocaleLink>
        ))}
      </nav>
    </Surface>
  );
}
