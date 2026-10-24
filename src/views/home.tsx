import { ArrowRight, Camera, MapPin } from "lucide-react";
import { localizePhoto } from "@/content/photos";
import { albumText, getAlbumCover, getAlbums, getPublishedAlbum } from "@/content/albums";
import { aiWorks, localizeAiWork } from "@/content/ai-works";
import { AiCard, SectionHeading, btnPrimary, btnOutline } from "@/components/site";
import { PortraitSwitch } from "@/components/portrait";
import { Surface } from "@/components/surface";
import { getMessages, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import aboutAiRoyal from "@/assets/about-ai-royal-new.png";

const heroPhoto = "/hero/sunny-beach-real-hero.webp";
const heroAi = "/hero/sunny-beach-ai-future-hero-v2.webp";

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
      <section data-header-theme="dark" className="relative isolate bg-navy text-navy-foreground">
        <div
          data-hero-copy-region
          className="relative z-20 px-5 pb-10 pt-12 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-32 md:px-12 md:pb-0 md:pt-0 md:text-center"
        >
          <div data-hero-copy className="home-hero-copy">
            <p data-hero-eyebrow className="home-hero-eyebrow eyebrow relative text-gold">
              <span aria-hidden="true" data-hero-scrim className="home-hero-eyebrow-scrim" />
              {m.eyebrow}
            </p>
            <h1 data-hero-heading className="home-hero-title relative mt-4">
              <span className="home-hero-phrase">
                <span aria-hidden="true" data-hero-scrim className="home-hero-phrase-scrim" />
                {m.h1a}
              </span>
              <em className="home-hero-phrase text-gold">
                <span aria-hidden="true" data-hero-scrim className="home-hero-phrase-scrim" />
                {m.h1b}
              </em>
            </h1>
          </div>
        </div>
        <span
          aria-hidden="true"
          data-hero-separator
          className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-px -translate-x-1/2 bg-gold/70 md:block"
        />
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
            side="real"
          />
          <span
            aria-hidden="true"
            data-hero-mobile-separator
            className="h-px bg-gold/70 md:hidden"
          />
          <HeroHalf
            img={heroAi}
            alt={m.heroAiAlt}
            badge={<>{m.heroAiBadge}</>}
            to="/ai-worlds"
            cta={m.ctaAi}
            align="end"
            side="future"
          />
        </div>
      </section>

      <Surface tone="light" id="featured-albums" className="container-page section-y">
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
                decoding="async"
                style={cover.objectPosition ? { objectPosition: cover.objectPosition } : undefined}
                className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-(--dur-slow) ease-cinematic motion-safe:group-hover:scale-105 motion-reduce:transition-none"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/95 via-navy/30 to-transparent"
              />
              <span className="relative flex h-full min-h-[inherit] flex-col justify-end p-6 md:p-8">
                <span className="flex items-end justify-between gap-4">
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
      </Surface>

      <Surface tone="dark" seam>
        <div className="container-page section-y">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow={m.aiEyebrow} title={m.aiTitle} text={m.aiText} />
            <LocaleLink to="/ai-worlds" className={btnOutline}>
              {m.allAi} <ArrowRight className="size-4" />
            </LocaleLink>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {aiWorks.slice(0, 4).map((w, i) => (
              <AiCard key={w.slug} work={localizeAiWork(w, locale)} revealIndex={i} />
            ))}
          </div>
        </div>
      </Surface>

      <Surface
        tone="light"
        className="container-page section-y grid gap-10 md:grid-cols-[220px_1fr] md:items-start lg:grid-cols-[260px_1fr]"
      >
        <PortraitSwitch compact className="max-w-[260px]" aiImage={aboutAiRoyal} />
        <div className="max-w-2xl">
          <h2 className="title-section">{m.aboutTitle}</h2>
          <p className="mt-6 font-serif text-2xl leading-snug">{m.aboutLead}</p>
          {m.aboutText.split("\n\n").map((paragraph) => (
            <p key={paragraph} className="mt-5 text-muted-foreground">{paragraph}</p>
          ))}
          <LocaleLink
            to="/about"
            className="mt-8 inline-flex items-center gap-2 border-b border-gold pb-1 font-semibold hover:text-terracotta-ink"
          >
            {m.more} <ArrowRight className="size-4" />
          </LocaleLink>
        </div>
      </Surface>
    </>
  );
}

/** Four-point spark for the Gold Glow CTA; taller than wide so the 45° hover turn reads as a twinkle. */
function Spark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 1.5Q13.6 10.4 20 12Q13.6 13.6 12 22.5Q10.4 13.6 4 12Q10.4 10.4 12 1.5Z" />
    </svg>
  );
}

function HeroHalf({
  img,
  alt,
  badge,
  to,
  cta,
  align,
  side,
}: {
  img: string;
  alt: string;
  badge: React.ReactNode;
  to: "/photography" | "/ai-worlds";
  cta: string;
  align?: "end";
  side: "real" | "future";
}) {
  const Icon = side === "real" ? Camera : Spark;
  return (
    <div data-hero-panel={side} className="relative min-h-[62vh] overflow-hidden md:min-h-[88vh]">
      <img
        src={img}
        alt={alt}
        width={936}
        height={1053}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-navy/5 md:from-navy/85 md:via-navy/30"
      />
      <div
        className={`relative flex h-full min-h-[62vh] flex-col justify-between p-6 md:min-h-[88vh] md:p-10 ${align === "end" ? "md:items-end" : ""}`}
      >
        <span className="eyebrow inline-flex min-h-8 w-fit items-center gap-2 rounded-sm bg-navy/90 px-3 py-1.5 text-navy-foreground shadow-soft">
          {badge}
        </span>
        {/* Cream Print (photography) / Gold Glow (AI); styles live in styles.css. */}
        <LocaleLink
          to={to}
          className={`hero-cta hero-cta--${side === "real" ? "print" : "glow"} w-fit`}
        >
          <span className="hero-cta-face">
            {cta}
            <Icon aria-hidden="true" className="hero-cta-icon" />
          </span>
          {side === "future" && (
            // Same label in navy, revealed together with the gold sweep so each glyph keeps its contrast.
            <span aria-hidden="true" className="hero-cta-face hero-cta-overlay">
              {cta}
              <Icon aria-hidden="true" className="hero-cta-icon" />
            </span>
          )}
        </LocaleLink>
      </div>
    </div>
  );
}
