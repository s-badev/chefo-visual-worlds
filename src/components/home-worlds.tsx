// Home "One face, four worlds": a pinned scene in which the portrait's face stays put while the
// AI collection around it changes. Phones, short windows and reduced motion get a plain stacked
// list instead; CSS picks one of the two (see .home-worlds in styles.css), so server HTML and the
// first client render always agree.
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { collectionText } from "@/content/ai-collections";
import { getWorldPortraits, type WorldPortrait } from "@/content/home-worlds";
import { CollectionAtmosphere } from "@/components/ai-exhibition";
import { btnPrimary } from "@/components/site";
import { useT } from "@/i18n";
import { LocaleLink } from "@/i18n/link";
import { cn } from "@/lib/utils";
import {
  WORLD_COUNT,
  WORLDS_PIN_QUERY,
  computeFaceLayout,
  crossBlur,
  exposedIndex,
  layerOpacities,
  textStates,
  worldScrollTarget,
  worldsProgress,
} from "@/lib/worlds-motion";

export function HomeWorlds() {
  const { t } = useT();
  const worlds = getWorldPortraits();
  if (worlds.length !== WORLD_COUNT) return null;
  return (
    <section
      aria-label={t.home.worldsLabel}
      data-header-theme="dark"
      className="home-worlds surface-dark"
    >
      <PinnedWorlds worlds={worlds} />
      <StackedWorlds worlds={worlds} />
    </section>
  );
}

/** Primary action of one collection, aligned with the text column's left edge. */
function WorldActions({ world, className }: { world: WorldPortrait; className?: string }) {
  const { t, locale } = useT();
  const title = collectionText(world.collection.title, locale);
  return (
    <div className={cn("flex", className ?? "mt-8")}>
      <LocaleLink
        to="/ai-worlds/collections/$slug"
        slug={world.collection.slug}
        aria-label={`${t.ai.exploreCollection}: ${title}`}
        className={`${btnPrimary} group`}
      >
        {t.ai.exploreCollection}
        <ArrowRight aria-hidden="true" className="interaction-arrow size-4" />
      </LocaleLink>
    </div>
  );
}

function PinnedWorlds({ worlds }: { worlds: WorldPortrait[] }) {
  const { t, locale } = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const backdrops = useRef<(HTMLDivElement | null)[]>([]);
  const portraits = useRef<(HTMLImageElement | null)[]>([]);
  const copies = useRef<(HTMLDivElement | null)[]>([]);
  const [exposed, setExposed] = useState(0);
  const [near, setNear] = useState(false);

  /** Holds every face at the same anchor; runs on resize and whenever a portrait loads. */
  const layoutFaces = useCallback(() => {
    const box = boxRef.current;
    if (!box?.clientWidth) return;
    // Fractional size (clientWidth rounds), so the anchor matches the rendered box exactly.
    const rect = box.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };
    worlds.forEach((world, i) => {
      const img = portraits.current[i];
      if (!img) return;
      const metaWidth = world.work.width ?? img.naturalWidth;
      const naturalWidth = img.naturalWidth || metaWidth;
      const naturalHeight = img.naturalHeight || (world.work.height ?? 0);
      // The eyes were measured on the published file; a different rendition scales with it.
      const k = metaWidth ? naturalWidth / metaWidth : 1;
      const eyes = { mx: world.eyes.mx * k, my: world.eyes.my * k, d: world.eyes.d * k };
      const l = computeFaceLayout(size, { naturalWidth, naturalHeight, eyes });
      img.style.left = `${l.left}px`;
      img.style.top = `${l.top}px`;
      img.style.width = `${l.width}px`;
      img.style.height = `${l.height}px`;
      img.style.transformOrigin = `${l.originX}px ${l.originY}px`;
    });
  }, [worlds]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    layoutFaces();
    const observer = new ResizeObserver(layoutFaces);
    observer.observe(box);
    return () => observer.disconnect();
  }, [layoutFaces]);

  // One rAF-throttled scroll handler; styles are written straight to the layers.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const pinned = window.matchMedia(WORLDS_PIN_QUERY);
    let raf = 0;
    let shown = -1;
    let loading = false;
    const update = () => {
      raf = 0;
      // The stacked layout never loads the stage's images.
      if (!pinned.matches) return;
      const rect = track.getBoundingClientRect();
      // Start loading the four portraits and scenes 1.5 viewports before the stage arrives.
      if (!loading && rect.top < window.innerHeight * 2.5) {
        loading = true;
        setNear(true);
      }
      const { p, i0, t } = worldsProgress(rect.top, rect.height, window.innerHeight);
      const opacities = layerOpacities(i0, t);
      const texts = textStates(i0, t);
      const { blur, scale } = crossBlur(t);
      for (let i = 0; i < WORLD_COUNT; i++) {
        const crossing = t > 0 && (i === i0 || i === i0 + 1);
        const backdrop = backdrops.current[i];
        if (backdrop) backdrop.style.opacity = String(opacities[i]! * 0.95);
        const img = portraits.current[i];
        if (img) {
          img.style.opacity = String(opacities[i]);
          img.style.filter = crossing && blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : "";
          img.style.transform = crossing ? `scale(${scale.toFixed(4)})` : "";
        }
        const copy = copies.current[i];
        if (copy) {
          copy.style.opacity = String(texts[i]!.opacity);
          copy.style.transform = texts[i]!.y ? `translateY(${texts[i]!.y.toFixed(2)}px)` : "";
        }
      }
      if (railRef.current) railRef.current.style.width = `${(p * 100).toFixed(2)}%`;
      const next = exposedIndex(i0, t);
      if (next !== shown) {
        shown = next;
        setExposed(next);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    pinned.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      pinned.removeEventListener("change", schedule);
    };
  }, []);

  const jumpTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    window.scrollTo({
      top: worldScrollTarget(i, rect.top + window.scrollY, rect.height, window.innerHeight),
      behavior: "smooth",
    });
  };

  const active = worlds[exposed]!;
  return (
    <div ref={trackRef} className="home-worlds-pin">
      <div className="home-worlds-stage">
        <div aria-hidden="true" className="home-worlds-backdrops">
          {worlds.map((world, i) => (
            <div
              key={world.collection.slug}
              ref={(el) => {
                backdrops.current[i] = el;
              }}
              data-world-index={i}
              // ai-overview-hall picks up each scene's tuned blur, light and overlay (--bg-*).
              className="home-worlds-layer ai-overview-hall"
            >
              <CollectionAtmosphere collection={world.collection} eager={near} />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="home-worlds-scrim" />
        <div className="home-worlds-grid container-page">
          <div className="home-worlds-text">
            <p className="eyebrow text-eyebrow">{t.home.worldsLabel}</p>
            <div className="home-worlds-copies mt-5">
              {worlds.map((world, i) => (
                <div
                  key={world.collection.slug}
                  ref={(el) => {
                    copies.current[i] = el;
                  }}
                  data-world-index={i}
                  aria-hidden={exposed === i ? "false" : "true"}
                  className={cn("home-worlds-copy", exposed !== i && "pointer-events-none")}
                >
                  <h2 className="title-section break-words">
                    {collectionText(world.collection.title, locale)}
                  </h2>
                  <p className="lead mt-5 text-muted-foreground">
                    {collectionText(world.collection.intro, locale)}
                  </p>
                </div>
              ))}
            </div>
            <WorldActions world={active} />
            <div role="group" aria-label={t.home.worldsJump} className="home-worlds-names">
              {worlds.map((world, i) => (
                <button
                  key={world.collection.slug}
                  type="button"
                  aria-current={exposed === i ? "true" : undefined}
                  aria-label={collectionText(world.collection.title, locale)}
                  onClick={() => jumpTo(i)}
                  className={cn(
                    "home-worlds-name interaction-link eyebrow",
                    // The current name in the hover gold: >= 4.5:1 over every scene at 13px.
                    exposed === i ? "text-interaction-gold" : "text-muted-foreground",
                  )}
                >
                  {collectionText(world.collection.shortTitle, locale)}
                </button>
              ))}
            </div>
          </div>
          <div ref={boxRef} className="home-worlds-portrait">
            {worlds.map((world, i) => (
              <img
                key={world.collection.slug}
                ref={(el) => {
                  portraits.current[i] = el;
                }}
                data-world-index={i}
                src={world.work.image}
                alt={exposed === i ? world.work.alt : ""}
                aria-hidden={exposed === i ? undefined : "true"}
                width={world.work.width}
                height={world.work.height}
                loading={near ? "eager" : "lazy"}
                decoding="async"
                onLoad={layoutFaces}
              />
            ))}
          </div>
        </div>
        <div aria-hidden="true" className="home-worlds-rail">
          <span ref={railRef} />
        </div>
      </div>
    </div>
  );
}

/** Phones, short windows and reduced motion: four compact blocks, nothing moves. */
function StackedWorlds({ worlds }: { worlds: WorldPortrait[] }) {
  const { t, locale } = useT();
  return (
    <div className="home-worlds-stack pb-6 pt-12 md:pb-10 md:pt-20">
      <p className="container-page eyebrow text-eyebrow">{t.home.worldsLabel}</p>
      <ol className="mt-2 space-y-1 md:mt-4 md:space-y-4">
        {worlds.map((world) => (
          <li
            key={world.collection.slug}
            className="ai-overview-hall relative isolate overflow-hidden py-5 md:py-10"
          >
            <CollectionAtmosphere collection={world.collection} eager={false} />
            <div className="container-page grid items-center gap-4 md:grid-cols-12 md:gap-8">
              <img
                src={world.work.image}
                alt={world.work.alt}
                width={world.work.width}
                height={world.work.height}
                loading="lazy"
                decoding="async"
                // A 4:5 crop centred on the eyes.
                style={{
                  objectPosition: `50% ${((world.eyes.my / (world.work.height ?? world.eyes.my * 4)) * 100).toFixed(1)}%`,
                }}
                className="home-worlds-stack-portrait rounded-sm md:col-span-5"
              />
              <div className="ai-overview-hall-text md:col-span-6 md:col-start-7">
                <h2 className="home-worlds-stack-title title-section break-words">
                  {collectionText(world.collection.title, locale)}
                </h2>
                <p className="home-worlds-stack-intro mt-2 text-muted-foreground md:mt-5">
                  {collectionText(world.collection.intro, locale)}
                </p>
                <WorldActions world={world} className="mt-4 md:mt-8" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
