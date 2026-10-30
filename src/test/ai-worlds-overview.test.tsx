import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExhibitWork } from "@/components/ai-exhibition";
import { futureAiConcepts } from "@/content/ai-concepts";
import { getAiWork, localizeAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { AiWorldsView } from "@/views/ai-worlds";

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
  return {
    ...actual,
    useT: () => ({ locale: activeLocale, t: messages[activeLocale] }),
  };
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

afterEach(() => {
  cleanup();
  activeLocale = "bg";
  currentSearch = {};
});

const expectNoPrivateIdeas = (container: HTMLElement, locale: "bg" | "en") => {
  expect(container.querySelector("#future-ai-concepts, #planned-for-collection")).toBeNull();
  for (const concept of futureAiConcepts) {
    expect(screen.queryByRole("heading", { name: concept.title[locale] })).toBeNull();
    expect(container.textContent).not.toContain(concept.description[locale]);
    if (concept.promptTemplate) {
      expect(container.textContent).not.toContain(concept.promptTemplate[locale]);
    }
  }
};

const openDesktopFilters = (container: HTMLElement) =>
  fireEvent.click(container.querySelector('button[aria-controls="ai-filter-panel"]')!);

describe("AI Worlds overview", () => {
  it("runs each collection backdrop edge to edge behind a centred content container", () => {
    const { container } = render(<AiWorldsView />);
    const halls = [...container.querySelectorAll<HTMLElement>("li.ai-overview-hall")];
    expect(halls).toHaveLength(4);
    for (const hall of halls) {
      // The hall itself is outside every max-width container, so it spans the viewport.
      expect(hall.closest(".container-page")).toBeNull();
      const layer = hall.querySelector<HTMLElement>(".ai-section-background")!;
      expect(layer.parentElement).toBe(hall);
      const content = hall.querySelector<HTMLElement>(":scope > .container-page")!;
      expect(content).not.toBeNull();
      expect(content).toContainElement(hall.querySelector<HTMLElement>(".ai-presentation"));
      expect(content).not.toContainElement(layer);
    }
  });

  it.each(["bg", "en"] as const)("opens on the four curated collections in %s", (locale) => {
    activeLocale = locale;
    const { container } = render(<AiWorldsView />);
    const links = Array.from(container.querySelectorAll('a[href^="/ai-worlds/collections/"]'));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/ai-worlds/collections/historical-eras-rulers",
      "/ai-worlds/collections/professions-roles",
      "/ai-worlds/collections/cinema-archetypes",
      "/ai-worlds/collections/chefo-around-the-world",
    ]);
    expect(container.textContent).not.toMatch(/0[1-4]\s*\/\s*04/);
    // Each hall is entered through its one visible action, named after the collection.
    const collectionActions = screen.getAllByText(messages[locale].ai.exploreCollection);
    expect(collectionActions).toHaveLength(4);
    for (const action of collectionActions) {
      const link = action.closest("a")!;
      const title = within(link.closest("article")!).getByRole("heading", { level: 2 });
      expect(link).toHaveAccessibleName(
        `${messages[locale].ai.exploreCollection}: ${title.textContent}`,
      );
    }
    // The collection uses its own taxi portrait as cover.
    const professions = links[1]!.closest("article")!;
    expect(professions.querySelector(".ai-presentation-media img")?.getAttribute("src")).toContain(
      "chefo-taxi-driver.webp",
    );
    expect(professions.querySelector(".ai-frame-portal")).toBeNull();
    expect(professions.textContent).not.toMatch(/coming soon|очаква|подготвя/i);
    const aroundTheWorld = links[3]!.closest("article")!;
    expect(aroundTheWorld).toHaveTextContent(messages[locale].ai.count(16));
    expect(aroundTheWorld.textContent).not.toContain(
      locale === "bg" ? "Едно лице. Много култури." : "One Face. Many Cultures.",
    );
    expect(container.textContent).not.toContain(
      locale === "bg" ? "Фантазия и космос" : "Fantasy & Space",
    );
    expect(container.textContent).not.toContain(
      locale === "bg" ? "Ретро колажи" : "Retro Collages",
    );
    // Filters belong to All Artworks, not to the exhibition.
    expect(screen.queryByRole("group", { name: messages[locale].ai.role })).toBeNull();
    expectNoPrivateIdeas(container, locale);
  });

  it.each(["bg", "en"] as const)(
    "shows only completed works in %s",
    (locale) => {
      activeLocale = locale;
      currentSearch = { view: "works" };
      const { container } = render(<AiWorldsView />);
      const gallery = screen.getByRole("region", { name: messages[locale].ai.allWorks });
      const galleryCards = Array.from(gallery.querySelectorAll(":scope > article"));
      expect(galleryCards).toHaveLength(64);
      expect(galleryCards.every((card) => card.querySelector(".ai-frame-compact"))).toBe(true);
      expect(galleryCards.some((card) => card.querySelector(".ai-frame-portal"))).toBe(false);
      expect(gallery.className).toContain("sm:grid-cols-2");
      expect(gallery.className).toContain("lg:grid-cols-3");
      expect(screen.queryByRole("heading", { name: "The Wild West" })).toBeNull();
      expect(screen.getByText(messages[locale].ai.count(64))).toBeInTheDocument();
      expect(container.querySelectorAll('a[href^="/ai-worlds/"]')).toHaveLength(64);
      expect(
        within(gallery).queryByRole("button", { name: /copy.*prompt|копирай.*промпт/i }),
      ).toBeNull();
      for (const title of locale === "bg"
        ? ["Владетел на морското кралство", "Лято на морето — AI колаж"]
        : ["Ruler of the sea kingdom", "Summer by the sea — AI collage"]) {
        expect(within(gallery).queryByRole("heading", { name: title })).not.toBeInTheDocument();
      }
      expectNoPrivateIdeas(container, locale);
    },
    10_000,
  );

  it("shows only approved provider attribution on artwork cards", () => {
    activeLocale = "en";
    for (const [slug, provider] of [
      ["chefo-srednovekoven-ritsar", "ChatGPT Image Generation"],
      ["rainy-neon-noir", "Gemini Nano Banana"],
    ] as const) {
      const work = localizeAiWork(getAiWork(slug)!, "en");
      const { container, unmount } = render(<ExhibitWork work={work} index={0} />);
      expect(container.querySelector("article > div:last-child p")).toHaveTextContent(provider);
      expect(container.textContent).not.toContain(" · ");
      unmount();
    }

    for (const slug of ["chefo-v-badeshteto", "angry-roman-emperor-in-senate"]) {
      const work = localizeAiWork(getAiWork(slug)!, "en");
      const { container, unmount } = render(<ExhibitWork work={work} index={0} />);
      expect(container.querySelector("article > div:last-child p")).toBeNull();
      unmount();
    }
  });

  it("opens All Artworks from an old filter deep link", () => {
    activeLocale = "en";
    currentSearch = { role: "ruler" };
    render(<AiWorldsView />);
    expect(screen.getByText("1 artwork")).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Active filters" })).getByRole("button", {
        name: "Remove filter “Ruler”",
      }),
    ).toBeInTheDocument();
  });

  it("combines role and AI tool without exposing future concepts", () => {
    activeLocale = "en";
    currentSearch = { view: "works" };
    const view = render(<AiWorldsView />);
    openDesktopFilters(view.container);
    fireEvent.click(
      within(screen.getByRole("group", { name: "Profession / Role" })).getByRole("button", {
        name: "Explorer",
      }),
    );
    view.rerender(<AiWorldsView />);
    fireEvent.click(
      within(screen.getByRole("group", { name: "AI Tool" })).getByRole("button", { name: "Grok" }),
    );
    view.rerender(<AiWorldsView />);

    expect(screen.getByText("1 artwork")).toBeInTheDocument();
    expect(view.container.querySelectorAll('a[href^="/ai-worlds/"]')).toHaveLength(1);
    expect(screen.getByText("The Red Planet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The Wild West" })).not.toBeInTheDocument();
    expectNoPrivateIdeas(view.container, "en");

    fireEvent.click(
      within(screen.getByRole("group", { name: "Historical Era" })).getByRole("button", {
        name: "Medieval",
      }),
    );
    view.rerender(<AiWorldsView />);
    expect(screen.getByText("0 artworks")).toBeInTheDocument();
    expect(screen.getByText(messages.en.ai.empty)).toBeInTheDocument();
    expectNoPrivateIdeas(view.container, "en");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    view.rerender(<AiWorldsView />);
    expect(screen.getByText("64 artworks")).toBeInTheDocument();
    expectNoPrivateIdeas(view.container, "en");
  }, 10_000);

  it("applies, discards and resets a draft in the mobile filter sheet", async () => {
    activeLocale = "en";
    currentSearch = { view: "works" };
    const view = render(<AiWorldsView />);
    const sheetTrigger = () => view.container.querySelector('button[aria-haspopup="dialog"]')!;

    fireEvent.click(sheetTrigger());
    let sheet = await screen.findByRole("dialog", { name: "Filters" });
    fireEvent.click(
      within(within(sheet).getByRole("group", { name: "Profession / Role" })).getByRole("button", {
        name: "Ruler",
      }),
    );
    expect(currentSearch["role"]).toBeUndefined(); // still a draft
    fireEvent.click(within(sheet).getByRole("button", { name: "Show 1 artwork" }));
    expect(currentSearch["role"]).toBe("ruler");
    view.rerender(<AiWorldsView />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(sheetTrigger());
    sheet = await screen.findByRole("dialog", { name: "Filters" });
    fireEvent.click(
      within(within(sheet).getByRole("group", { name: "AI Tool" })).getByRole("button", {
        name: "Grok",
      }),
    );
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(currentSearch["tool"]).toBeUndefined(); // Escape discards the draft

    fireEvent.click(sheetTrigger());
    sheet = await screen.findByRole("dialog", { name: "Filters" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Reset" }));
    fireEvent.click(within(sheet).getByRole("button", { name: "Show 64 artworks" }));
    expect(currentSearch["role"]).toBeUndefined();
  });
});
