import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { photoCategoryLabel, type Photo } from "@/content/photos";
import { toolLabel, type AiWork } from "@/content/ai-works";
import { getMessages, useT, type Locale } from "@/i18n";
import { LanguageSwitcher, LocaleLink } from "@/i18n/link";
import { siteConfig } from "@/content/site-config";
import { getAlbums } from "@/content/albums";
import { getAiCollections } from "@/content/ai-collections";
import { riseItemStyle } from "@/hooks/use-grid-rise";
import { reveal } from "@/hooks/use-reveal";
import { copyText, type CopyResult } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import {
  getInitialHeaderTheme,
  isHeaderScrolled,
  resolveHeaderTheme,
  type HeaderTheme,
} from "@/components/header-theme";

const NAV = [
  { to: "/photography", key: "photography" },
  { to: "/ai-worlds", key: "ai" },
  { to: "/about", key: "about" },
] as const;

/** The mobile menu adds Home before the three sections, as in the mock. */
const MENU = [{ to: "/", key: "home" }, ...NAV] as const;

/** Bold CHEFO and regular VISUAL WORLDS separated by space only; no separator glyph. */
export function Wordmark({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <LocaleLink
      to="/"
      onClick={onClick}
      aria-label="Chefo Visual Worlds"
      className={cn("font-serif text-lg tracking-[0.18em] whitespace-nowrap", className)}
    >
      <span className="font-bold">CHEFO</span> <span className="font-normal">VISUAL WORLDS</span>
    </LocaleLink>
  );
}

/** Header logo: round portrait icon and wordmark ("CHEFO" only on phones), one link home.
 * Bold CHEFO and regular VISUAL WORLDS are one inline text run joined by an ordinary word space,
 * so both gaps match; .brand-lockup-text draws one hover/focus underline under all three words. */
export function BrandLockup({ onClick }: { onClick?: () => void }) {
  const { t } = useT();
  return (
    <LocaleLink
      to="/"
      onClick={onClick}
      aria-label={t.nav.home}
      className="interaction-link brand-lockup flex min-h-11 items-center gap-3 rounded-sm"
    >
      <img
        src="/brand/chefo-icon.svg"
        alt=""
        width={44}
        height={44}
        className="size-9 shrink-0 rounded-full ring-1 ring-gold/40 md:size-11"
      />
      <span className="brand-lockup-text whitespace-nowrap font-serif text-xl uppercase tracking-[0.14em] md:text-[1.4375rem]">
        <span className="font-bold">CHEFO</span>
        <span className="hidden font-normal md:inline"> Visual Worlds</span>
      </span>
    </LocaleLink>
  );
}

const isHomePath = (pathname: string) => (pathname.replace(/^\/en(?=\/|$)/, "") || "/") === "/";
/** An album page: its cover slides under the header, as the Home hero does (stage 9c). */
const isAlbumPath = (pathname: string) =>
  /^\/photography\/albums\/[^/]+\/?$/.test(pathname.replace(/^\/en(?=\/|$)/, ""));

/**
 * On Home and on album pages the header floats transparently over the hero (the album cover)
 * until a sentinel at its top leaves the viewport. The server and the first client render agree
 * on the top state.
 */
function useTransparentOverHero() {
  const pathname = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname,
  });
  const home = isHomePath(pathname) || isAlbumPath(pathname);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    if (!home) return;
    const sentinel = document.querySelector("[data-header-sentinel]");
    // Without the observer (or the hero) the solid header is the readable choice.
    if (!sentinel || typeof IntersectionObserver === "undefined") {
      setAtTop(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setAtTop(entry!.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [home, pathname]);

  return home && atTop;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Route theme is available in SSR; the rendered surface remains authoritative after mounting. */
function useHeaderTheme(ref: React.RefObject<HTMLElement | null>) {
  const pathname = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname,
  });
  const pendingPath = useRouterState({ select: (s) => s.location.pathname });
  const matches = useRouterState({ select: (s) => s.matches });
  const [sample, setSample] = useState<{
    pathname: string;
    theme: HeaderTheme;
    scroll: boolean;
  } | null>(null);
  const latestPath = useRef(pathname);
  latestPath.current = pathname;

  const probe = useCallback(
    (scroll: boolean) => {
      const header = ref.current;
      if (!header) return;
      const y = header.getBoundingClientRect().bottom + 1;
      const x = window.innerWidth / 2;
      const next = resolveHeaderTheme(document.elementsFromPoint(x, y), header);
      const path = latestPath.current;
      setSample((current) =>
        current?.pathname === path && current.theme === next
          ? current
          : { pathname: path, theme: next, scroll },
      );
    },
    [ref],
  );

  // TanStack updates resolvedLocation after the new view commits. The matches
  // dependency lets this probe run during that commit, before the browser paints.
  useIsomorphicLayoutEffect(() => {
    probe(false);
  }, [pathname, pendingPath, matches, probe]);

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          flushSync(() => probe(pendingPath === pathname));
        });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname, pendingPath, probe]);

  return {
    theme: sample?.pathname === pathname ? sample.theme : getInitialHeaderTheme(pathname),
    animate: sample?.pathname === pathname && sample.scroll && pendingPath === pathname,
  };
}

/** Server and first client render agree on the top state; scrolling may then turn it on. */
function useScrolledHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(isHeaderScrolled(window.scrollY));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
    };
  }, []);
  return scrolled;
}

/**
 * The mock's header navigation: one gold pill rests on the current page and glides to the item
 * under the pointer or keyboard focus, then back; the label rolls up to its gold copy (the copy
 * is hidden from screen readers). A click stamps the pill once. Placed after mount only.
 */
function HeaderNav({ pathname }: { pathname: string }) {
  const { t } = useT();
  const wrapRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const wrap = wrapRef.current;
    const ind = indRef.current;
    if (!wrap || !ind) return;
    const links = Array.from(wrap.querySelectorAll<HTMLAnchorElement>(".site-nav-link"));
    const current = () => wrap.querySelector<HTMLElement>(".site-nav-link.is-current");
    const place = (target: HTMLElement | null, instant: boolean) => {
      if (!target) {
        delete ind.dataset["on"];
        return;
      }
      const r = target.getBoundingClientRect();
      const n = wrap.getBoundingClientRect();
      if (!r.width) return;
      if (instant) ind.style.transition = "none";
      ind.style.setProperty("--x", `${r.left - n.left}px`);
      ind.style.setProperty("--y", `${r.top - n.top}px`);
      ind.style.setProperty("--w", `${r.width}px`);
      ind.style.setProperty("--h", `${r.height}px`);
      ind.dataset["on"] = "";
      if (instant) {
        void ind.offsetWidth;
        ind.style.transition = "";
      }
    };
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const placed = () => "on" in ind.dataset;
    place(current(), true);
    const offs: (() => void)[] = [];
    const listen = (el: EventTarget, type: string, fn: (e: Event) => void) => {
      el.addEventListener(type, fn);
      offs.push(() => el.removeEventListener(type, fn));
    };
    for (const a of links) {
      listen(a, "pointerenter", (e) => {
        if ((e as PointerEvent).pointerType !== "touch") place(a, !placed());
      });
      listen(a, "pointerleave", (e) => {
        if ((e as PointerEvent).pointerType !== "touch") place(current(), false);
      });
      listen(a, "focus", () => place(a, !placed()));
      listen(a, "blur", () => place(current(), false));
      listen(a, "click", () => {
        if (reduced()) return;
        delete ind.dataset["stamp"];
        void ind.offsetWidth;
        ind.dataset["stamp"] = "";
      });
    }
    listen(window, "resize", () => place(current(), true));
    void document.fonts?.ready.then(() => place(current(), true));
    return () => offs.forEach((off) => off());
  }, [pathname]);
  return (
    <nav aria-label={t.nav.main} className="site-nav hidden lg:flex lg:items-center">
      <div ref={wrapRef} className="site-nav-wrap">
        <ul className="site-nav-list">
          {NAV.map((n) => (
            <li key={n.to}>
              <LocaleLink to={n.to} className="site-nav-link" activeClassName="is-current">
                <span className="site-nav-roll">
                  <span className="site-nav-roll-in">
                    <span>{t.nav[n.key]}</span>
                    <span aria-hidden="true">{t.nav[n.key]}</span>
                  </span>
                </span>
              </LocaleLink>
            </li>
          ))}
        </ul>
        <span ref={indRef} aria-hidden="true" className="site-nav-ind" />
      </div>
    </nav>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { theme, animate } = useHeaderTheme(ref);
  const overHero = useTransparentOverHero();
  const scrolled = useScrolledHeader();
  const { t } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The open mobile menu always shows the solid navy header.
  const transparent = overHero && !open;
  const dark = transparent || theme === "dark" || open;

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      ref={ref}
      data-theme={dark ? "dark" : "light"}
      data-transparent={transparent ? "" : undefined}
      data-scrolled={scrolled ? "" : undefined}
      className={cn(
        "sticky top-0 z-40 border-b",
        animate || isHomePath(pathname)
          ? "transition-colors duration-350 motion-reduce:transition-none"
          : "transition-none",
        transparent
          ? "border-navy-foreground/12 bg-transparent text-navy-foreground"
          : dark
            ? "border-navy-border bg-navy text-navy-foreground"
            : "border-border bg-background text-foreground",
      )}
    >
      {/* One container on every route: the logo and the language switch never move between pages. */}
      <div
        data-home-header-row={isHomePath(pathname) ? "" : undefined}
        className="home-header-row flex h-16 items-center justify-between"
      >
        <BrandLockup />
        <HeaderNav pathname={pathname} />
        <LanguageSwitcher label={t.nav.language} className="site-header-lang" />
        <Dialog.Root open={open} onOpenChange={setOpen}>
          {/* The ::after enlarges the touch target to 44px without moving the icon. */}
          <Dialog.Trigger
            className="site-menu-button lg:hidden"
            aria-label={open ? t.nav.close : t.nav.open}
          >
            <span aria-hidden="true" className="site-menu-button-lines" />
          </Dialog.Trigger>
          <Dialog.Portal>
            {/* Radix locks page scroll through the overlay. */}
            <Dialog.Overlay className="site-menu-overlay" />
            {/* The mock's menu: navy, opening as a circle from the menu button, big serif links. */}
            <Dialog.Content aria-describedby={undefined} className="site-menu">
              <Dialog.Title className="sr-only">{t.nav.mobile}</Dialog.Title>
              <div data-theme="dark" className="home-header-row site-menu-top">
                <BrandLockup onClick={() => setOpen(false)} />
                <Dialog.Close className="site-menu-close" aria-label={t.nav.close}>
                  <X aria-hidden="true" className="size-5" />
                </Dialog.Close>
              </div>
              <nav aria-label={t.nav.mobile} className="site-menu-nav">
                {MENU.map((n) => (
                  <LocaleLink
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="site-menu-link"
                    activeClassName="is-current"
                  >
                    {n.key === "home" ? t.nav.homeShort : t.nav[n.key]}
                    <small aria-hidden="true">
                      {n.key === "photography"
                        ? `${getAlbums().length} / ${t.nav.albums}`
                        : n.key === "ai"
                          ? `${getAiCollections().length} / ${t.nav.collections}`
                          : ""}
                    </small>
                  </LocaleLink>
                ))}
              </nav>
              <div className="site-menu-foot">
                <span>{t.nav.menuFoot}</span>
                <LanguageSwitcher label={t.nav.language} onSwitch={() => setOpen(false)} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}

/**
 * The mock's footer (.ft): the logo and the tagline on the left, the three sections on the
 * right, then a hairline and the copyright with the site's line. Instagram and e-mail join the
 * links only once they are filled in (site-config.ts).
 */
export function SiteFooter() {
  const instagram = siteConfig.instagramUrl.trim();
  const email = siteConfig.contactEmail.trim();
  const { t } = useT();
  return (
    <footer data-header-theme="dark" className="site-footer">
      <div className="site-footer-grid">
        <div>
          <BrandLockup />
          <p className="site-footer-tag">{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.footer.nav} className="site-footer-nav">
          {NAV.map((n) => (
            <LocaleLink key={n.to} to={n.to} className="site-footer-link">
              {t.nav[n.key]}
            </LocaleLink>
          ))}
          {instagram && (
            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer-link"
            >
              Instagram
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="site-footer-link">
              {t.footer.email}
            </a>
          )}
        </nav>
        <div className="site-footer-base">
          <span>
            © {new Date().getFullYear()} Chefo Visual Worlds. {t.footer.rights}
          </span>
          <span>{t.footer.motto}</span>
        </div>
      </div>
    </footer>
  );
}

/** Page-level title block; colors follow the surrounding Surface. */
export function PageHeader({
  eyebrow,
  title,
  intro,
  size = "page",
  className,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  size?: "page" | "detail";
  className?: string;
}) {
  return (
    <header className={cn("max-w-2xl", className)}>
      <p className="eyebrow section-eyebrow text-eyebrow">{eyebrow}</p>
      <h1 className={cn("mt-3", size === "page" ? "title-page" : "title-detail")}>{title}</h1>
      {intro && <p className="lead mt-5 max-w-xl text-muted-foreground">{intro}</p>}
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
  emphasis,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  /** "last": the last word in gold italics, as in the mock ("През моя <em>обектив</em>"). */
  emphasis?: "last";
}) {
  const cut = emphasis === "last" ? title.lastIndexOf(" ") : -1;
  return (
    <div className="max-w-2xl" {...reveal()}>
      {eyebrow && <p className="eyebrow section-eyebrow text-eyebrow">{eyebrow}</p>}
      <h2 className="title-section mt-3">
        {cut > 0 ? (
          <>
            {title.slice(0, cut + 1)}
            <em className="section-title-em">{title.slice(cut + 1)}</em>
          </>
        ) : (
          title
        )}
      </h2>
      {text && <p className="lead mt-4 text-muted-foreground">{text}</p>}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "interaction-control interaction-text-button min-h-11 shrink-0 whitespace-nowrap rounded-full border py-1.5 text-sm transition-colors duration-(--dur-fast) ease-cinematic",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-interaction-gold",
      )}
    >
      {children}
    </button>
  );
}

/** Labelled filter group: one scrollable row on mobile, wraps from sm up. */
export function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:flex sm:items-center" role="group" aria-label={label}>
      <span className="eyebrow shrink-0 text-muted-foreground sm:mr-2 sm:w-24">{label}</span>
      <div className="chip-row no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible">
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ text, onClear }: { text: string; onClear: () => void }) {
  const { t } = useT();
  return (
    <div className="mt-16 max-w-md">
      <p className="font-serif text-2xl italic text-muted-foreground">{text}</p>
      <button type="button" onClick={onClear} className={cn("mt-6", btnPrimary)}>
        {t.common.clearFilters}
      </button>
    </div>
  );
}

const cardImage =
  "h-full w-full object-cover transition-transform duration-(--dur-slow) ease-cinematic motion-safe:group-hover:scale-[1.03]";
/** AI cards lift the whole image box instead (.ai-card-media in styles.css), so no zoom here. */
const aiCardImage = "h-full w-full object-cover";

/** Expects a photo already localized with localizePhoto(). */
export function PhotoCard({
  photo,
  ratio = "aspect-[4/5]",
  onOpen,
  themeLabel,
  frame,
}: {
  photo: Photo;
  ratio?: string;
  onOpen?: () => void;
  themeLabel?: string;
  frame?: "keyline";
}) {
  const { t, locale } = useT();
  const img = (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted shadow-soft",
        ratio,
        frame === "keyline" && "photo-frame-keyline",
      )}
    >
      <img
        src={photo.image}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
        className={cardImage}
      />
    </div>
  );
  const meta = (
    <div className="mt-3 space-y-1">
      <p className="eyebrow text-eyebrow">
        {themeLabel ?? photoCategoryLabel(photo.category, locale)}
      </p>
      <p className="font-serif text-xl leading-tight">{photo.location}</p>
      <p className="text-sm text-muted-foreground">{photo.caption ?? photo.title}</p>
    </div>
  );
  if (onOpen) {
    return (
      <figure className="group">
        <button
          type="button"
          onClick={onOpen}
          className="interaction-media block w-full text-left"
          aria-label={t.common.openFullscreen(photo.title)}
        >
          {img}
        </button>
        <figcaption>
          <LocaleLink
            to="/photography/$slug"
            slug={photo.slug}
            className="interaction-link block transition-colors"
          >
            {meta}
          </LocaleLink>
        </figcaption>
      </figure>
    );
  }
  return (
    <LocaleLink to="/photography/$slug" slug={photo.slug} className="group block">
      {img}
      {meta}
    </LocaleLink>
  );
}

export async function copyPromptWithToast(
  prompt: string | undefined,
  locale: Locale,
): Promise<CopyResult> {
  const m = getMessages(locale).common;
  const r = await copyText(prompt);
  if (r === "ok") toast.success(m.copied);
  else if (r === "error") toast.error(m.copyFailed);
  return r;
}

/** AI overview card (expects a localized work) (dark sections). */
export function AiCard({
  work,
  className,
  riseIndex,
  frame,
  objectPosition,
}: {
  work: AiWork;
  className?: string;
  /** Position in a rising grid (useGridRise): sets this card's stagger delay. */
  riseIndex?: number;
  /** Optional decorative treatment for explicitly approved compact AI grids. */
  frame?: "compact";
  /** Focal point for the 4:5 crop when the centred default would cut the subject. */
  objectPosition?: string | undefined;
}) {
  const { t, locale } = useT();
  const provider =
    work.tool === "ChatGPT Image Generation" || work.tool === "Gemini Nano Banana"
      ? toolLabel(work.tool, locale)
      : null;
  return (
    <article
      className={cn("ai-card group min-w-0", className)}
      style={riseIndex !== undefined ? riseItemStyle(riseIndex) : undefined}
    >
      <LocaleLink to="/ai-worlds/$slug" slug={work.slug} className="block">
        {/* Hover (styles.css): the box lifts with a deeper shadow and a light sweep crosses it. */}
        <div
          className={cn(
            "ai-card-media relative aspect-[4/5] overflow-hidden rounded-md",
            frame === "compact" && "ai-frame-compact",
          )}
        >
          <img
            src={work.image}
            alt={work.alt}
            width={work.width ?? 1024}
            height={work.height ?? 1280}
            loading="lazy"
            decoding="async"
            className={aiCardImage}
            style={objectPosition ? { objectPosition } : undefined}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-interaction-gold/0 transition-shadow duration-(--dur-base) ease-cinematic group-hover:ring-interaction-gold/40 group-focus-within:ring-interaction-gold/60"
          />
          <span className="eyebrow absolute left-3 top-3 z-[1] rounded-sm bg-navy/80 px-2 py-1 text-gold">
            {t.common.aiBadge}
          </span>
        </div>
        <h3 className="title-card mt-3 font-serif transition-colors duration-200 group-hover:text-interaction-gold">
          {work.title}
        </h3>
      </LocaleLink>
      {provider && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground">{provider}</p>
        </div>
      )}
    </article>
  );
}

// The shared full-screen viewer lives in its own module; it is re-exported here for its callers.
export { Lightbox, type LightboxItem } from "@/components/lightbox";

const btnMotion = "transition-colors duration-(--interaction-duration) ease-cinematic";
export const btnPrimary = `interaction-primary inline-flex items-center gap-2 rounded-sm text-sm font-semibold tracking-wide ${btnMotion}`;
export const btnOutline = `interaction-secondary inline-flex items-center gap-2 rounded-sm text-sm font-semibold tracking-wide ${btnMotion}`;
