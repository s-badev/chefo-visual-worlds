// Page structure after the Home / AI Worlds restructure: Home carries no world slider and no
// pinned collections scene; AI Worlds opens on the slider, then its intro and view switch, and its
// Collections view is the pinned "One face, four worlds" scene.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectionText, getAiCollections } from "@/content/ai-collections";
import { WORLD_PORTRAITS } from "@/content/home-worlds";
import { getAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { AiWorldsView } from "@/views/ai-worlds";
import { HomeView } from "@/views/home";

let activeLocale: "bg" | "en" = "bg";
let currentSearch: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useSearch: () => currentSearch,
    useNavigate:
      () =>
      ({ search }: { search: (previous: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch);
      },
  };
});

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
    "aria-label": ariaLabel,
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href={slug ? to.replace("$slug", slug) : to} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/portrait", () => ({ PortraitSwitch: () => <div /> }));

afterEach(() => {
  cleanup();
  activeLocale = "bg";
  currentSearch = {};
});

const follows = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

const LOCALES = ["bg", "en"] as const;

describe("Home structure", () => {
  it.each(LOCALES)("shows hero, lens, AI cards and about once each, in order, in %s", (locale) => {
    activeLocale = locale;
    const m = messages[locale].home;
    const { container } = render(<HomeView />);

    const heroes = container.querySelectorAll(".home-hero");
    expect(heroes).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const sections = [m.photoTitle, m.aiTitle, m.aboutTitle].map((name) => {
      const headings = screen.getAllByRole("heading", { level: 2, name });
      expect(headings).toHaveLength(1);
      return headings[0]!;
    });
    const [lens, ai, about] = sections as [HTMLElement, HTMLElement, HTMLElement];
    expect(container.querySelectorAll("#featured-albums")).toHaveLength(1);
    expect(follows(heroes[0]!, lens)).toBe(true);
    expect(follows(lens, ai)).toBe(true);
    expect(follows(ai, about)).toBe(true);

    // The four AI cards and their one link to the AI Worlds page.
    const aiSection = ai.closest("section")!;
    const titles =
      locale === "bg"
        ? ["Крал на лъва", "Капитанът срещу бурята", "Последният свидетел", "Вечер край Босфора"]
        : [
            "The Lion King",
            "Captain Against the Storm",
            "The Last Witness",
            "Evening on the Bosphorus",
          ];
    for (const title of titles) expect(within(aiSection).getAllByText(title)).toHaveLength(1);
    expect(within(aiSection).getByText(m.allAi).closest("a")).toHaveAttribute("href", "/ai-worlds");
  });

  it.each(LOCALES)("has neither the world slider nor the collections scene in %s", (locale) => {
    activeLocale = locale;
    const m = messages[locale].home;
    const { container } = render(<HomeView />);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(container.querySelector(".world-slider-section, #slider")).toBeNull();
    expect(container.querySelector(".home-worlds, .ai-section-background")).toBeNull();
    expect(container.textContent).not.toContain(m.worldSlider.title);
    expect(container.textContent).not.toContain(m.worldsLabel);
    expect(container.querySelector('a[href^="/ai-worlds/collections/"]')).toBeNull();
  });
});

describe("AI Worlds structure", () => {
  it.each(LOCALES)("opens on the slider, then the intro and the view switch, in %s", (locale) => {
    activeLocale = locale;
    const { container } = render(<AiWorldsView />);
    const sliders = container.querySelectorAll(".world-slider-section");
    expect(sliders).toHaveLength(1);
    const slider = sliders[0]!;
    // Nothing on the page comes before the slider.
    expect(container.firstElementChild).toBe(slider);
    expect(within(slider as HTMLElement).getByRole("slider")).toHaveAttribute("tabindex", "0");

    const title = screen.getByRole("heading", { level: 1, name: messages[locale].ai.title });
    expect(screen.getByText(messages[locale].ai.intro)).toBeInTheDocument();
    const group = screen.getByRole("group", { name: messages[locale].ai.view });
    expect(follows(slider, title)).toBe(true);
    expect(follows(title, group)).toBe(true);
  });

  it.each(LOCALES)("shows the pinned scene as Collections, after the switch, in %s", (locale) => {
    activeLocale = locale;
    const { container } = render(<AiWorldsView />);
    const group = screen.getByRole("group", { name: messages[locale].ai.view });
    const scenes = container.querySelectorAll<HTMLElement>("section.home-worlds");
    expect(scenes).toHaveLength(1);
    const scene = scenes[0]!;
    expect(follows(group, scene)).toBe(true);
    expect(scene).toHaveAttribute("aria-label", messages[locale].home.worldsLabel);
    // A sibling of the overview, so the old halls' intro-reach rules never apply to it.
    expect(scene.closest(".ai-overview")).toBeNull();
    // The rectangular halls are gone.
    expect(container.querySelector(".ai-presentation, .ai-presentation-media")).toBeNull();

    // Portraits blended into the scene: the same works the Home scene used, in collection order.
    const collections = getAiCollections();
    const portraits = Array.from(
      scene.querySelectorAll<HTMLImageElement>(".home-worlds-portrait img"),
    );
    expect(portraits.map((img) => img.getAttribute("src"))).toEqual(
      collections.map((c) => getAiWork(WORLD_PORTRAITS[c.slug]!.workSlug)!.image),
    );
    // The row of short names: the sticky collection tab bar (stage 6) replaced the jump group.
    const names = within(scene).getByRole("navigation", {
      name: messages[locale].home.worldsJump,
    });
    expect(
      within(names)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(collections.map((c) => collectionText(c.shortTitle, locale)));
    // "Explore the collection" keeps its target: the collection page.
    const actions = within(scene).getAllByText(messages[locale].ai.exploreCollection);
    expect(new Set(actions.map((a) => a.closest("a")!.getAttribute("href")))).toEqual(
      new Set(collections.map((c) => `/ai-worlds/collections/${c.slug}`)),
    );
    for (const action of actions) {
      const label = action.closest("a")!.getAttribute("aria-label")!;
      expect(
        collections.map(
          (c) => `${messages[locale].ai.exploreCollection}: ${collectionText(c.title, locale)}`,
        ),
      ).toContain(label);
    }
  });

  it("switches between Collections and All Artworks, keeping the slider on top", () => {
    const view = render(<AiWorldsView />);
    const tabs = () =>
      within(screen.getByRole("group", { name: messages.bg.ai.view })).getAllByRole("button");

    fireEvent.click(tabs()[1]!);
    view.rerender(<AiWorldsView />);
    expect(tabs()[1]).toHaveAttribute("aria-pressed", "true");
    expect(view.container.querySelector("section.home-worlds")).toBeNull();
    expect(screen.getByRole("region", { name: messages.bg.ai.allWorks })).toBeInTheDocument();
    expect(view.container.firstElementChild).toHaveClass("world-slider-section");

    fireEvent.click(tabs()[0]!);
    view.rerender(<AiWorldsView />);
    expect(tabs()[0]).toHaveAttribute("aria-pressed", "true");
    expect(view.container.querySelectorAll("section.home-worlds")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: messages.bg.ai.allWorks })).toBeNull();
    expect(view.container.firstElementChild).toHaveClass("world-slider-section");
  });
});
