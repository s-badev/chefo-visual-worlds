import { getDestination } from "@/content/ai-destinations";
import { getAiWork } from "@/content/ai-works";

export type HeaderTheme = "light" | "dark";

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

  const artwork = path.match(/^\/ai-worlds\/([^/]+)\/?$/);
  if (artwork) {
    try {
      const slug = decodeURIComponent(artwork[1]!);
      return getAiWork(slug) || getDestination(slug) ? "dark" : "light";
    } catch {
      return "light";
    }
  }
  return "light";
}
