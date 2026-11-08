import {
  getAiCollections,
  getCollectionWorkSlugs,
  type AiCollection,
} from "@/content/ai-collections";

export type CollectionSequence = {
  collection: AiCollection;
  slugs: string[];
};

export type WorkCollectionPosition = CollectionSequence & {
  index: number;
  position: number;
  total: number;
};

export type AdjacentWork = {
  slug: string;
  crossesCollection: boolean;
  fromCollection: AiCollection;
  toCollection: AiCollection;
  position: number;
  total: number;
};

export const getResolvedAiCollections = (): CollectionSequence[] =>
  getAiCollections()
    .map((collection) => ({ collection, slugs: getCollectionWorkSlugs(collection) }))
    .filter(({ slugs }) => slugs.length > 0);

/** Returns one work's deterministic parent and its one-based position inside that collection. */
export const getWorkCollectionPosition = (
  slug: string,
  collections: CollectionSequence[] = getResolvedAiCollections(),
): WorkCollectionPosition | null => {
  for (const entry of collections) {
    const index = entry.slugs.indexOf(slug);
    if (index !== -1) {
      return {
        ...entry,
        index,
        position: index + 1,
        total: entry.slugs.length,
      };
    }
  }
  return null;
};

/**
 * Collection-aware cyclic artwork navigation. At a collection boundary the destination is the
 * adjacent collection's first (next) or last (previous) work.
 */
export const adjacentWorkIn = (
  collections: CollectionSequence[],
  slug: string,
  direction: 1 | -1,
): AdjacentWork | null => {
  const current = getWorkCollectionPosition(slug, collections);
  if (!current || collections.length === 0) return null;

  const targetIndex = current.index + direction;
  if (targetIndex >= 0 && targetIndex < current.total) {
    return {
      slug: current.slugs[targetIndex]!,
      crossesCollection: false,
      fromCollection: current.collection,
      toCollection: current.collection,
      position: targetIndex + 1,
      total: current.total,
    };
  }

  const collectionIndex = collections.findIndex(
    ({ collection }) => collection.slug === current.collection.slug,
  );
  const nextCollectionIndex =
    (collectionIndex + direction + collections.length) % collections.length;
  const target = collections[nextCollectionIndex]!;
  const nextWorkIndex = direction === 1 ? 0 : target.slugs.length - 1;

  return {
    slug: target.slugs[nextWorkIndex]!,
    crossesCollection: target.collection.slug !== current.collection.slug,
    fromCollection: current.collection,
    toCollection: target.collection,
    position: nextWorkIndex + 1,
    total: target.slugs.length,
  };
};

export const adjacentWork = (slug: string, direction: 1 | -1): AdjacentWork | null =>
  adjacentWorkIn(getResolvedAiCollections(), slug, direction);
