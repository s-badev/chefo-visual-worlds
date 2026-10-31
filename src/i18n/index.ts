// Single translation layer: locale detection, UI messages, localized paths and head tags.
import { useRouterState } from "@tanstack/react-router";
import { messages, type Messages } from "./messages";

export type Locale = "bg" | "en";
export const LOCALES: Locale[] = ["bg", "en"];

/** English lives under /en; everything else is Bulgarian (default). */
export const localeFromPath = (pathname: string): Locale =>
  pathname === "/en" || pathname.startsWith("/en/") ? "en" : "bg";

/** Converts a Bulgarian path (e.g. "/photography/x") to the given locale. */
export const localizePath = (bgPath: string, locale: Locale) =>
  locale === "en" ? (bgPath === "/" ? "/en" : `/en${bgPath}`) : bgPath;

/** Strips the /en prefix, giving the Bulgarian equivalent of any path. */
export const toBgPath = (pathname: string) => {
  if (localeFromPath(pathname) === "bg") return pathname;
  const rest = pathname.slice(3);
  return rest === "" || rest === "/" ? "/" : rest;
};

/** Equivalent page in the other language (same item, same filters). */
export const switchLocaleHref = (pathname: string, searchStr: string, target: Locale) =>
  localizePath(toBgPath(pathname), target) + searchStr;

export const getMessages = (locale: Locale): Messages => messages[locale];

export function useLocale(): Locale {
  return useRouterState({ select: (s) => localeFromPath(s.location.pathname) });
}

export function useT() {
  const locale = useLocale();
  return { locale, t: messages[locale] };
}

/** Shared 1200x630 social card. Root-relative like the canonical below: no site origin is set. */
const OG_IMAGE = "/og-image.png";

/** Localized title/description, social card, canonical + hreflang alternates for a page. */
export function pageHead(locale: Locale, bgPath: string, title: string, description: string, opts?: { type?: string }) {
  const self = localizePath(bgPath, locale);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: opts?.type ?? "website" },
      { property: "og:url", content: self },
      { property: "og:locale", content: locale === "en" ? "en_US" : "bg_BG" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: messages[locale].common.ogImageAlt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: self },
      { rel: "alternate", hrefLang: "bg", href: localizePath(bgPath, "bg") },
      { rel: "alternate", hrefLang: "en", href: localizePath(bgPath, "en") },
      { rel: "alternate", hrefLang: "x-default", href: localizePath(bgPath, "bg") },
    ],
  };
}

export const notFoundHead = (locale: Locale) => ({
  meta: [{ title: messages[locale].notFound.title }, { name: "robots", content: "noindex" }],
});

export const formatDate = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "bg-BG", { day: "numeric", month: "long", year: "numeric" });
