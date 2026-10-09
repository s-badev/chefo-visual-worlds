import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { photos, PHOTO_CATEGORIES, PHOTO_LOCATIONS, localizePhoto, photoCategoryLabel, locationLabel, type Photo } from "@/content/photos";
import { Chip, ChipGroup, EmptyState, Lightbox, PhotoCard } from "@/components/site";
import { formatDate, getMessages, notFoundHead, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export type PhotoSearch = { category?: string | undefined; location?: string | undefined };
export const validatePhotoSearch = (s: Record<string, unknown>): PhotoSearch => ({
  category: typeof s["category"] === "string" ? (s["category"] as string) : undefined,
  location: typeof s["location"] === "string" ? (s["location"] as string) : undefined,
});

export const photographyHead = (locale: Locale) => {
  const m = getMessages(locale).photos;
  return pageHead(locale, "/photography", m.metaTitle, m.metaDesc);
};

export function PhotographyView() {
  const { t, locale } = useT();
  const m = t.photos;
  const { category, location } = useSearch({ strict: false }) as PhotoSearch;
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const items = photos
    .filter((p) => (!category || p.category === category) && (!location || p.location === location))
    .map((p) => localizePhoto(p, locale));
  const set = (patch: PhotoSearch) =>
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }), replace: true });

  return (
    <div data-header-theme="light" className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <p className="eyebrow text-terracotta">{m.eyebrow}</p>
      <h1 className="mt-3 text-6xl md:text-7xl">{m.title}</h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">{m.intro}</p>

      <div className="mt-12 space-y-4 border-y py-6">
        <ChipGroup label={m.theme}>
          <Chip active={!category} onClick={() => set({ category: undefined })}>{t.common.all}</Chip>
          {PHOTO_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => set({ category: category === c ? undefined : c })}>{photoCategoryLabel(c, locale)}</Chip>
          ))}
        </ChipGroup>
        <ChipGroup label={m.place}>
          <Chip active={!location} onClick={() => set({ location: undefined })}>{t.common.all}</Chip>
          {PHOTO_LOCATIONS.map((l) => (
            <Chip key={l} active={location === l} onClick={() => set({ location: location === l ? undefined : l })}>{locationLabel(l, locale)}</Chip>
          ))}
        </ChipGroup>
      </div>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">{m.count(items.length)}</p>

      {items.length ? (
        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => <PhotoCard key={p.slug} photo={p} onOpen={() => setLightbox(i)} />)}
        </div>
      ) : (
        <EmptyState text={m.empty} onClear={() => set({ category: undefined, location: undefined })} />
      )}
      <Lightbox items={items} index={lightbox} onIndex={setLightbox} />
    </div>
  );
}

export const photoDetailHead = (locale: Locale, raw: Photo | undefined) => {
  if (!raw) return notFoundHead(locale);
  const p = localizePhoto(raw, locale);
  return pageHead(locale, `/photography/${p.slug}`, `${p.title} — ${p.location} · CHEFO`, p.alt, { type: "article" });
};

export function PhotoNotFoundView() {
  const { t } = useT();
  return (
    <div className="py-32 text-center">
      <h1 className="text-4xl">{t.notFound.photo}</h1>
      <LocaleLink to="/photography" className="mt-6 inline-block border-b border-gold pb-1">{t.notFound.toPhotos}</LocaleLink>
    </div>
  );
}

export function PhotoDetailView({ photo: raw }: { photo: Photo }) {
  const { t, locale } = useT();
  const m = t.photos;
  const photo = localizePhoto(raw, locale);
  const idx = photos.findIndex((p) => p.slug === raw.slug);
  const prev = localizePhoto(photos[(idx - 1 + photos.length) % photos.length]!, locale);
  const next = localizePhoto(photos[(idx + 1) % photos.length]!, locale);
  const related = photos
    .filter((p) => p.slug !== raw.slug && (p.location === raw.location || p.category === raw.category))
    .slice(0, 3)
    .map((p) => localizePhoto(p, locale));

  return (
    <article>
      <div data-header-theme="dark" className="bg-navy">
        <img src={photo.image} alt={photo.alt} width={photo.width} height={photo.height} className="mx-auto max-h-[82vh] w-auto object-contain" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.6fr_1fr] md:px-8">
        <div>
          <span className="eyebrow inline-flex items-center gap-2 text-terracotta"><MapPin className="size-3.5" /> {photo.location}</span>
          <h1 className="mt-3 text-5xl md:text-6xl">{photo.title}</h1>
          <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed">{photo.story}</p>
        </div>
        <dl className="h-fit divide-y rounded-md border text-sm">
          {[
            [m.place, photo.location],
            [m.theme, photoCategoryLabel(photo.category, locale)],
            [m.date, formatDate(photo.date, locale)],
            [m.device, photo.device ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-5 py-3">
              <dt className="eyebrow text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <nav aria-label={m.others} className="mx-auto flex max-w-6xl justify-between gap-4 border-t px-5 py-8 md:px-8">
        <LocaleLink to="/photography/$slug" slug={prev.slug} className="group flex items-center gap-3 hover:text-terracotta">
          <ArrowLeft className="size-4" /> <span><span className="eyebrow block text-muted-foreground">{m.prev}</span><span className="font-serif text-lg">{prev.title}</span></span>
        </LocaleLink>
        <LocaleLink to="/photography/$slug" slug={next.slug} className="group flex items-center gap-3 text-right hover:text-terracotta">
          <span><span className="eyebrow block text-muted-foreground">{m.next}</span><span className="font-serif text-lg">{next.title}</span></span> <ArrowRight className="size-4" />
        </LocaleLink>
      </nav>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
          <h2 className="text-3xl">{m.related}</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {related.map((p) => <PhotoCard key={p.slug} photo={p} ratio="aspect-[4/5]" />)}
          </div>
        </section>
      )}
    </article>
  );
}
