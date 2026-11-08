import { QueryClient } from "@tanstack/react-query";
import { createRouter, isNotFound, isRedirect } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aiCollections,
  getAiCollection,
  getCollectionForWork,
  getCollectionWorkSlugs,
} from "@/content/ai-collections";
import { futureAiConcepts, futureConceptCollectionIds } from "@/content/ai-concepts";
import { aiWorks, getAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { routeTree } from "@/routeTree.gen";
import { Route as BgCollectionRoute } from "@/routes/ai-worlds.collections.$slug";
import { Route as EnCollectionRoute } from "@/routes/en.ai-worlds.collections.$slug";
import { Route as BgWorkRoute } from "@/routes/ai-worlds.$slug";
import { Route as EnWorkRoute } from "@/routes/en.ai-worlds.$slug";
import { AiCollectionView } from "@/views/ai-worlds";

let activeLocale: "bg" | "en" = "en";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: activeLocale, t: messages[activeLocale] }) };
});

vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    slug,
    children,
    className,
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={slug ? to.replace("$slug", slug) : to} className={className}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  activeLocale = "en";
});

describe("AI collections data", () => {
  it("has exactly four ordered collections", () => {
    expect(aiCollections.map((c) => c.slug)).toEqual([
      "historical-eras-rulers",
      "professions-roles",
      "cinema-archetypes",
      "chefo-around-the-world",
    ]);
    expect(aiCollections.map((c) => c.order)).toEqual([1, 2, 3, 4]);
    expect(getAiCollection("fantasy-space")).toBeUndefined();
    expect(getAiCollection("retro-collages")).toBeUndefined();
  });

  it("keeps completed works without requiring collection membership or duplicating records", () => {
    for (const work of aiWorks) {
      expect(
        aiCollections.filter((c) => getCollectionWorkSlugs(c).includes(work.slug)).length,
      ).toBeLessThanOrEqual(1);
    }
    const referenced = aiCollections.flatMap(getCollectionWorkSlugs);
    expect(new Set(referenced).size).toBe(referenced.length);
    expect(referenced.every((slug) => aiWorks.some((w) => w.slug === slug))).toBe(true);
    expect(aiWorks).toHaveLength(64);
    for (const slug of ["vladetel-na-morskoto-kralstvo", "lyato-na-moreto-ai-kolazh"]) {
      expect(getAiWork(slug)).toBeUndefined();
      expect(getCollectionForWork(slug)).toBeUndefined();
      expect(referenced).not.toContain(slug);
    }
    expect(aiCollections.map(getCollectionWorkSlugs).map((works) => works.length)).toEqual([
      16, 16, 16, 16,
    ]);
    for (const slug of [
      "chefo-srednovekoven-ritsar",
      "renesansov-portret",
      "chefo-v-badeshteto",
      "chefo-v-sauditska-arabiya",
    ]) {
      expect(getAiWork(slug)).toBeDefined();
    }
  });

  it("uses one of its own published works as the cover", () => {
    for (const c of aiCollections) {
      if (c.works.length) expect(c.works).toContain(c.coverWorkSlug);
      else expect(c.coverWorkSlug).toBeNull();
    }
  });

  it("keeps internal concept assignments valid and separate from public collections", () => {
    const ids = Object.values(futureConceptCollectionIds).flat();
    expect(Object.keys(futureConceptCollectionIds).every((slug) => getAiCollection(slug))).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => futureAiConcepts.some((c) => c.id === id))).toBe(true);
    expect(aiCollections.every((collection) => !("conceptIds" in collection))).toBe(true);
  });

  it("routes collection pages in both languages without clashing with artwork pages", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/ai-worlds/collections/cinema-archetypes").at(-1)?.routeId).toBe(
      "/ai-worlds/collections/$slug",
    );
    expect(router.matchRoutes("/en/ai-worlds/collections/cinema-archetypes").at(-1)?.routeId).toBe(
      "/en/ai-worlds/collections/$slug",
    );
    expect(router.matchRoutes("/ai-worlds/renesansov-portret").at(-1)?.routeId).toBe(
      "/ai-worlds/$slug",
    );
    expect(aiWorks.some((w) => w.slug === "collections")).toBe(false);
  });

  it("redirects retired collection URLs to the overview in their original language", () => {
    for (const slug of ["fantasy-space", "retro-collages"]) {
      for (const [route, to] of [
        [BgCollectionRoute, "/ai-worlds"],
        [EnCollectionRoute, "/en/ai-worlds"],
      ] as const) {
        let result: unknown;
        try {
          const loader = route.options.loader as (context: { params: { slug: string } }) => unknown;
          loader({ params: { slug } });
        } catch (error) {
          result = error;
        }
        expect(isRedirect(result)).toBe(true);
        if (isRedirect(result)) expect(result.options.to).toBe(to);
      }
    }
  });
});

describe("AI collection page", () => {
  it.each(["bg", "en"] as const)(
    "links every collection back to the localized AI Worlds parent in %s",
    (locale) => {
      activeLocale = locale;
      for (const collection of aiCollections) {
        const { unmount } = render(<AiCollectionView collection={collection} />);
        const link = screen.getByRole("link", { name: messages[locale].ai.backToAiWorlds });
        expect(link).toHaveAttribute("href", "/ai-worlds");
        expect(link).toHaveClass("back-pill");
        unmount();
      }
    },
  );

  // Stage 6b: the wall of large works became the mock's compact grid. Each tile keeps a
  // full-screen button (the image) and a link to the artwork page (the caption).
  it.each([
    ["historical-eras-rulers", "The Lion King", "Knight of the Last Wall"],
    ["professions-roles", "The Neighborhood Barber", "Sanitation Worker on an Early Shift"],
    ["cinema-archetypes", "The Red Planet", "The Final Assault"],
    ["chefo-around-the-world", "Under the Arabian Sun", "A Greek Afternoon"],
  ])(
    "renders %s artwork titles without decorative sequence labels",
    (slug, firstTitle, laterTitle) => {
      const { container } = render(<AiCollectionView collection={getAiCollection(slug)!} />);
      const grid = container.querySelector("ol.ai-thumb-grid")!;
      expect(grid.querySelectorAll("li").length).toBeGreaterThan(0);
      expect(grid.querySelectorAll(".ai-frame-portal")).toHaveLength(0);
      expect(grid.querySelector(".eyebrow.tabular-nums")).toBeNull();
      expect(grid.textContent).not.toContain(" · ");
      expect(grid.textContent).not.toMatch(/\b\d+\s*\/\s*\d+\b/);
      for (const title of new Set([firstTitle, laterTitle])) {
        expect(within(grid as HTMLElement).getByRole("link", { name: title })).toHaveClass(
          "ai-thumb-title",
        );
      }
    },
  );

  it("shows each work as a tile with its title link and opens it full screen", () => {
    const { container } = render(
      <AiCollectionView collection={getAiCollection("historical-eras-rulers")!} />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Historical Eras & Rulers" }),
    ).toBeInTheDocument();
    expect(container.querySelector("header .tabular-nums")).toBeNull();
    const grid = container.querySelector<HTMLElement>("ol.ai-thumb-grid")!;
    const titles = [...grid.querySelectorAll(".ai-thumb-title")].map((a) => a.textContent);
    expect(titles).toHaveLength(16);
    expect(titles.slice(0, 3)).toEqual([
      "The Lion King",
      "Roman Emperor",
      "Italian Renaissance Nobleman",
    ]);
    const viewActions = within(grid).getAllByRole("link");
    const fullscreenActions = within(grid).getAllByRole("button", {
      name: /^Open “.*” in full screen$/,
    });
    expect(viewActions).toHaveLength(16);
    expect(fullscreenActions).toHaveLength(16);
    expect(viewActions[0]).toHaveAttribute("href", "/ai-worlds/chefo-srednovekoven-ritsar");
    expect(viewActions[0]?.closest("button")).toBeNull();
    expect(fullscreenActions[0]).toHaveAttribute("type", "button");
    expect(fullscreenActions[0]).toHaveAccessibleName(
      messages.en.common.openFullscreen("The Lion King"),
    );
    fireEvent.click(fullscreenActions[2]!);
    const viewer = screen.getByRole("dialog", { name: "Italian Renaissance Nobleman" });
    expect(within(viewer).getByText("03 / 16")).toBeInTheDocument();
    expect(viewer.querySelector(".ai-frame-portal, .ai-frame-compact")).toBeNull();
  });

  it("restores focus to the exact fullscreen action after Escape and close", async () => {
    render(<AiCollectionView collection={getAiCollection("historical-eras-rulers")!} />);
    const triggers = screen.getAllByRole("button", { name: /^Open “.*” in full screen$/ });

    const escapeTrigger = triggers[1]!;
    escapeTrigger.focus();
    fireEvent.click(escapeTrigger);
    expect(screen.getByRole("dialog", { name: "Roman Emperor" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(escapeTrigger).toHaveFocus());

    const closeTrigger = triggers[14]!;
    closeTrigger.focus();
    fireEvent.click(closeTrigger);
    const dialog = screen.getByRole("dialog", { name: "Spartan Warrior" });
    fireEvent.click(
      within(dialog).getByRole("button", { name: messages.en.lightbox.close }),
    );
    await waitFor(() => expect(closeTrigger).toHaveFocus());
  });

  it("uses two previous/next collection cards and preserves the intentional wraparound order", () => {
    const collection = getAiCollection("historical-eras-rulers")!;
    render(<AiCollectionView collection={collection} />);
    const navigation = screen.getByRole("navigation", { name: "Collections" });
    const links = within(navigation).getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      "href",
      "/ai-worlds/collections/chefo-around-the-world",
    );
    expect(links[1]).toHaveAttribute("href", "/ai-worlds/collections/professions-roles");
    expect(links[0]).toHaveTextContent(/Previous collection.*Around the World/);
    expect(links[1]).toHaveTextContent(/Next collection.*Professions & Roles/);
    for (const link of links) {
      expect(link).toHaveClass("ai-col-nav-card");
      expect(link.querySelector("[aria-hidden='true']")).toBeInTheDocument();
    }
    expect(links[1]).toHaveClass("ai-col-nav-card--next");
  });

  it("exhibits all sixteen professions without exposing planned ideas", () => {
    activeLocale = "bg";
    const { container } = render(
      <AiCollectionView collection={getAiCollection("professions-roles")!} />,
    );
    // The decorative scene is not an exhibited work.
    const imagesOutsideScene = Array.from(container.querySelectorAll("img")).filter(
      (img) => !img.closest("[data-ai-section-background]"),
    );
    expect(container.querySelectorAll("[data-ai-section-background] img")).toHaveLength(1);
    expect(imagesOutsideScene).toHaveLength(16);
    expect(screen.getByRole("heading", { level: 1, name: "Професии и роли" })).toBeInTheDocument();
    expect(container.querySelectorAll(".ai-thumb-title")).toHaveLength(16);
    expect(container.querySelector("#planned-for-collection")).toBeNull();
    for (const concept of futureAiConcepts) {
      expect(container.textContent).not.toContain(concept.title.bg);
      expect(container.textContent).not.toContain(concept.description.bg);
      if (concept.promptTemplate) {
        expect(container.textContent).not.toContain(concept.promptTemplate.bg);
      }
    }
  });
});

describe("removed artworks", () => {
  it.each(["vladetel-na-morskoto-kralstvo", "lyato-na-moreto-ai-kolazh"])(
    "returns not found for %s in BG and EN",
    (slug) => {
      for (const route of [BgWorkRoute, EnWorkRoute]) {
        let result: unknown;
        try {
          const loader = route.options.loader as (context: { params: { slug: string } }) => unknown;
          loader({ params: { slug } });
        } catch (error) {
          result = error;
        }
        expect(isNotFound(result)).toBe(true);
      }
    },
  );
});
