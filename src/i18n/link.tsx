import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { localizePath, switchLocaleHref, useLocale, type Locale } from "./index";

type StaticPath = "/" | "/photography" | "/ai-worlds" | "/about";
type SlugPath =
  | "/photography/$slug"
  | "/photography/albums/$slug"
  | "/ai-worlds/$slug"
  | "/ai-worlds/collections/$slug";

type Props = {
  className?: string;
  children?: ReactNode;
  onClick?: (() => void) | undefined;
  search?: Record<string, string | undefined>;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-hidden"?: "true";
  tabIndex?: number;
  /** Classes applied when the link matches the current page. */
  activeClassName?: string;
} & ({ to: StaticPath; slug?: never } | { to: SlugPath; slug: string });

/** Link written with Bulgarian paths; automatically points to the /en version on English pages. */
export function LocaleLink({ to, slug, activeClassName, ...rest }: Props) {
  const locale = useLocale();
  const bgPath = slug ? to.replace("$slug", slug) : to;
  const href = localizePath(bgPath, locale);
  // Route files exist for every localized path; the href is resolved against them.
  return (
    <Link
      {...rest}
      to={href as "/"}
      activeOptions={{ exact: to === "/" }}
      activeProps={{ className: activeClassName ?? "" }}
    />
  );
}

/** Compact BG / EN switch; keeps the same page, item and filters. */
export function LanguageSwitcher({
  label,
  className,
  onSwitch,
}: {
  label: string;
  className?: string;
  onSwitch?: () => void;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { pathname, searchStr } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, searchStr: s.location.searchStr }),
  });
  const opts: Locale[] = ["bg", "en"];
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center gap-1 text-xs font-semibold tracking-[0.14em]", className)}
    >
      {opts.map((l, i) => {
        const href = switchLocaleHref(pathname, searchStr, l);
        const active = l === locale;
        return (
          <span key={l} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden className="opacity-40">
                /
              </span>
            )}
            <a
              href={href}
              hrefLang={l}
              lang={l}
              aria-current={active ? "true" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onSwitch?.();
                if (!active) router.navigate({ href });
              }}
              className={cn(
                "rounded-sm px-1.5 py-1 transition-colors",
                active
                  ? // On the cream header, gold text needs the deeper ink for contrast.
                    "text-gold underline decoration-gold underline-offset-4 [[data-theme=light]_&]:text-gold-ink [[data-theme=light]_&]:decoration-gold-ink"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              {l.toUpperCase()}
            </a>
          </span>
        );
      })}
    </div>
  );
}
