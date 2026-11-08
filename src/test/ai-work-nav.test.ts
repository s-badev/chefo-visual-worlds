import { describe, expect, it } from "vitest";
import {
  adjacentWork,
  adjacentWorkIn,
  getResolvedAiCollections,
  getWorkCollectionPosition,
  type CollectionSequence,
} from "@/lib/ai-work-nav";
import type { AiCollection } from "@/content/ai-collections";

const makeCollection = (slug: string, order: number): AiCollection => ({
  slug,
  order,
  title: { bg: slug, en: slug },
  shortTitle: { bg: slug, en: slug },
  intro: { bg: slug, en: slug },
  coverWorkSlug: null,
  works: [],
});

describe("AI collection-aware artwork navigation", () => {
  const collections: CollectionSequence[] = [
    { collection: makeCollection("one", 1), slugs: ["a", "b", "c"] },
    { collection: makeCollection("single", 2), slugs: ["d"] },
    { collection: makeCollection("three", 3), slugs: ["e", "f"] },
  ];

  it("moves within a collection", () => {
    expect(adjacentWorkIn(collections, "b", 1)).toMatchObject({
      slug: "c",
      crossesCollection: false,
      position: 3,
      total: 3,
    });
    expect(adjacentWorkIn(collections, "b", -1)).toMatchObject({
      slug: "a",
      crossesCollection: false,
      position: 1,
      total: 3,
    });
  });

  it("crosses directly between the last and first work of adjacent collections", () => {
    expect(adjacentWorkIn(collections, "c", 1)).toMatchObject({
      slug: "d",
      crossesCollection: true,
      position: 1,
      total: 1,
    });
    expect(adjacentWorkIn(collections, "d", -1)).toMatchObject({
      slug: "c",
      crossesCollection: true,
      position: 3,
      total: 3,
    });
  });

  it("handles a single-work collection in both directions", () => {
    expect(adjacentWorkIn(collections, "d", 1)?.slug).toBe("e");
    expect(adjacentWorkIn(collections, "d", -1)?.slug).toBe("c");
  });

  it("wraps from the last collection to the first and back", () => {
    expect(adjacentWorkIn(collections, "f", 1)).toMatchObject({
      slug: "a",
      crossesCollection: true,
      position: 1,
      total: 3,
    });
    expect(adjacentWorkIn(collections, "a", -1)).toMatchObject({
      slug: "f",
      crossesCollection: true,
      position: 2,
      total: 2,
    });
  });

  it("returns null for an unknown slug", () => {
    expect(adjacentWorkIn(collections, "unknown", 1)).toBeNull();
    expect(getWorkCollectionPosition("unknown", collections)).toBeNull();
  });

  it("maps every real artwork exactly once, including published destinations", () => {
    const resolved = getResolvedAiCollections();
    const allSlugs = resolved.flatMap(({ slugs }) => slugs);
    expect(resolved).toHaveLength(4);
    expect(allSlugs).toHaveLength(64);
    expect(new Set(allSlugs).size).toBe(64);
    for (const slug of allSlugs) {
      expect(getWorkCollectionPosition(slug)).not.toBeNull();
      expect(adjacentWork(slug, 1)).not.toBeNull();
      expect(adjacentWork(slug, -1)).not.toBeNull();
    }
  });
});
