import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { futureAiConcepts } from "@/content/ai-concepts";
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
    // The collection uses its own taxi portrait as cover.
    const professions = links[1]!.closest("article")!;
    expect(professions.querySelector("img")?.getAttribute("src")).toContain("chefo-taxi-driver.webp");
    expect(professions.textContent).not.toMatch(/coming soon|очаква|подготвя/i);
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

  it.each(["bg", "en"] as const)("shows only completed works in %s", (locale) => {
    activeLocale = locale;
    currentSearch = { view: "works" };
    const { container } = render(<AiWorldsView />);
    const gallery = screen.getByRole("region", { name: messages[locale].ai.allWorks });
    const galleryCards = Array.from(gallery.querySelectorAll(":scope > article"));
    expect(galleryCards).toHaveLength(29);
    expect(gallery.className).toContain("sm:grid-cols-2");
    expect(gallery.className).toContain("lg:grid-cols-3");
    expect(screen.queryByRole("heading", { name: "Chefo as a Cowboy" })).toBeNull();
    expect(screen.getByText(messages[locale].ai.count(29))).toBeInTheDocument();
    expect(container.querySelectorAll('a[href^="/ai-worlds/"]')).toHaveLength(29);
    expect(within(gallery).queryByRole("button", { name: /copy.*prompt|копирай.*промпт/i })).toBeNull();
    for (const title of locale === "bg"
      ? ["Владетел на морското кралство", "Лято на морето — AI колаж"]
      : ["Ruler of the sea kingdom", "Summer by the sea — AI collage"]) {
      expect(within(gallery).queryByRole("heading", { name: title })).not.toBeInTheDocument();
    }
    expectNoPrivateIdeas(container, locale);
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
    expect(screen.getByText("Chefo in the future")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chefo as a Cowboy" })).not.toBeInTheDocument();
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
    expect(screen.getByText("29 artworks")).toBeInTheDocument();
    expectNoPrivateIdeas(view.container, "en");
  });

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
    fireEvent.click(within(sheet).getByRole("button", { name: "Show 29 artworks" }));
    expect(currentSearch["role"]).toBeUndefined();
  });
});
