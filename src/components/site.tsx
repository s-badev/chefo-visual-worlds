import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, Menu, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { photoCategoryLabel, type Photo } from "@/content/photos";
import { toolLabel, type AiWork } from "@/content/ai-works";
import { getMessages, useT, type Locale } from "@/i18n";
import { LanguageSwitcher, LocaleLink } from "@/i18n/link";
import { siteConfig } from "@/content/site-config";
import { reveal } from "@/hooks/use-reveal";
import { copyText, type CopyResult } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { getInitialHeaderTheme, type HeaderTheme } from "@/components/header-theme";

const NAV = [
  { to: "/photography", key: "photography" },
  { to: "/ai-worlds", key: "ai" },
  { to: "/about", key: "about" },
] as const;

export function Wordmark({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <LocaleLink
      to="/"
      onClick={onClick}
      className={cn("font-serif text-lg tracking-[0.18em] whitespace-nowrap", className)}
    >
      CHEFO{" "}
      <span className="text-gold [[data-theme=dark]_&]:text-white [[data-theme=light]_&]:text-gold-ink">
        —
      </span>{" "}
      VISUAL WORLDS
    </LocaleLink>
  );
}

/** Header logo: round portrait icon and wordmark ("CHEFO" only on phones), one link home. */
export function BrandLockup({ onClick }: { onClick?: () => void }) {
  const { t } = useT();
  return (
    <LocaleLink
      to="/"
      onClick={onClick}
      aria-label={t.nav.home}
      className="interaction-link flex min-h-11 items-center gap-3 rounded-sm"
    >
      <img
        src="/brand/chefo-icon.svg"
        alt=""
        width={44}
        height={44}
        className="size-9 shrink-0 rounded-full ring-1 ring-gold/40 md:size-11"
      />
      <span className="whitespace-nowrap font-serif text-xl font-medium uppercase tracking-[0.14em] md:text-[1.4375rem]">
        CHEFO<span className="hidden md:inline"> — Visual Worlds</span>
      </span>
    </LocaleLink>
  );
}

const isHomePath = (pathname: string) => (pathname.replace(/^\/en(?=\/|$)/, "") || "/") === "/";

/**
 * On Home the header floats transparently over the hero until a sentinel at the top of the
 * hero leaves the viewport. The server and the first client render agree on the top state.
 */
function useTransparentOverHero() {
  const pathname = useRouterState({
    select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname,
  });
  const home = isHomePath(pathname);
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
      let next: HeaderTheme = "light";
      for (const el of document.elementsFromPoint(x, y)) {
        if (header.contains(el)) continue;
        const marked = el.closest<HTMLElement>("[data-header-theme]");
        if (marked) {
          next = marked.dataset["headerTheme"] === "dark" ? "dark" : "light";
          break;
        }
      }
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

/** Gold underline that unfolds from the centre on the active page (resting look unchanged). */
const navUnderline =
  "relative after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-center after:scale-x-0 after:bg-gold after:transition-transform after:duration-(--dur-base) after:ease-cinematic";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const { theme, animate } = useHeaderTheme(ref);
  const overHero = useTransparentOverHero();
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
      className={cn(
        "sticky top-0 z-40 border-b",
        animate || isHomePath(pathname)
          ? "transition-colors duration-(--dur-base) motion-reduce:transition-none"
          : "transition-none",
        transparent
          ? "border-navy-foreground/12 bg-transparent text-navy-foreground"
          : dark
            ? "border-navy-border bg-navy text-navy-foreground"
            : "border-border bg-background text-foreground",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <BrandLockup />
        <nav aria-label={t.nav.main} className="hidden lg:flex lg:items-center lg:gap-10">
          <ul className="flex gap-10">
            {NAV.map((n) => (
              <li key={n.to}>
                <LocaleLink
                  to={n.to}
                  className={cn(
                    "interaction-link eyebrow border-b border-transparent pb-1 transition-colors",
                    navUnderline,
                    dark ? "hover:text-gold" : "hover:text-terracotta-ink",
                  )}
                  activeClassName={cn("after:scale-x-100", dark && "text-gold")}
                >
                  {t.nav[n.key]}
                </LocaleLink>
              </li>
            ))}
          </ul>
          <LanguageSwitcher label={t.nav.language} />
        </nav>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          {/* The ::after enlarges the touch target to 44px without moving the icon. */}
          <Dialog.Trigger
            className="interaction-icon relative rounded-full p-2 after:absolute after:-inset-1 lg:hidden"
            aria-label={open ? t.nav.close : t.nav.open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Dialog.Trigger>
          <Dialog.Portal>
            {/* Radix locks page scroll through the overlay. */}
            <Dialog.Overlay className="fixed inset-0 z-50 bg-navy duration-(--dur-base) ease-cinematic data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 lg:hidden" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-navy text-navy-foreground outline-none duration-(--dur-base) ease-cinematic data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 lg:hidden"
            >
              <Dialog.Title className="sr-only">{t.nav.mobile}</Dialog.Title>
              {/* Dark header state inside the menu overlay (white wordmark dash). */}
              <div
                data-theme="dark"
                className="flex h-16 shrink-0 items-center justify-between border-b border-navy-border px-5 md:px-8"
              >
                <BrandLockup onClick={() => setOpen(false)} />
                <Dialog.Close
                  className="interaction-icon relative rounded-full border border-transparent p-2 after:absolute after:-inset-1"
                  aria-label={t.nav.close}
                >
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <nav
                aria-label={t.nav.mobile}
                className="seam-top flex flex-1 flex-col justify-between px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 md:px-8"
              >
                <ul className="flex flex-col">
                  {NAV.map((n, i) => (
                    <li
                      key={n.to}
                      className="border-b border-navy-border duration-500 ease-cinematic fill-mode-both motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2"
                      style={{ animationDelay: `${80 + i * 70}ms` }}
                    >
                      <LocaleLink
                        to={n.to}
                        onClick={() => setOpen(false)}
                        className="interaction-link flex items-center justify-between gap-4 py-5 font-serif text-4xl transition-colors"
                        activeClassName="text-gold"
                      >
                        {t.nav[n.key]}
                        <ArrowRight aria-hidden="true" className="size-5 text-gold" />
                      </LocaleLink>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex items-center justify-between border-t border-navy-border pt-6">
                  <span className="eyebrow text-navy-muted">{t.nav.language}</span>
                  <LanguageSwitcher
                    label={t.nav.language}
                    onSwitch={() => setOpen(false)}
                    className="text-sm"
                  />
                </div>
              </nav>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const instagram = siteConfig.instagramUrl.trim();
  const email = siteConfig.contactEmail.trim();
  const { t } = useT();
  return (
    <footer data-header-theme="dark" className="seam-top bg-navy text-navy-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <Wordmark />
          <p className="mt-3 font-serif text-xl italic text-navy-muted">{t.footer.tagline}</p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          {(instagram || email) && (
            <ul className="flex gap-6 eyebrow">
              {instagram && (
                <li>
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="interaction-link"
                  >
                    Instagram
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="interaction-link">
                    {t.footer.email}
                  </a>
                </li>
              )}
            </ul>
          )}
          <p className="text-xs text-navy-muted">
            © {new Date().getFullYear()} Chefo. {t.footer.rights}
          </p>
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
      <p className="eyebrow text-eyebrow">{eyebrow}</p>
      <h1 className={cn("mt-3", size === "page" ? "title-page" : "title-detail")}>{title}</h1>
      {intro && <p className="lead mt-5 max-w-xl text-muted-foreground">{intro}</p>}
    </header>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="max-w-2xl" {...reveal()}>
      {eyebrow && <p className="eyebrow text-eyebrow">{eyebrow}</p>}
      <h2 className="title-section mt-3">{title}</h2>
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
        "interaction-control min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors duration-(--dur-fast) ease-cinematic",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-gold",
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

/** Copy action with a short-lived confirmed state for the button (toast still announces it). */
export function useCopyPrompt(locale: Locale) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);
  const copy = async (prompt: string | undefined) => {
    if ((await copyPromptWithToast(prompt, locale)) === "ok") setCopied(true);
  };
  return [copied, copy] as const;
}

/** AI overview card (expects a localized work) (dark sections). */
export function AiCard({
  work,
  className,
  revealIndex,
  frame,
  objectPosition,
}: {
  work: AiWork;
  className?: string;
  /** Position among siblings for the scroll reveal stagger. */
  revealIndex?: number;
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
      className={cn("group min-w-0", className)}
      {...(revealIndex !== undefined ? reveal(revealIndex) : {})}
    >
      <LocaleLink to="/ai-worlds/$slug" slug={work.slug} className="block">
        <div
          className={cn(
            "relative aspect-[4/5] overflow-hidden rounded-md",
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
            className={cardImage}
            style={objectPosition ? { objectPosition } : undefined}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-gold/0 transition-shadow duration-(--dur-base) ease-cinematic group-hover:ring-gold/40 group-focus-within:ring-gold/60"
          />
          <span className="eyebrow absolute left-3 top-3 rounded-sm bg-navy/80 px-2 py-1 text-gold">
            {t.common.aiBadge}
          </span>
        </div>
        <h3 className="title-card mt-3 font-serif transition-colors group-hover:text-interaction-gold">
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

/** Anything the viewer can show; a Photo fits as-is. */
export interface LightboxItem {
  slug: string;
  image: string;
  alt: string;
  title: string;
  width?: number | undefined;
  height?: number | undefined;
  caption?: string | undefined;
  location?: string | undefined;
}

export function Lightbox({
  items,
  index,
  onIndex,
  returnFocusTo,
  variant = "default",
}: {
  items: LightboxItem[];
  index: number | null;
  onIndex: (i: number | null) => void;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  variant?: "default" | "artwork";
}) {
  const open = index !== null && items[index] !== undefined;
  const item = open ? items[index!] : null;
  const artwork = variant === "artwork";
  const portrait = Boolean(item?.width && item?.height && item.width < item.height);
  const { t } = useT();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const go = (d: number) => {
    if (index === null) return;
    setZoomed(false);
    onIndex((index + d + items.length) % items.length);
  };

  useEffect(() => {
    setZoomed(false);
  }, [index, open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onIndex(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/95 duration-(--dur-base) ease-cinematic data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          data-lightbox-variant={variant}
          data-theme="dark"
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center text-navy-foreground outline-none duration-(--dur-base) ease-cinematic data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            artwork
              ? zoomed
                ? "overflow-auto p-2 sm:p-3"
                : "gap-2 overflow-hidden p-2 sm:p-3"
              : "p-4 md:p-10",
          )}
          onOpenAutoFocus={() => {
            returnFocus.current =
              returnFocusTo?.current ??
              (document.activeElement instanceof HTMLElement ? document.activeElement : null);
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
          onTouchStart={(event) => {
            touchStart.current = {
              x: event.touches[0]!.clientX,
              y: event.touches[0]!.clientY,
            };
          }}
          onTouchEnd={(event) => {
            if (!touchStart.current) return;
            const dx = event.changedTouches[0]!.clientX - touchStart.current.x;
            const dy = event.changedTouches[0]!.clientY - touchStart.current.y;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
            touchStart.current = null;
          }}
        >
          {item && (
            <>
              <Dialog.Title className="sr-only">{item.title}</Dialog.Title>
              <Dialog.Description className="sr-only">{item.alt}</Dialog.Description>
              {artwork ? (
                <div
                  data-lightbox-stage
                  className={cn(
                    "flex items-center justify-center",
                    zoomed
                      ? "h-max min-h-full w-max min-w-full flex-none"
                      : "min-h-0 w-full flex-1",
                  )}
                >
                  <img
                    key={item.slug}
                    data-lightbox-image
                    src={item.image}
                    alt={item.alt}
                    width={item.width}
                    height={item.height}
                    className={cn(
                      "h-auto w-auto shrink-0 rounded-md object-contain duration-(--dur-base) ease-cinematic motion-safe:animate-in motion-safe:fade-in-0",
                      zoomed ? "max-h-none max-w-none cursor-zoom-out" : "max-h-full max-w-full",
                    )}
                  />
                </div>
              ) : (
                <img
                  key={item.slug}
                  data-lightbox-image
                  src={item.image}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  className="max-h-[78vh] max-w-full rounded-md object-contain duration-(--dur-base) ease-cinematic motion-safe:animate-in motion-safe:fade-in-0"
                />
              )}
              <div
                data-lightbox-caption
                className={cn(
                  "text-center",
                  artwork
                    ? cn(
                        zoomed && "sr-only",
                        portrait
                          ? "md:absolute md:bottom-5 md:right-5 md:w-64 md:rounded-sm md:bg-navy/85 md:p-3 md:text-left md:shadow-soft md:backdrop-blur-sm"
                          : "shrink-0",
                      )
                    : "mt-4",
                )}
              >
                <p className="font-serif text-2xl">{item.title}</p>
                {item.caption && (
                  <p className="mt-1 text-sm text-navy-foreground/80">{item.caption}</p>
                )}
                <p className="eyebrow mt-1 text-gold">
                  {item.location ? `${item.location} · ` : ""}
                  {index! + 1} / {items.length}
                </p>
              </div>
              {artwork && (
                <button
                  type="button"
                  aria-label={zoomed ? t.lightbox.zoomOut : t.lightbox.zoomIn}
                  aria-pressed={zoomed}
                  onClick={() => setZoomed((value) => !value)}
                  className="interaction-icon fixed left-3 top-3 z-10 rounded-full border border-navy-border bg-navy/85 p-2.5 sm:left-4 sm:top-4"
                >
                  {zoomed ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
                </button>
              )}
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={t.lightbox.prev}
                    className={cn(
                      "interaction-icon top-1/2 -translate-y-1/2 rounded-full border border-navy-border bg-navy/80 p-3",
                      artwork ? "fixed left-2 md:left-6" : "absolute left-2 md:left-6",
                    )}
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={t.lightbox.next}
                    className={cn(
                      "interaction-icon top-1/2 -translate-y-1/2 rounded-full border border-navy-border bg-navy/80 p-3",
                      artwork ? "fixed right-2 md:right-6" : "absolute right-2 md:right-6",
                    )}
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
              <Dialog.Close
                aria-label={t.lightbox.close}
                className={cn(
                  "interaction-icon right-4 top-4 z-10 rounded-full border border-navy-border bg-navy/85 p-2",
                  artwork ? "fixed" : "absolute",
                )}
              >
                <X className="size-5" />
              </Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const btnMotion = "transition-colors duration-(--interaction-duration) ease-cinematic";
export const btnPrimary = `interaction-primary inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold tracking-wide ${btnMotion}`;
export const btnOutline = `interaction-secondary inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold tracking-wide ${btnMotion}`;
export const btnGold = `interaction-primary inline-flex items-center gap-2 rounded-sm px-6 py-3 text-sm font-semibold tracking-wide ${btnMotion}`;
