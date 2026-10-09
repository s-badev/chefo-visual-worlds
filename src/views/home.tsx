import { ArrowRight, MapPin } from "lucide-react";
import { localizePhoto } from "@/content/photos";
import { albumText, getAlbumCover, getAlbums, getPublishedAlbum } from "@/content/albums";
import { aiWorks, localizeAiWork } from "@/content/ai-works";
import { AiCard, SectionHeading, btnHero, btnPrimary, btnOutline } from "@/components/site";
import { PortraitSwitch } from "@/components/portrait";
import { getMessages, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import heroPhoto from "@/assets/photo-nesebar-coast.jpg";
import heroAi from "@/assets/ai-knight.png";

export const homeHead = (locale: Locale) => {
  const m = getMessages(locale).home;
  return pageHead(locale, "/", m.metaTitle, m.metaDesc);
};

const FEATURED_ALBUM_SLUGS = ["nessebar", "sofia", "sunny-beach"] as const;

export function HomeView() {
  const { t, locale } = useT();
  const m = t.home;
  const featuredAlbums = FEATURED_ALBUM_SLUGS.flatMap((slug) => {
    const album = getPublishedAlbum(slug);
    const cover = album && getAlbumCover(album);
    return album && cover ? [{ album, cover: localizePhoto(cover, locale) }] : [];
  });

  return (
    <>
      <section data-header-theme="dark" className="relative bg-navy text-navy-foreground">
        <div className="px-5 pb-10 pt-12 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-32 md:z-10 md:px-12 md:pb-0 md:pt-0 md:text-center">
          <p className="eyebrow text-gold">{m.eyebrow}</p>
          <h1 className="mt-4 text-5xl leading-[1.02] md:text-7xl lg:text-8xl">
            {m.h1a}
            <em className="text-gold">{m.h1b}</em>
          </h1>
        </div>
        <div className="grid md:grid-cols-2">
          <HeroHalf
            img={heroPhoto}
            alt={m.heroPhotoAlt}
            badge={
              <>
                <MapPin className="size-3.5 text-gold" /> {m.heroPhotoBadge}
              </>
            }
            to="/photography"
            cta={m.ctaPhotos}
          />
          <HeroHalf
            img={heroAi}
            alt={m.heroAiAlt}
            badge={<>{t.common.aiBadge}</>}
            to="/ai-worlds"
            cta={m.ctaAi}
            align="end"
          />
        </div>
      </section>

      <section id="featured-albums" data-header-theme="light" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <SectionHeading eyebrow={m.photoEyebrow} title={m.photoTitle} text={m.photoText} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:h-[42rem] lg:grid-cols-[1.35fr_1fr] lg:grid-rows-2 lg:gap-6">
          {featuredAlbums.map(({ album, cover }, index) => (
            <LocaleLink
              key={album.id}
              to="/photography/albums/$slug"
              slug={album.slug}
              className={`group relative isolate block min-h-[20rem] overflow-hidden rounded-md bg-navy text-navy-foreground shadow-soft outline-none transition-shadow duration-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 motion-reduce:transition-none ${index === 0 ? "min-h-[26rem] sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-0" : "lg:min-h-0"}`}
            >
              <img
                src={cover.image}
                alt={cover.alt}
                width={cover.width}
                height={cover.height}
                loading={index === 0 ? "eager" : "lazy"}
                style={cover.objectPosition ? { objectPosition: cover.objectPosition } : undefined}
                className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105 motion-reduce:transition-none"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/95 via-navy/30 to-transparent"
              />
              <span className="relative flex h-full min-h-[inherit] flex-col justify-between p-6 md:p-8">
                <span className="eyebrow text-gold">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex items-end justify-between gap-4 border-t border-navy-foreground/40 pt-5">
                  <span>
                    <span
                      className={`block font-serif leading-tight ${index === 0 ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"}`}
                    >
                      {albumText(album.title, locale)}
                    </span>
                    <span className="mt-2 block text-sm text-navy-foreground/85">
                      {t.photos.count(album.photos.length)}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mb-1 size-5 shrink-0 text-gold transition-transform motion-safe:group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </span>
              </span>
            </LocaleLink>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <LocaleLink to="/photography" className={`${btnPrimary} group`}>
            {m.allAlbums(getAlbums().length)}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform motion-safe:group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </LocaleLink>
        </div>
      </section>

      <section data-header-theme="dark" className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading dark eyebrow={m.aiEyebrow} title={m.aiTitle} text={m.aiText} />
            <LocaleLink to="/ai-worlds" className={btnOutline}>
              {m.allAi} <ArrowRight className="size-4" />
            </LocaleLink>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {aiWorks.slice(0, 4).map((w) => (
              <AiCard key={w.slug} work={localizeAiWork(w, locale)} />
            ))}
          </div>
        </div>
      </section>

      <section
        data-header-theme="light"
        className="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[220px_1fr] md:items-start md:px-8 lg:grid-cols-[260px_1fr]"
      >
        <PortraitSwitch compact className="max-w-[260px]" />
        <div className="max-w-2xl">
          <h2 className="text-5xl">{m.aboutTitle}</h2>
          {/* TODO: заменете с ваш текст (в src/i18n/messages.ts) */}
          <p className="mt-6 font-serif text-2xl leading-snug">{m.aboutLead}</p>
          <p className="mt-5 text-muted-foreground">{m.aboutText}</p>
          <LocaleLink
            to="/about"
            className="mt-8 inline-flex items-center gap-2 border-b border-gold pb-1 font-semibold hover:text-terracotta"
          >
            {m.more} <ArrowRight className="size-4" />
          </LocaleLink>
        </div>
      </section>
    </>
  );
}

function HeroHalf({
  img,
  alt,
  badge,
  to,
  cta,
  align,
}: {
  img: string;
  alt: string;
  badge: React.ReactNode;
  to: "/photography" | "/ai-worlds";
  cta: string;
  align?: "end";
}) {
  return (
    <div className="relative min-h-[62vh] overflow-hidden md:min-h-[88vh]">
      <img
        src={img}
        alt={alt}
        width={1280}
        height={1600}
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/45 to-navy/10 md:via-navy/55" />
      <div
        className={`relative flex h-full min-h-[62vh] flex-col justify-between p-6 md:min-h-[88vh] md:p-10 ${align === "end" ? "md:items-end" : ""}`}
      >
        <span className="eyebrow inline-flex w-fit items-center gap-2 rounded-sm bg-navy/80 px-3 py-1.5 text-navy-foreground">
          {badge}
        </span>
        <LocaleLink to={to} className={`${btnHero} w-fit`}>
          {cta} <ArrowRight className="size-4" />
        </LocaleLink>
      </div>
    </div>
  );
}
