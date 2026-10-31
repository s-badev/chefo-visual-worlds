import { preload } from "react-dom";
import { ArrowRight } from "lucide-react";
import { localizePhoto } from "@/content/photos";
import { albumText, getAlbumCover, getAlbums, getPublishedAlbum } from "@/content/albums";
import { getAiWork, localizeAiWork } from "@/content/ai-works";
import { AiCard, SectionHeading, btnPrimary, btnOutline } from "@/components/site";
import { PortraitSwitch } from "@/components/portrait";
import { Surface } from "@/components/surface";
import { getMessages, pageHead, useT, type Locale } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import aboutAiRoyal from "@/assets/about-ai-royal-new.png";

/** Responsive sources for the Home hero portrait: AVIF first, WebP as the fallback. */
const HERO_IMAGES = {
  desktop: {
    avif: "/hero/chefo-hero-desktop-1280.avif 1280w, /hero/chefo-hero-desktop-1672.avif 1672w",
    webp: "/hero/chefo-hero-desktop-1280.webp 1280w, /hero/chefo-hero-desktop-1672.webp 1672w",
  },
  mobile: {
    avif: "/hero/chefo-hero-mobile-640.avif 640w, /hero/chefo-hero-mobile-941.avif 941w",
    webp: "/hero/chefo-hero-mobile-640.webp 640w, /hero/chefo-hero-mobile-941.webp 941w",
  },
} as const;
const HERO_DESKTOP = "(min-width: 900px)";

export const homeHead = (locale: Locale) => {
  const m = getMessages(locale).home;
  return pageHead(locale, "/", m.metaTitle, m.metaDesc);
};

/**
 * React does not preload an <img> inside <picture>, so the hero (the LCP image) would queue
 * behind the page's other image preloads. A high-priority preload per breakpoint is flushed
 * first. AVIF only: browsers without it skip the hint and take the WebP source.
 */
function preloadHeroImage() {
  for (const [media, srcSet] of [
    [HERO_DESKTOP, HERO_IMAGES.desktop.avif],
    ["(max-width: 899px)", HERO_IMAGES.mobile.avif],
  ] as const) {
    preload(srcSet.split(", ").at(-1)!.split(" ")[0]!, {
      as: "image",
      type: "image/avif",
      media,
      imageSrcSet: srcSet,
      imageSizes: "100vw",
      fetchPriority: "high",
    });
  }
}

const FEATURED_ALBUM_SLUGS = ["nessebar", "sofia", "sunny-beach"] as const;

/** Home AI preview: curated card titles aligned with the published artwork metadata. */
const FEATURED_AI_WORKS: {
  slug: string;
  title: Record<Locale, string>;
  objectPosition?: string;
}[] = [
  {
    slug: "chefo-srednovekoven-ritsar",
    title: { bg: "Крал на лъва", en: "The Lion King" },
  },
  {
    slug: "captain-against-the-storm",
    title: { bg: "Капитанът срещу бурята", en: "Captain Against the Storm" },
  },
  {
    slug: "rainy-neon-noir",
    title: { bg: "Последният свидетел", en: "The Last Witness" },
  },
  {
    slug: "chefo-v-turtsiya",
    title: { bg: "Вечер край Босфора", en: "Evening on the Bosphorus" },
    // Lower focal point keeps the face, the mosque skyline and the tea glass in the 4:5 card.
    objectPosition: "50% 70%",
  },
];

export function HomeView() {
  const { t, locale } = useT();
  const m = t.home;
  const featuredAlbums = FEATURED_ALBUM_SLUGS.flatMap((slug) => {
    const album = getPublishedAlbum(slug);
    const cover = album && getAlbumCover(album);
    return album && cover ? [{ album, cover: localizePhoto(cover, locale) }] : [];
  });
  const featuredAiWorks = FEATURED_AI_WORKS.flatMap(({ slug, title, objectPosition }) => {
    const work = getAiWork(slug);
    return work
      ? [{ work: { ...localizeAiWork(work, locale), title: title[locale] }, objectPosition }]
      : [];
  });

  return (
    <>
      <HomeHero />

      <Surface tone="light" id="featured-albums" className="container-page section-y">
        <SectionHeading eyebrow={m.photoEyebrow} title={m.photoTitle} text={m.photoText} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:h-[42rem] lg:grid-cols-[1.35fr_1fr] lg:grid-rows-2 lg:gap-6">
          {featuredAlbums.map(({ album, cover }, index) => (
            <LocaleLink
              key={album.id}
              to="/photography/albums/$slug"
              slug={album.slug}
              className={`group relative isolate block min-h-[20rem] overflow-hidden rounded-md bg-navy text-navy-foreground shadow-soft outline-none transition-shadow duration-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-interaction-gold focus-visible:ring-offset-4 motion-reduce:transition-none ${index === 0 ? "min-h-[26rem] sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-0" : "lg:min-h-0"}`}
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
              className="interaction-arrow size-4"
            />
          </LocaleLink>
        </div>
      </Surface>

      <Surface tone="dark" seam>
        <div className="container-page section-y">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow={m.aiEyebrow} title={m.aiTitle} text={m.aiText} />
            <LocaleLink to="/ai-worlds" className={btnOutline}>
              {m.allAi} <ArrowRight className="interaction-arrow size-4" />
            </LocaleLink>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {featuredAiWorks.map(({ work, objectPosition }, i) => (
              <AiCard key={work.slug} work={work} objectPosition={objectPosition} revealIndex={i} />
            ))}
          </div>
        </div>
      </Surface>

      <Surface
        tone="light"
        className="container-page section-y grid gap-10 lg:grid-cols-[clamp(300px,26vw,380px)_1fr] lg:items-start"
      >
        {/* Stacked below lg; the width cap keeps the frame under 75dvh tall on short screens. */}
        <PortraitSwitch
          compact
          className="w-full max-w-[min(380px,calc(75dvh*var(--about-portrait-ratio)))]"
          aiImage={aboutAiRoyal}
        />
        <div className="max-w-2xl">
          <h2 className="title-section">{m.aboutTitle}</h2>
          <p className="mt-6 font-serif text-2xl leading-snug">{m.aboutLead}</p>
          {m.aboutText.split("\n\n").map((paragraph) => (
            <p key={paragraph} className="mt-5 text-muted-foreground">{paragraph}</p>
          ))}
          <LocaleLink
            to="/about"
            className="interaction-link interaction-text-button mt-8 inline-flex items-center gap-2 border-b border-gold pb-1 font-semibold"
          >
            {m.more} <ArrowRight className="size-4" />
          </LocaleLink>
        </div>
      </Surface>
    </>
  );
}

/**
 * Full-viewport Home hero: the owner's portrait between real places and imagined worlds, with
 * live copy on the left (below the camera on phones). It sits under the transparent header.
 */
function HomeHero() {
  const { t } = useT();
  const m = t.home;
  preloadHeroImage();
  return (
    <section data-header-theme="dark" className="home-hero surface-dark">
      {/* While this strip is in view the Home header stays transparent (see SiteHeader). */}
      <div aria-hidden="true" data-header-sentinel className="home-hero-sentinel" />
      <picture>
        <source
          media={HERO_DESKTOP}
          type="image/avif"
          srcSet={HERO_IMAGES.desktop.avif}
          sizes="100vw"
          width={1672}
          height={941}
        />
        <source
          media={HERO_DESKTOP}
          type="image/webp"
          srcSet={HERO_IMAGES.desktop.webp}
          sizes="100vw"
          width={1672}
          height={941}
        />
        <source type="image/avif" srcSet={HERO_IMAGES.mobile.avif} sizes="100vw" />
        <img
          src="/hero/chefo-hero-mobile-941.webp"
          srcSet={HERO_IMAGES.mobile.webp}
          sizes="100vw"
          alt=""
          width={941}
          height={1672}
          fetchPriority="high"
          decoding="async"
          className="home-hero-image"
        />
      </picture>
      <div aria-hidden="true" className="home-hero-shade" />
      <div className="home-hero-content">
        <div className="home-hero-copy" data-home-hero-copy>
          <p className="eyebrow home-hero-eyebrow">{m.eyebrow}</p>
          <h1 className="home-hero-title">
            <span className="home-hero-title-primary">{m.h1a}</span>
            <br />
            <em>{m.h1b}</em>
          </h1>
          <p className="home-hero-sub">{m.heroSub}</p>
          <div className="home-hero-actions">
            <LocaleLink
              to="/photography"
              className={`home-hero-button ${btnPrimary}`}
            >
              {m.ctaPhotos}
              <ArrowRight aria-hidden="true" className="interaction-arrow size-4" />
            </LocaleLink>
            <LocaleLink to="/ai-worlds" className={`home-hero-button ${btnOutline}`}>
              {m.ctaAi}
            </LocaleLink>
          </div>
        </div>
      </div>
    </section>
  );
}
