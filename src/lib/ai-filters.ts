// AI Worlds "All works" filters. The visible filter is one row of collections (see AiWorksView);
// the five older filter groups stay readable in the URL so old links keep working: they open the
// works view and, when every work they match belongs to one collection, select that collection.
import { aiWorks, filterAiWorks } from "@/content/ai-works";
import { getCollectionForWork } from "@/content/ai-collections";

export const AI_FILTER_KEYS = ["category", "role", "era", "setting", "tool"] as const;
export type AiFilterKey = (typeof AI_FILTER_KEYS)[number];
export type AiFilterValues = Partial<Record<AiFilterKey, string | undefined>>;

export const countActiveFilters = (values: AiFilterValues) =>
  AI_FILTER_KEYS.filter((key) => values[key]).length;

/** The collection an old filter link points at, when all its matches share one collection. */
export function legacyFilterCollection(values: AiFilterValues): string | undefined {
  if (!countActiveFilters(values)) return undefined;
  const slugs = new Set(
    filterAiWorks(aiWorks, values).map((work) => getCollectionForWork(work.slug)?.slug),
  );
  const [only] = [...slugs];
  return slugs.size === 1 && only ? only : undefined;
}
