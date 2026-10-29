import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CollectionHalls } from "@/components/ai-exhibition";
import {
  aiCollections,
  collectionText,
  getCollectionCover,
  getCollectionWorks,
} from "@/content/ai-collections";
import { messages } from "@/i18n/messages";
import { AiCollectionView } from "@/views/ai-worlds";

// Renders a view inside a real router at `path`, so links and locale are the real ones.
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
const INTERACTIVE = "a[href], button, input, select, textarea, [tabindex]";

afterEach(cleanup);

describe("AI Worlds overview halls", () => {
  it.each(["bg", "en"] as const)(
    "enters each %s collection through one named link that leaves the photo outside",
    async (locale) => {
      const m = messages[locale].ai;
      const { container } = await renderAt(`${prefix[locale]}/ai-worlds`, () => (
        <CollectionHalls />
      ));
      const halls = [...container.querySelectorAll("article")];
      expect(halls).toHaveLength(aiCollections.length);
      halls.forEach((hall, index) => {
        const collection = aiCollections[index]!;
        const title = collectionText(collection.title, locale);
        // One stop per hall: the link is its only interactive element.
        expect(hall.querySelectorAll(INTERACTIVE)).toHaveLength(1);
        const link = within(hall).getByRole("link", { name: `${m.exploreCollection}: ${title}` });
        expect(link).toHaveAttribute(
          "href",
          `${prefix[locale]}/ai-worlds/collections/${collection.slug}`,
        );
        expect(link).toHaveTextContent(m.exploreCollection);
        expect(link.querySelector(`${INTERACTIVE}, img`)).toBeNull();
        // Title and photo stay readable content next to the link, not inside it.
        expect(within(hall).getByRole("heading", { level: 2, name: title })).not.toContainElement(
          link,
        );
        const cover = getCollectionCover(collection, locale);
        if (cover) {
          const photo = within(hall).getByAltText(cover.alt);
          expect(link).not.toContainElement(photo);
        }
      });
    },
  );
});

describe("AI collection presentations", () => {
  it.each(["bg", "en"] as const)(
    "keep a separate artwork link and full-screen button for every %s work",
    async (locale) => {
      const m = messages[locale].ai;
      for (const collection of aiCollections) {
        const works = getCollectionWorks(collection, locale);
        const { container, unmount } = await renderAt(
          `${prefix[locale]}/ai-worlds/collections/${collection.slug}`,
          () => <AiCollectionView collection={collection} />,
        );
        const presentations = [...container.querySelectorAll("ol.container-page > li > article")];
        expect(presentations).toHaveLength(works.length);
        presentations.forEach((presentation, index) => {
          const work = works[index]!;
          const view = within(presentation as HTMLElement).getByRole("link", {
            name: `${m.viewWork}: ${work.title}`,
          });
          const fullscreen = within(presentation as HTMLElement).getByRole("button", {
            name: m.fullscreen,
          });
          expect(view).toHaveAttribute("href", `${prefix[locale]}/ai-worlds/${work.slug}`);
          expect(fullscreen).toHaveAttribute("type", "button");
          // Keyboard order within the actions: the link, then the button.
          expect(view.compareDocumentPosition(fullscreen)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
          // The presentation itself is not a link, and controls are never nested.
          expect(presentation.closest("a")).toBeNull();
          for (const control of presentation.querySelectorAll("a, button")) {
            expect(control.querySelector("a, button")).toBeNull();
          }
        });
        unmount();
      }
    },
    20_000,
  );

  it("opens the full-screen viewer from a presentation's button", async () => {
    const collection = aiCollections[0]!;
    const work = getCollectionWorks(collection, "bg")[0]!;
    const { container } = await renderAt(`/ai-worlds/collections/${collection.slug}`, () => (
      <AiCollectionView collection={collection} />
    ));
    const first = container.querySelector<HTMLElement>("ol.container-page > li > article")!;
    fireEvent.click(within(first).getByRole("button", { name: messages.bg.ai.fullscreen }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(work.title);
  });
});
