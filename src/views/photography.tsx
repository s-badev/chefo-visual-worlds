import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import {
  localizePhoto,
  photoCategoryLabel,
  photoThemeLabel,
  photos,
  PHOTO_THEMES,
  type Photo,
  type PhotoTheme,
} from "@/content/photos";
import {
  filterGalleryPhotos,
  getAllGalleryPhotos,
  getPhotoLocations,
} from "@/content/photo-gallery";
import {
  albumText,
  getAlbumCover,
  getAlbumForPhoto,
  getAlbumPhotos,
  getAlbums,
  getNextAlbum,
  type Album,
} from "@/content/albums";
import { Chip, ChipGroup, EmptyState, Lightbox, PhotoCard } from "@/components/site";
import { formatDate, getMessages, notFoundHead, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export type PhotoSearch = {
  view?: "photos" | undefined;
  theme?: PhotoTheme | undefined;
  location?: string | undefined;
};
export const validatePhotoSearch = (s: Record<string, unknown>): PhotoSearch => ({
  view: s["view"] === "photos" ? "photos" : undefined,
  theme: PHOTO_THEMES.find((theme) => theme === s["theme"]),
  location: getPhotoLocations().find((album) => album.slug === s["location"])?.slug,
});

export const photographyHead = (locale: Locale) => {
  const m = getMessages(locale).photos;
  return pageHead(locale, "/photography", m.metaTitle, m.metaDesc);
};

/** Destination albums are the Photography landing page, including drafts. */
export function PhotographyView() {
  const { t, locale } = useT();
  const m = t.photos;
  const { view, theme, location } = useSearch({ strict: false }) as PhotoSearch;
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const set = (patch: PhotoSearch) => {
    setLightbox(null);
    navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({ ...previous, ...patch }),
      replace: true,
    });
  };
  const ordered = getAlbums();
  const items = filterGalleryPhotos(getAllGalleryPhotos(locale), { theme, location }).map(
    ({ photo }) => photo,
  );
  const layout = [
    "lg:col-span-7 lg:min-h-[34rem]",
    "lg:col-span-5 lg:min-h-[34rem]",
    "lg:col-span-4 lg:min-h-[27rem]",
    "lg:col-span-8 lg:min-h-[27rem]",
    "lg:col-span-6 lg:min-h-[31rem]",
    "lg:col-span-6 lg:min-h-[31rem]",
    "lg:col-span-8 lg:min-h-[27rem]",
    "lg:col-span-4 lg:min-h-[27rem]",
    "lg:col-span-5 lg:min-h-[31rem]",
    "lg:col-span-7 lg:min-h-[31rem]",
  ];

  return (
    <main data-header-theme="light" className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <header className="max-w-2xl">
        <p className="eyebrow text-terracotta">{m.eyebrow}</p>
        <h1 className="mt-3 text-6xl md:text-7xl">{m.title}</h1>
        <p className="mt-5 text-lg text-muted-foreground">{m.intro}</p>
      </header>

      <div role="group" aria-label={m.view} className="mt-10 flex gap-8 border-b">
        <button
          type="button"
          aria-pressed={view !== "photos"}
          onClick={() => set({ view: undefined })}
          className={`border-b-2 pb-4 text-sm font-semibold transition-colors hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${view !== "photos" ? "border-gold text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          {m.albums}
        </button>
        <button
          type="button"
          aria-pressed={view === "photos"}
          onClick={() => set({ view: "photos" })}
          className={`border-b-2 pb-4 text-sm font-semibold transition-colors hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${view === "photos" ? "border-gold text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          {m.allPhotos}
        </button>
      </div>

      {view === "photos" ? (
        <section aria-label={m.allPhotos}>
          <div className="mt-8 space-y-4 border-b pb-8">
            <ChipGroup label={m.theme}>
              <Chip active={!theme} onClick={() => set({ theme: undefined })}>
                {t.common.all}
              </Chip>
              {PHOTO_THEMES.map((value) => (
                <Chip
                  key={value}
                  active={theme === value}
                  onClick={() => set({ theme: theme === value ? undefined : value })}
                >
                  {photoThemeLabel(value, locale)}
                </Chip>
              ))}
            </ChipGroup>
            <ChipGroup label={m.place}>
              <Chip active={!location} onClick={() => set({ location: undefined })}>
                {t.common.all}
              </Chip>
              {getPhotoLocations().map((album) => (
                <Chip
                  key={album.id}
                  active={location === album.slug}
                  onClick={() =>
                    set({ location: location === album.slug ? undefined : album.slug })
                  }
                >
                  {albumText(album.title, locale)}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
            {m.count(items.length)}
          </p>
          {items.length ? (
            <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((photo, index) => (
                <PhotoCard
                  key={photo.slug}
                  photo={photo}
                  themeLabel={photo.themes
                    .map((value) => photoThemeLabel(value, locale))
                    .join(" · ")}
                  onOpen={() => setLightbox(index)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              text={m.empty}
              onClear={() => set({ theme: undefined, location: undefined })}
            />
          )}
          <Lightbox items={items} index={lightbox} onIndex={setLightbox} />
        </section>
      ) : (
        <section
          aria-label={m.title}
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-7"
        >
          {ordered.map((album, index) => {
            const rawCover = getAlbumCover(album);
            const cover = rawCover ? localizePhoto(rawCover, locale) : undefined;
            const name = albumText(album.title, locale);
            const populated = Boolean(cover && album.photos.length);
            return (
              <LocaleLink
                key={album.id}
                to="/photography/albums/$slug"
                slug={album.slug}
                className={`group relative isolate flex min-h-[23rem] flex-col justify-end overflow-hidden rounded-md bg-navy p-7 text-navy-foreground shadow-soft outline-none transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 motion-reduce:transform-none motion-reduce:transition-none sm:min-h-[27rem] md:p-9 ${layout[index]}`}
              >
                {populated ? (
                  <>
                    <img
                      src={cover!.image}
                      alt={cover!.alt}
                      width={cover!.width}
                      height={cover!.height}
                      loading={index === 0 ? "eager" : "lazy"}
                      className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/25 to-navy/10 transition-colors duration-300 group-hover:from-navy/95"
                    />
                  </>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute inset-5 -z-10 rounded-sm border border-gold/30 sm:inset-6"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute right-10 top-10 h-32 w-32 rounded-full border border-gold/20 sm:h-44 sm:w-44"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute right-16 top-16 h-20 w-20 rounded-full border border-gold/20 sm:h-32 sm:w-32"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-gold/10 via-transparent to-navy"
                    />
                  </>
                )}
                <span className="relative mb-auto flex items-start justify-between gap-4">
                  <span className="eyebrow text-gold">{String(index + 1).padStart(2, "0")}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-5 text-gold transition-transform motion-safe:group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </span>
                <span className="relative block border-t border-navy-foreground/40 pt-5">
                  <span className="block font-serif text-4xl leading-tight md:text-5xl">
                    {name}
                  </span>
                  <span className="mt-3 block text-sm font-medium text-navy-foreground/85">
                    {populated ? m.count(album.photos.length) : m.albumEmpty}
                  </span>
                </span>
              </LocaleLink>
            );
          })}
        </section>
      )}
    </main>
  );
}

export const albumHead = (locale: Locale, album: Album | undefined) => {
  if (!album) return notFoundHead(locale);
  return pageHead(
    locale,
    `/photography/albums/${album.slug}`,
    `${albumText(album.title, locale)} — ${getMessages(locale).photos.title} · CHEFO`,
    albumText(album.description, locale),
  );
};

export function AlbumNotFoundView() {
  const { t } = useT();
  return (
    <div className="px-5 py-32 text-center">
      <h1 className="text-4xl">{t.photos.albumNotFound}</h1>
      <LocaleLink to="/photography" className="mt-6 inline-block border-b border-gold pb-1">
        {t.photos.backToAlbums}
      </LocaleLink>
    </div>
  );
}

export function AlbumView({ album }: { album: Album }) {
  const { t, locale } = useT();
  const m = t.photos;
  const items = getAlbumPhotos(album, locale);
  const next = getNextAlbum(album);
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <article data-header-theme="light" className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-20">
      <nav aria-label={m.backToAlbums} className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <LocaleLink to="/photography" className="hover:text-terracotta">
              {m.title}
            </LocaleLink>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {albumText(album.title, locale)}
          </li>
        </ol>
      </nav>
      <LocaleLink
        to="/photography"
        className="mt-8 inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-semibold hover:text-terracotta"
      >
        <ArrowLeft className="size-4" /> {m.backToAlbums}
      </LocaleLink>
      <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-b pb-10">
        <div>
          <p className="eyebrow text-terracotta">{m.eyebrow}</p>
          <h1 className="mt-3 font-serif text-6xl md:text-7xl">{albumText(album.title, locale)}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {albumText(album.description, locale)}
          </p>
        </div>
        <p className="eyebrow text-muted-foreground">{m.count(items.length)}</p>
      </div>

      {items.length ? (
        <div className="mt-10">
          <figure>
            <button
              type="button"
              onClick={() => setLightbox(0)}
              className="block w-full overflow-hidden rounded-md bg-navy text-left shadow-soft"
              aria-label={t.common.openFullscreen(items[0]!.title)}
            >
              <img
                src={items[0]!.image}
                alt={items[0]!.alt}
                width={items[0]!.width}
                height={items[0]!.height}
                fetchPriority="high"
                className="mx-auto max-h-[75vh] max-w-full object-contain"
              />
            </button>
            <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-serif text-xl">{items[0]!.caption ?? items[0]!.title}</span>
              <LocaleLink
                to="/photography/$slug"
                slug={items[0]!.slug}
                className="text-sm text-muted-foreground hover:text-terracotta"
              >
                {items[0]!.location} <ArrowRight className="inline size-3.5" />
              </LocaleLink>
            </figcaption>
          </figure>
          {items.length > 1 && (
            <div className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3 md:gap-8">
              {items.slice(1).map((photo, i) => (
                <figure key={photo.slug} className="mb-10 break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => setLightbox(i + 1)}
                    className="block w-full overflow-hidden rounded-md bg-muted text-left shadow-soft"
                    aria-label={t.common.openFullscreen(photo.title)}
                  >
                    <img
                      src={photo.image}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      className="h-auto w-full"
                    />
                  </button>
                  <figcaption className="mt-3">
                    <LocaleLink
                      to="/photography/$slug"
                      slug={photo.slug}
                      className="font-serif text-xl hover:text-terracotta"
                    >
                      {photo.caption ?? photo.title}
                    </LocaleLink>
                    <p className="mt-1 text-sm text-muted-foreground">{photo.location}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <Lightbox items={items} index={lightbox} onIndex={setLightbox} />
        </div>
      ) : (
        <div className="relative mt-10 flex min-h-80 flex-col justify-end overflow-hidden rounded-md bg-navy p-8 text-navy-foreground shadow-soft sm:p-12">
          <span
            aria-hidden="true"
            className="absolute inset-5 rounded-sm border border-gold/30 sm:inset-7"
          />
          <span
            aria-hidden="true"
            className="absolute right-10 top-8 size-40 rounded-full border border-gold/20"
          />
          <span className="relative eyebrow text-gold">{m.eyebrow}</span>
          <p className="relative mt-3 font-serif text-4xl sm:text-5xl">
            {albumText(album.title, locale)}
          </p>
          <p className="relative mt-3 text-navy-foreground/85">{m.albumEmpty}</p>
        </div>
      )}

      {next && next.id !== album.id && (
        <nav className="mt-16 border-t pt-8" aria-label={m.nextAlbum}>
          <LocaleLink
            to="/photography/albums/$slug"
            slug={next.slug}
            className="group inline-flex items-center gap-5 hover:text-terracotta"
          >
            <span>
              <span className="eyebrow block text-muted-foreground">{m.nextAlbum}</span>
              <span className="mt-2 block font-serif text-3xl">
                {albumText(next.title, locale)}
              </span>
            </span>
            <ArrowRight className="size-5 transition-transform motion-safe:group-hover:translate-x-1 motion-reduce:transition-none" />
          </LocaleLink>
        </nav>
      )}
    </article>
  );
}

export const photoDetailHead = (locale: Locale, raw: Photo | undefined) => {
  if (!raw) return notFoundHead(locale);
  const photo = localizePhoto(raw, locale);
  return pageHead(
    locale,
    `/photography/${photo.slug}`,
    `${photo.title} — ${photo.location} · CHEFO`,
    photo.alt,
    { type: "article" },
  );
};

export function PhotoNotFoundView() {
  const { t } = useT();
  return (
    <div className="py-32 text-center">
      <h1 className="text-4xl">{t.notFound.photo}</h1>
      <LocaleLink to="/photography" className="mt-6 inline-block border-b border-gold pb-1">
        {t.notFound.toPhotos}
      </LocaleLink>
    </div>
  );
}

/** Keep legacy individual photo URLs, with an explicit in-site way back. */
export function PhotoDetailView({ photo: raw }: { photo: Photo }) {
  const { t, locale } = useT();
  const m = t.photos;
  const photo = localizePhoto(raw, locale);
  const album = getAlbumForPhoto(raw.slug);
  const idx = photos.findIndex((p) => p.slug === raw.slug);
  const prev = localizePhoto(photos[(idx - 1 + photos.length) % photos.length]!, locale);
  const next = localizePhoto(photos[(idx + 1) % photos.length]!, locale);
  const related = photos
    .filter(
      (p) => p.slug !== raw.slug && (p.location === raw.location || p.category === raw.category),
    )
    .slice(0, 3)
    .map((p) => localizePhoto(p, locale));

  return (
    <article>
      <div data-header-theme="dark" className="bg-navy">
        <img
          src={photo.image}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          className="mx-auto max-h-[82vh] w-auto max-w-full object-contain"
        />
      </div>
      <div className="mx-auto max-w-6xl px-5 pt-8 md:px-8">
        {album ? (
          <LocaleLink
            to="/photography/albums/$slug"
            slug={album.slug}
            className="inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-semibold hover:text-terracotta"
          >
            <ArrowLeft className="size-4" /> {m.backToAlbum}: {albumText(album.title, locale)}
          </LocaleLink>
        ) : (
          <LocaleLink
            to="/photography"
            className="inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-semibold hover:text-terracotta"
          >
            <ArrowLeft className="size-4" /> {m.backToAlbums}
          </LocaleLink>
        )}
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.6fr_1fr] md:px-8">
        <div>
          <span className="eyebrow inline-flex items-center gap-2 text-terracotta">
            <MapPin className="size-3.5" /> {photo.location}
          </span>
          <h1 className="mt-3 text-5xl md:text-6xl">{photo.title}</h1>
          {photo.story && (
            <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed">{photo.story}</p>
          )}
        </div>
        <dl className="h-fit divide-y rounded-md border text-sm">
          {(
            [
              [m.place, photo.location],
              [m.theme, photoCategoryLabel(photo.category, locale)],
              ...(photo.date ? [[m.date, formatDate(photo.date, locale)]] : []),
              ...(photo.device ? [[m.device, photo.device]] : []),
            ] as [string, string][]
          ).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 px-5 py-3">
              <dt className="eyebrow text-muted-foreground">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <nav
        aria-label={m.others}
        className="mx-auto flex max-w-6xl justify-between gap-4 border-t px-5 py-8 md:px-8"
      >
        <LocaleLink
          to="/photography/$slug"
          slug={prev.slug}
          className="group flex items-center gap-3 hover:text-terracotta"
        >
          <ArrowLeft className="size-4" />{" "}
          <span>
            <span className="eyebrow block text-muted-foreground">{m.prev}</span>
            <span className="font-serif text-lg">{prev.title}</span>
          </span>
        </LocaleLink>
        <LocaleLink
          to="/photography/$slug"
          slug={next.slug}
          className="group flex items-center gap-3 text-right hover:text-terracotta"
        >
          <span>
            <span className="eyebrow block text-muted-foreground">{m.next}</span>
            <span className="font-serif text-lg">{next.title}</span>
          </span>{" "}
          <ArrowRight className="size-4" />
        </LocaleLink>
      </nav>
      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
          <h2 className="text-3xl">{m.related}</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {related.map((item) => (
              <PhotoCard key={item.slug} photo={item} ratio="aspect-[4/5]" />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
