import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import {
  localizePhoto,
  photoCategoryLabel,
  photoThemeLabel,
  photos,
  PHOTO_FILTER_THEMES,
  type Photo,
  type PhotoFilterTheme,
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
  getNextAlbum,
  type Album,
} from "@/content/albums";
import { Chip, ChipGroup, EmptyState, Lightbox, PageHeader, PhotoCard } from "@/components/site";
import { Surface } from "@/components/surface";
import { PhotographyEditorial } from "@/components/photography-editorial";
import { EditorialAlbumView } from "@/components/editorial-album";
import { UnifiedAlbumView } from "@/components/unified-album";
import { getPilotEditorialAlbum } from "@/content/editorial";
import { reveal } from "@/hooks/use-reveal";
import { formatDate, getMessages, notFoundHead, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";

export type PhotoSearch = {
  view?: "photos" | undefined;
  theme?: PhotoFilterTheme | undefined;
  location?: string | undefined;
};
export const validatePhotoSearch = (s: Record<string, unknown>): PhotoSearch => ({
  view: s["view"] === "photos" ? "photos" : undefined,
  // Only offered subjects; anything else (e.g. an old ?theme=travel link) shows every photo.
  theme: PHOTO_FILTER_THEMES.find((theme) => theme === s["theme"]),
  location: getPhotoLocations().find((album) => album.slug === s["location"])?.slug,
});

export const photographyHead = (locale: Locale) => {
  const m = getMessages(locale).photos;
  return pageHead(locale, "/photography", m.metaTitle, m.metaDesc);
};

/** Cream mat with a fine double terracotta frame: an album still waiting for photographs. */
function PassePartout() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-[radial-gradient(120%_80%_at_25%_0%,var(--card),transparent_70%)]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-4 -z-10 rounded-sm border border-terracotta/30 sm:inset-5"
      />
      <span
        aria-hidden="true"
        className="absolute inset-6 -z-10 rounded-[2px] border border-terracotta/15 sm:inset-7"
      />
    </>
  );
}

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
  const items = filterGalleryPhotos(getAllGalleryPhotos(locale), { theme, location }).map(
    ({ photo }) => photo,
  );

  if (view !== "photos") {
    return (
      <PhotographyEditorial
        onAllPhotos={() => {
          set({ view: "photos" });
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
      />
    );
  }

  return (
    <Surface tone="light" as="div" className="container-page section-y">
      <PageHeader
        eyebrow={m.eyebrow}
        title={m.title}
        intro={m.intro}
        className="photography-all-photos-header"
      />

      <div role="group" aria-label={m.view} className="mt-10 flex gap-8 border-b">
        <button
          type="button"
          aria-pressed={view !== "photos"}
          onClick={() => set({ view: undefined })}
          className={`interaction-control interaction-text-button min-h-11 border-b-2 pb-4 text-sm font-semibold transition-colors ${view !== "photos" ? "border-gold text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          {m.albums}
        </button>
        <button
          type="button"
          aria-pressed={view === "photos"}
          onClick={() => set({ view: "photos" })}
          className={`interaction-control interaction-text-button min-h-11 border-b-2 pb-4 text-sm font-semibold transition-colors ${view === "photos" ? "border-gold text-foreground" : "border-transparent text-muted-foreground"}`}
        >
          {m.allPhotos}
        </button>
      </div>

      <section aria-label={m.allPhotos}>
        <div className="mt-8 space-y-4 border-b pb-8">
          <ChipGroup label={m.theme}>
            <Chip active={!theme} onClick={() => set({ theme: undefined })}>
              {t.common.all}
            </Chip>
            {PHOTO_FILTER_THEMES.map((value) => (
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
                onClick={() => set({ location: location === album.slug ? undefined : album.slug })}
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
              <div key={photo.slug} {...reveal(index)}>
                <PhotoCard
                  photo={photo}
                  frame="keyline"
                  themeLabel={photo.themes
                    .map((value) => photoThemeLabel(value, locale))
                    .join(" · ")}
                  onOpen={() => setLightbox(index)}
                />
              </div>
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
    </Surface>
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
      <LocaleLink to="/photography" className="interaction-link mt-6 inline-block border-b border-gold pb-1">
        {t.photos.backToAlbums}
      </LocaleLink>
    </div>
  );
}

export function AlbumView({ album, view }: { album: Album; view?: "all" | undefined }) {
  if (album.slug === "paris" || album.slug === "istanbul") {
    return <EditorialAlbumView album={album} />;
  }
  if (getPilotEditorialAlbum(album.slug)) {
    return <UnifiedAlbumView album={album} view={view === "all" ? "all" : "highlights"} />;
  }
  return <StandardAlbumView album={album} />;
}

function StandardAlbumView({ album }: { album: Album }) {
  const { t, locale } = useT();
  const m = t.photos;
  const items = getAlbumPhotos(album, locale);
  const next = getNextAlbum(album);
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <Surface tone="light" as="article" className="container-page py-12 md:py-20">
      <nav aria-label={m.backToAlbums} className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <LocaleLink to="/photography" className="interaction-link">
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
        className="interaction-link mt-8 inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" /> {m.backToAlbums}
      </LocaleLink>
      <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-b pb-10">
        <PageHeader
          eyebrow={m.eyebrow}
          title={albumText(album.title, locale)}
          intro={albumText(album.description, locale)}
        />
        <p className="eyebrow text-muted-foreground">{m.count(items.length)}</p>
      </div>

      {items.length ? (
        <div className="mt-10">
          <figure>
            <button
              type="button"
              onClick={() => setLightbox(0)}
              className="interaction-media block w-full overflow-hidden rounded-md bg-secondary text-left shadow-soft"
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
                className="text-sm text-muted-foreground hover:text-terracotta-ink"
              >
                {items[0]!.location} <ArrowRight className="inline size-3.5" />
              </LocaleLink>
            </figcaption>
          </figure>
          {items.length > 1 && (
            <div className="mt-12 columns-1 gap-6 sm:columns-2 lg:columns-3 md:gap-8">
              {items.slice(1).map((photo, i) => (
                <figure key={photo.slug} className="mb-10 break-inside-avoid" {...reveal(i)}>
                  <button
                    type="button"
                    onClick={() => setLightbox(i + 1)}
                    className="interaction-media block w-full overflow-hidden rounded-md bg-muted text-left shadow-soft"
                    aria-label={t.common.openFullscreen(photo.title)}
                  >
                    <img
                      src={photo.image}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full"
                    />
                  </button>
                  <figcaption className="mt-3">
                    <LocaleLink
                      to="/photography/$slug"
                      slug={photo.slug}
                      className="font-serif text-xl hover:text-terracotta-ink"
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
        <div className="relative isolate mt-10 flex min-h-80 flex-col justify-end overflow-hidden rounded-md bg-secondary p-8 text-foreground shadow-soft sm:p-12">
          <PassePartout />
          <span className="eyebrow text-eyebrow">{m.eyebrow}</span>
          <p className="mt-3 font-serif text-4xl sm:text-5xl">{albumText(album.title, locale)}</p>
          <p className="mt-3 text-muted-foreground">{m.albumEmpty}</p>
        </div>
      )}

      {next && next.id !== album.id && (
        <nav className="mt-16 border-t pt-8" aria-label={m.nextAlbum}>
          <LocaleLink
            to="/photography/albums/$slug"
            slug={next.slug}
            className="interaction-link group inline-flex items-center gap-5"
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
    </Surface>
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
      <LocaleLink to="/photography" className="interaction-link mt-6 inline-block border-b border-gold pb-1">
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
    <Surface tone="light" as="article">
      {/* Cream mat: the photograph is presented like an editorial print. */}
      <div className="bg-secondary px-4 py-6 md:py-10">
        <img
          src={photo.image}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          fetchPriority="high"
          className="photo-frame-print photo-frame-print--detail mx-auto max-h-[78vh] w-auto max-w-full rounded-sm object-contain shadow-soft"
        />
      </div>
      <div className="mx-auto max-w-6xl px-5 pt-8 md:px-8">
        {album ? (
          <LocaleLink
            to="/photography/albums/$slug"
            slug={album.slug}
            className="interaction-link inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> {m.backToAlbum}: {albumText(album.title, locale)}
          </LocaleLink>
        ) : (
          <LocaleLink
            to="/photography"
            className="interaction-link inline-flex items-center gap-2 border-b border-gold pb-1 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> {m.backToAlbums}
          </LocaleLink>
        )}
      </div>
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[1.6fr_1fr] md:px-8">
        <div>
          <span className="eyebrow inline-flex items-center gap-2 text-eyebrow">
            <MapPin className="size-3.5" /> {photo.location}
          </span>
          <h1 className="title-detail mt-3">{photo.title}</h1>
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
          className="interaction-link group flex items-center gap-3"
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
          className="interaction-link group flex items-center gap-3 text-right"
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
            {related.map((item, i) => (
              <div key={item.slug} {...reveal(i)}>
                <PhotoCard photo={item} ratio="aspect-[4/5]" frame="keyline" />
              </div>
            ))}
          </div>
        </section>
      )}
    </Surface>
  );
}
