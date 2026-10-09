import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Copy } from "lucide-react";
import { aiWorks, AI_CATEGORIES, AI_TOOLS, aiCategoryLabel, localizeAiWork, toolLabel, type AiImage, type AiWork } from "@/content/ai-works";
import { AiCard, Chip, ChipGroup, EmptyState, btnGold, copyPromptWithToast } from "@/components/site";
import { formatDate, getMessages, notFoundHead, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export type AiSearch = { category?: string | undefined; tool?: string | undefined };
export const validateAiSearch = (s: Record<string, unknown>): AiSearch => ({
  category: typeof s["category"] === "string" ? (s["category"] as string) : undefined,
  tool: typeof s["tool"] === "string" ? (s["tool"] as string) : undefined,
});

export const aiWorldsHead = (locale: Locale) => {
  const m = getMessages(locale).ai;
  return pageHead(locale, "/ai-worlds", m.metaTitle, m.metaDesc);
};

export function AiWorldsView() {
  const { t, locale } = useT();
  const m = t.ai;
  const { category, tool } = useSearch({ strict: false }) as AiSearch;
  const navigate = useNavigate();
  const set = (patch: AiSearch) =>
    navigate({ to: ".", search: (p: Record<string, unknown>) => ({ ...p, ...patch }), replace: true });
  const items = aiWorks
    .filter((w) => (!category || w.category === category) && (!tool || w.tool === tool))
    .map((w) => localizeAiWork(w, locale));

  return (
    <div data-header-theme="dark" className="bg-navy text-navy-foreground">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        <p className="eyebrow text-gold">{m.eyebrow}</p>
        <h1 className="mt-3 text-6xl md:text-7xl">{m.title}</h1>
        <p className="mt-5 max-w-xl text-lg text-navy-muted">{m.intro}</p>

        <div className="mt-12 space-y-4 border-y border-navy-border py-6 [&_button]:border-navy-border [&_button[aria-pressed=true]]:border-gold [&_button[aria-pressed=true]]:bg-gold [&_button[aria-pressed=true]]:text-accent-foreground">
          <ChipGroup dark label={m.world}>
            <Chip active={!category} onClick={() => set({ category: undefined })}>{t.common.all}</Chip>
            {AI_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => set({ category: category === c ? undefined : c })}>{aiCategoryLabel(c, locale)}</Chip>
            ))}
          </ChipGroup>
          <ChipGroup dark label={m.tool}>
            <Chip active={!tool} onClick={() => set({ tool: undefined })}>{t.common.all}</Chip>
            {AI_TOOLS.map((x) => (
              <Chip key={x} active={tool === x} onClick={() => set({ tool: tool === x ? undefined : x })}>{toolLabel(x, locale)}</Chip>
            ))}
          </ChipGroup>
        </div>

        <p className="mt-6 text-sm text-navy-muted" aria-live="polite">{m.count(items.length)}</p>
        {items.length ? (
          <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((w) => <AiCard key={w.slug} work={w} />)}
          </div>
        ) : (
          <EmptyState dark text={m.empty} onClear={() => set({ category: undefined, tool: undefined })} />
        )}
      </div>
    </div>
  );
}

export const aiDetailHead = (locale: Locale, raw: AiWork | undefined) => {
  if (!raw) return notFoundHead(locale);
  const w = localizeAiWork(raw, locale);
  return pageHead(locale, `/ai-worlds/${w.slug}`, `${w.title} — ${getMessages(locale).ai.title} · CHEFO`, w.description, { type: "article" });
};

export function AiNotFoundView() {
  const { t } = useT();
  return (
    <div className="py-32 text-center">
      <h1 className="text-4xl">{t.notFound.work}</h1>
      <LocaleLink to="/ai-worlds" className="mt-6 inline-block border-b border-gold pb-1">{t.notFound.toAi}</LocaleLink>
    </div>
  );
}

function Step({ n, label }: { n: string; label: string }) {
  return <p className="eyebrow text-terracotta">{n} — {label}</p>;
}

function Gallery({ images }: { images: AiImage[] }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3">
      {images.map((img, i) => (
        <figure key={i}>
          <img src={img.src} alt={img.alt} loading="lazy" className="aspect-[4/5] w-full rounded-md object-cover shadow-soft" />
          {img.caption && <figcaption className="mt-2 text-sm text-muted-foreground">{img.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export function AiDetailView({ work: raw }: { work: AiWork }) {
  const { t, locale } = useT();
  const m = t.ai;
  const work = localizeAiWork(raw, locale);
  const idx = aiWorks.findIndex((w) => w.slug === raw.slug);
  const prev = localizeAiWork(aiWorks[(idx - 1 + aiWorks.length) % aiWorks.length]!, locale);
  const next = localizeAiWork(aiWorks[(idx + 1) % aiWorks.length]!, locale);

  return (
    <article>
      <section data-header-theme="dark" className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.2fr_1fr] md:items-end md:px-8">
          <img src={work.image} alt={work.alt} width={1024} height={1280} className="aspect-[4/5] w-full rounded-md object-cover" />
          <div>
            <Step n="01" label={m.stepImage} />
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="eyebrow rounded-sm bg-gold px-2 py-1 text-accent-foreground">{aiCategoryLabel(work.category, locale)}</span>
              <span className="eyebrow rounded-sm border border-navy-border px-2 py-1">{t.common.aiBadge}</span>
            </div>
            <h1 className="mt-5 text-5xl md:text-6xl">{work.title}</h1>
            <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-navy-border pt-6 text-sm">
              <div><dt className="eyebrow text-navy-muted">{m.tool}</dt><dd className="mt-1">{toolLabel(work.tool, locale)}</dd></div>
              <div><dt className="eyebrow text-navy-muted">{m.created}</dt><dd className="mt-1">{formatDate(work.date, locale)}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-20 px-5 py-20 md:px-8">
        <section>
          <Step n="02" label={m.stepConcept} />
          <p className="mt-4 font-serif text-3xl leading-snug">{work.description}</p>
        </section>

        <section aria-labelledby="prompt-h">
          <Step n="03" label={m.stepPrompt} />
          <div className="mt-4 rounded-md border-l-4 border-gold bg-card p-6 shadow-soft md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="prompt-h" className="text-2xl">{m.fullPrompt}</h2>
              {raw.prompt?.trim() && (
                <button onClick={() => copyPromptWithToast(raw.prompt, locale)} className={btnGold}>
                  <Copy className="size-4" /> {t.common.copyPrompt}
                </button>
              )}
            </div>
            {/* Original prompt, never translated */}
            <p lang="en" className="mt-5 whitespace-pre-wrap font-mono text-sm leading-relaxed">{raw.prompt}</p>
            <p className="mt-4 text-xs text-muted-foreground">{m.promptNote}</p>
          </div>
        </section>

        <section>
          <h2 className="text-3xl">{m.references}</h2>
          <Gallery images={work.references} />
        </section>

        <section>
          <Step n="04" label={m.stepVariants} />
          <h2 className="mt-2 text-3xl">{m.series}</h2>
          <Gallery images={work.variants} />
        </section>
      </div>

      <nav aria-label={m.others} className="mx-auto flex max-w-5xl justify-between gap-4 border-t px-5 py-8 pb-20 md:px-8">
        <LocaleLink to="/ai-worlds/$slug" slug={prev.slug} className="flex items-center gap-3 hover:text-terracotta">
          <ArrowLeft className="size-4" /> <span><span className="eyebrow block text-muted-foreground">{m.prev}</span><span className="font-serif text-lg">{prev.title}</span></span>
        </LocaleLink>
        <LocaleLink to="/ai-worlds/$slug" slug={next.slug} className="flex items-center gap-3 text-right hover:text-terracotta">
          <span><span className="eyebrow block text-muted-foreground">{m.next}</span><span className="font-serif text-lg">{next.title}</span></span> <ArrowRight className="size-4" />
        </LocaleLink>
      </nav>
    </article>
  );
}
