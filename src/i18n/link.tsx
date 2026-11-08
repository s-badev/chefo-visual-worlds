import { Fragment } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import type {
  AriaAttributes,
  FocusEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from "react";
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
  onClick?: MouseEventHandler<HTMLAnchorElement> | undefined;
  onPointerEnter?: PointerEventHandler<HTMLAnchorElement> | undefined;
  onPointerLeave?: PointerEventHandler<HTMLAnchorElement> | undefined;
  onFocus?: FocusEventHandler<HTMLAnchorElement> | undefined;
  onBlur?: FocusEventHandler<HTMLAnchorElement> | undefined;
  search?: Record<string, string | undefined>;
  /** Element id to scroll to, without "#". */
  hash?: string | undefined;
  "aria-label"?: string;
  "aria-current"?: AriaAttributes["aria-current"] | undefined;
  "data-ai-work-nav"?: "prev" | "next";
  /** Classes applied when the link matches the current page. */
  activeClassName?: string;
} & ({ to: StaticPath; slug?: never } | { to: SlugPath; slug: string });

/** Link written with Bulgarian paths; automatically points to the /en version on English pages. */
export function LocaleLink({ to, slug, hash, activeClassName, ...rest }: Props) {
  const locale = useLocale();
  const bgPath = slug ? to.replace("$slug", slug) : to;
  const href = localizePath(bgPath, locale);
  // Route files exist for every localized path; the href is resolved against them.
  return (
    <Link
      {...rest}
      {...(hash ? { hash } : {})}
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
  // As in the mock: "BG | EN", a thin vertical rule between them, the current language in gold.
  return (
    <div role="group" aria-label={label} className={cn("lang-switch", className)}>
      {opts.map((l, i) => {
        const href = switchLocaleHref(pathname, searchStr, l);
        const active = l === locale;
        return (
          <Fragment key={l}>
            {i > 0 && <span aria-hidden="true" className="lang-switch-rule" />}
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
              className="lang-switch-link"
            >
              {l.toUpperCase()}
            </a>
          </Fragment>
        );
      })}
    </div>
  );
}
