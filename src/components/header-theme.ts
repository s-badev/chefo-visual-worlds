export type HeaderTheme = "light" | "dark";

/** The first marked surface under the header decides its tone; an unmarked page reads as cream. */
export function resolveHeaderTheme(stack: Iterable<Element>, header: Element): HeaderTheme {
  for (const el of stack) {
    if (header.contains(el)) continue;
    const marked = el.closest<HTMLElement>("[data-header-theme]");
    if (marked) return marked.dataset["headerTheme"] === "dark" ? "dark" : "light";
  }
  return "light";
}

/** Past this scroll offset the header turns translucent with a light blur. */
export const HEADER_SCROLLED_AFTER = 24;
export const isHeaderScrolled = (scrollY: number) => scrollY > HEADER_SCROLLED_AFTER;

/** Match the first rendered surface, including the existing not-found views. */
export function getInitialHeaderTheme(pathname: string): HeaderTheme {
  const path = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  if (path === "/") return "dark";
  if (path === "/photography" || path === "/about") return "light";
  if (path.startsWith("/photography/")) return "light";
  if (path === "/ai-worlds") return "dark";

  const collection = path.match(/^\/ai-worlds\/collections\/([^/]+)\/?$/);
  // The collection not-found view also uses a dark Surface.
  if (collection) return "dark";

  // An artwork page is a dark page (its header is navy at the top, like the collections').
  const artwork = path.match(/^\/ai-worlds\/([^/]+)\/?$/);
  if (artwork) return "dark";
  return "light";
}
