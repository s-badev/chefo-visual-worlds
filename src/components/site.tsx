import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { photoCategoryLabel, type Photo } from "@/content/photos";
import { aiCategoryLabel, toolLabel, type AiWork } from "@/content/ai-works";
import { getMessages, useT, type Locale } from "@/i18n";
import { LanguageSwitcher, LocaleLink } from "@/i18n/link";
import { siteConfig } from "@/content/site-config";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/photography", key: "photography" },
  { to: "/ai-worlds", key: "ai" },
  { to: "/about", key: "about" },
] as const;

export function Wordmark({ className }: { className?: string }) {
  return (
    <LocaleLink to="/" className={cn("font-serif text-lg tracking-[0.18em] whitespace-nowrap", className)}>
      CHEFO <span className="text-gold">—</span> VISUAL WORLDS
    </LocaleLink>
  );
}

/** Reads the data-header-theme of whatever sits just under the header's bottom edge. */
function useHeaderTheme(ref: React.RefObject<HTMLElement | null>) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let raf = 0;
    const probe = () => {
      raf = 0;
      const header = ref.current;
      if (!header) return;
      const y = header.getBoundingClientRect().bottom + 4; // just below header, uses real height
      const x = window.innerWidth / 2;
      let next: "light" | "dark" = "light";
      for (const el of document.elementsFromPoint(x, y)) {
        if (header.contains(el)) continue;
        const marked = el.closest<HTMLElement>("[data-header-theme]");
        if (marked) { next = marked.dataset["headerTheme"] === "dark" ? "dark" : "light"; break; }
      }
      setTheme((cur) => (cur === next ? cur : next));
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(probe); };
    probe();
    const t1 = setTimeout(probe, 50);
    const t2 = setTimeout(probe, 300); // after scroll restoration
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname, ref]);
  return theme;
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const theme = useHeaderTheme(ref);
  const { t } = useT();
  const dark = theme === "dark" || open;
  return (
    <header
      ref={ref}
      data-theme={dark ? "dark" : "light"}
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300 motion-reduce:transition-none",
        dark
          ? "border-navy-border bg-navy text-navy-foreground supports-[backdrop-filter]:bg-navy/80 supports-[backdrop-filter]:backdrop-blur-md"
          : "bg-background/95 text-foreground supports-[backdrop-filter]:backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Wordmark className="text-base md:text-lg" />
        <nav aria-label={t.nav.main} className="hidden lg:flex lg:items-center lg:gap-10">
          <ul className="flex gap-10">
            {NAV.map((n) => (
              <li key={n.to}>
                <LocaleLink
                  to={n.to}
                  className={cn("eyebrow border-b border-transparent pb-1 transition-colors", dark ? "hover:text-gold" : "hover:text-terracotta")}
                  activeClassName={cn("!border-gold", dark && "text-gold")}
                >
                  {t.nav[n.key]}
                </LocaleLink>
              </li>
            ))}
          </ul>
          <LanguageSwitcher label={t.nav.language} />
        </nav>
        <button
          className="p-2 lg:hidden"
          aria-label={open ? t.nav.close : t.nav.open}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav aria-label={t.nav.mobile} className="border-t border-navy-border lg:hidden">
          <ul className="flex flex-col px-5 py-4">
            {NAV.map((n) => (
              <li key={n.to}>
                <LocaleLink to={n.to} onClick={() => setOpen(false)} className="eyebrow block py-3" activeClassName="text-gold">
                  {t.nav[n.key]}
                </LocaleLink>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-navy-border px-5 py-4">
            <span className="eyebrow text-navy-muted">{t.nav.language}</span>
            <LanguageSwitcher label={t.nav.language} onSwitch={() => setOpen(false)} className="text-sm" />
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const instagram = siteConfig.instagramUrl.trim();
  const email = siteConfig.contactEmail.trim();
  const { t } = useT();
  return (
    <footer data-header-theme="dark" className="bg-navy text-navy-foreground">
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
                  <a href={instagram} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
                    Instagram
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="hover:text-gold">
                    {t.footer.email}
                  </a>
                </li>
              )}
            </ul>
          )}
          <p className="text-xs text-navy-muted">© {new Date().getFullYear()} Chefo. {t.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}

export function SectionHeading({ eyebrow, title, text, dark }: { eyebrow?: string; title: string; text?: string; dark?: boolean }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className={cn("eyebrow", dark ? "text-gold" : "text-terracotta")}>{eyebrow}</p>}
      <h2 className="mt-3 text-4xl md:text-5xl">{title}</h2>
      {text && <p className={cn("mt-4 text-lg", dark ? "text-navy-muted" : "text-muted-foreground")}>{text}</p>}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:border-gold",
      )}
    >
      {children}
    </button>
  );
}

/** Labelled filter group: one scrollable row on mobile, wraps from sm up. */
export function ChipGroup({ label, children, dark }: { label: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="grid gap-2 sm:flex sm:items-center" role="group" aria-label={label}>
      <span className={cn("eyebrow shrink-0 sm:mr-2 sm:w-24", dark ? "text-navy-muted" : "text-muted-foreground")}>{label}</span>
      <div className="chip-row no-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible">
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ text, onClear, dark }: { text: string; onClear: () => void; dark?: boolean }) {
  const { t } = useT();
  return (
    <div className="mt-16 max-w-md">
      <p className={cn("font-serif text-2xl italic", dark ? "text-navy-muted" : "text-muted-foreground")}>{text}</p>
      <button type="button" onClick={onClear} className={cn("mt-6", dark ? btnGold : btnPrimary)}>{t.common.clearFilters}</button>
    </div>
  );
}

/** Expects a photo already localized with localizePhoto(). */
export function PhotoCard({ photo, ratio = "aspect-[4/5]", onOpen, themeLabel }: { photo: Photo; ratio?: string; onOpen?: () => void; themeLabel?: string }) {
  const { t, locale } = useT();
  const img = (
    <div className={cn("relative overflow-hidden rounded-md bg-muted shadow-soft", ratio)}>
      <img
        src={photo.image}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        style={photo.objectPosition ? { objectPosition: photo.objectPosition } : undefined}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
    </div>
  );
  const meta = (
    <div className="mt-3 space-y-1">
      <p className="eyebrow text-terracotta">{themeLabel ?? photoCategoryLabel(photo.category, locale)}</p>
      <p className="font-serif text-xl leading-tight">{photo.location}</p>
      <p className="text-sm text-muted-foreground">{photo.caption ?? photo.title}</p>
    </div>
  );
  if (onOpen) {
    return (
      <figure className="group">
        <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={t.common.openFullscreen(photo.title)}>
          {img}
        </button>
        <figcaption>
          <LocaleLink to="/photography/$slug" slug={photo.slug} className="block hover:text-terracotta">{meta}</LocaleLink>
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

export async function copyPromptWithToast(prompt: string | undefined, locale: Locale) {
  const m = getMessages(locale).common;
  const r = await copyText(prompt);
  if (r === "ok") toast.success(m.copied);
  else if (r === "error") toast.error(m.copyFailed);
}

/** AI overview card (expects a localized work) (dark sections). Copy button sits outside the link. */
export function AiCard({ work, className }: { work: AiWork; className?: string }) {
  const hasPrompt = Boolean(work.prompt?.trim());
  const { t, locale } = useT();
  return (
    <article className={cn("group min-w-0", className)}>
      <LocaleLink to="/ai-worlds/$slug" slug={work.slug} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-md">
          <img src={work.image} alt={work.alt} width={1024} height={1280} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <span className="eyebrow absolute left-3 top-3 rounded-sm bg-navy/80 px-2 py-1 text-gold">{t.common.aiBadge}</span>
        </div>
        <h3 className="mt-3 font-serif text-2xl leading-tight group-hover:text-gold">{work.title}</h3>
      </LocaleLink>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-navy-muted">{toolLabel(work.tool, locale)} · {aiCategoryLabel(work.category, locale)}</p>
        {hasPrompt && (
          <button
            type="button"
            onClick={() => copyPromptWithToast(work.prompt, locale)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-navy-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-gold hover:text-gold"
            aria-label={t.common.copyPromptFor(work.title)}
          >
            <Copy className="size-3.5" /> {t.common.copyPrompt}
          </button>
        )}
      </div>
    </article>
  );
}

export function Lightbox({ items, index, onIndex }: { items: Photo[]; index: number | null; onIndex: (i: number | null) => void }) {
  const open = index !== null && items[index] !== undefined;
  const item = open ? items[index!] : null;
  const { t } = useT();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const go = (d: number) => index !== null && onIndex((index + d + items.length) % items.length);

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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/95" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 text-navy-foreground outline-none md:p-10"
          onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus(); }
          }}
          onTouchStart={(event) => { touchStart.current = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY }; }}
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
              <img src={item.image} alt={item.alt} width={item.width} height={item.height} className="max-h-[78vh] max-w-full rounded-md object-contain" />
              <div className="mt-4 text-center">
                <p className="font-serif text-2xl">{item.title}</p>
                {item.caption && <p className="mt-1 text-sm text-navy-foreground/80">{item.caption}</p>}
                <p className="eyebrow mt-1 text-gold">{item.location} · {index! + 1} / {items.length}</p>
              </div>
              {items.length > 1 && <>
                <button type="button" onClick={() => go(-1)} aria-label={t.lightbox.prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-navy-border bg-navy/80 p-3 hover:border-gold md:left-6"><ChevronLeft className="size-5" /></button>
                <button type="button" onClick={() => go(1)} aria-label={t.lightbox.next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-navy-border bg-navy/80 p-3 hover:border-gold md:right-6"><ChevronRight className="size-5" /></button>
              </>}
              <Dialog.Close aria-label={t.lightbox.close} className="absolute right-4 top-4 rounded-full border border-navy-border p-2 hover:border-gold"><X className="size-5" /></Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const btnPrimary = "inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-semibold tracking-wide text-primary-foreground transition-colors hover:bg-terracotta";
export const btnOutline = "inline-flex items-center gap-2 rounded-sm border border-current px-6 py-3 text-sm font-semibold tracking-wide transition-colors hover:border-gold hover:text-gold";
export const btnGold = "inline-flex items-center gap-2 rounded-sm bg-gold px-6 py-3 text-sm font-semibold tracking-wide text-accent-foreground transition-colors hover:bg-navy-foreground";
/** Shared hero CTA so both collections get identical weight. */
export const btnHero = "inline-flex items-center gap-2 rounded-sm border border-gold bg-gold px-6 py-3 text-sm font-semibold tracking-wide text-accent-foreground shadow-soft transition-colors hover:bg-navy-foreground hover:border-navy-foreground";
