import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DestinationView } from "@/components/ai-atlas";
import { artworkAnchor } from "@/components/ai-exhibition";
import { aiCollections, getAiCollection, getCollectionWorks } from "@/content/ai-collections";
import { getDestination, getDestinationWork, getDestinations } from "@/content/ai-destinations";
import { getAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { AiCollectionView, AiDetailView } from "@/views/ai-worlds";

// Renders a view inside a real router at `path`, so links, locale and hashes are the real ones.
const renderAt = async (path: string, view: () => ReactNode) => {
  const root = createRootRoute();
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: "$", component: view }),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
};

const prefix = { bg: "", en: "/en" } as const;

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

describe("returning from an artwork to its collection", () => {
  it.each(["bg", "en"] as const)(
    "gives every %s presentation a unique anchor derived from its slug",
    async (locale) => {
      for (const collection of aiCollections) {
        const works = getCollectionWorks(collection, locale);
        const { container, unmount } = await renderAt(
          `${prefix[locale]}/ai-worlds/collections/${collection.slug}`,
          () => <AiCollectionView collection={collection} />,
        );
        // Stage 6b: the anchors sit on the tiles of the compact grid.
        const ids = [...container.querySelectorAll("ol.ai-thumb-grid > li")].map((li) => li.id);
        expect(ids).toEqual(works.map((w) => artworkAnchor(w.slug)));
        expect(new Set(ids).size).toBe(works.length);
        for (const work of works) {
          const presentation = container.querySelector(`#${artworkAnchor(work.slug)}`)!;
          expect(
            within(presentation as HTMLElement).getByRole("link", { name: work.title }),
          ).toHaveAttribute("href", `${prefix[locale]}/ai-worlds/${work.slug}`);
        }
        unmount();
      }
    },
    20_000,
  );

  it.each(["bg", "en"] as const)(
    "points each %s detail page back to the artwork it shows",
    async (locale) => {
      for (const collection of aiCollections) {
        for (const work of getCollectionWorks(collection, locale)) {
          const { unmount } = await renderAt(`${prefix[locale]}/ai-worlds/${work.slug}`, () => (
            <AiDetailView work={getAiWork(work.slug)!} />
          ));
          expect(
            await screen.findByRole("link", { name: messages[locale].ai.backToAiWorlds }),
          ).toHaveAttribute(
            "href",
            `${prefix[locale]}/ai-worlds/collections/${collection.slug}#${artworkAnchor(work.slug)}`,
          );
          unmount();
        }
      }
    },
    20_000, // 64 detail pages in a real router
  );

  it("keeps the plain collection link for a destination that is not hung yet", async () => {
    for (const destination of getDestinations().filter((d) => !getDestinationWork(d, "bg"))) {
      const { unmount } = await renderAt(`/ai-worlds/${destination.slug}`, () => (
        <DestinationView destination={destination} />
      ));
      expect(
        await screen.findByRole("link", { name: messages.bg.ai.backToCollection }),
      ).toHaveAttribute("href", "/ai-worlds/collections/chefo-around-the-world");
      unmount();
    }
  });

  const historical = getAiCollection("historical-eras-rulers")!;
  const tenth = getCollectionWorks(historical, "bg")[9]!;

  it("moves focus to the linked artwork's main action once it is in view", async () => {
    window.history.replaceState(null, "", `#${artworkAnchor(tenth.slug)}`);
    await renderAt(`/ai-worlds/collections/${historical.slug}`, () => (
      <AiCollectionView collection={historical} />
    ));
    // The tile caption is the work's main link (stage 6b).
    const action = within(document.getElementById(artworkAnchor(tenth.slug))!).getByRole("link", {
      name: tenth.title,
    });
    await waitFor(() => expect(action).toHaveFocus());
  });

  it("does not move focus when a restored position shows other artworks", async () => {
    window.history.replaceState(null, "", `#${artworkAnchor(tenth.slug)}`);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      top: 5000,
    } as DOMRect);
    await renderAt(`/ai-worlds/collections/${historical.slug}`, () => (
      <AiCollectionView collection={historical} />
    ));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.activeElement).toBe(document.body);
  });

  it.each(["", "#unknown-artwork"])(
    "leaves focus alone on a collection opened with hash %j",
    async (hash) => {
      window.history.replaceState(null, "", `/${hash}`);
      await renderAt(`/ai-worlds/collections/${historical.slug}`, () => (
        <AiCollectionView collection={historical} />
      ));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.activeElement).toBe(document.body);
    },
  );
});
