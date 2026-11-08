import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { futureAiConcepts } from "@/content/ai-concepts";
import { collectionText, getAiCollections, getCollectionWorks } from "@/content/ai-collections";
import { aiWorks } from "@/content/ai-works";
import { legacyFilterCollection } from "@/lib/ai-filters";
import { messages } from "@/i18n/messages";
import { AiWorldsView, validateAiSearch } from "@/views/ai-worlds";

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

const LOCALES = ["bg", "en"] as const;

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

describe("AI Worlds overview", () => {
  it.each(LOCALES)(
    "opens on the %s intro (title, intro, chips, switch) and one inert scene per hall",
    (locale) => {
      activeLocale = locale;
      const m = messages[locale].ai;
      const { container } = render(<AiWorldsView />);
      const index = container.querySelector<HTMLElement>(".ai-index")!;
      expect(index).toHaveClass("surface-dark");
      const intro = index.querySelector<HTMLElement>(".ai-intro")!;
      expect(within(intro).getByRole("heading", { level: 1 })).toHaveTextContent(m.title);
      expect(within(intro).getByText(m.intro)).toBeInTheDocument();
      // The eyebrow and the AI chip share their words; the chip is the second one.
      expect(
        within(intro)
          .getAllByText(messages[locale].common.aiBadge)
          .some((el) => el.classList.contains("ai-chip--ai")),
      ).toBe(true);
      expect(within(intro).getByText(m.summary(4, 64))).toHaveClass("ai-chip");
      expect(within(intro).getByRole("group", { name: m.view })).toBeTruthy();
      // The intro itself carries no scene; each hall carries its own, decorative and inert.
      expect(intro.querySelector("[data-ai-section-background]")).toBeNull();
      const layers = [...container.querySelectorAll<HTMLElement>(".ai-hall > .ai-hall-bg")];
      expect(
        layers.map((layer) => {
          expect(layer).toHaveAttribute("aria-hidden", "true");
          expect(layer.querySelector("a, button, [tabindex]")).toBeNull();
          expect(layer.querySelector("img")).toHaveAttribute("alt", "");
          return layer.dataset["aiSectionBackground"];
        }),
      ).toEqual(["historical", "professions", "cinema", "world"]);
    },
  );

  it("keeps All Artworks flat, without any scene", () => {
    currentSearch = { view: "works" };
    const { container } = render(<AiWorldsView />);
    expect(container.querySelector(".ai-intro h1")).toBeTruthy();
    expect(container.querySelector("[data-ai-section-background]")).toBeNull();
    expect(container.querySelector(".ai-hall")).toBeNull();
  });

  it("no longer carries the old intro reach or pinned scene rules", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");
    expect(css).not.toContain("--ai-intro-reach");
    expect(css).not.toContain(".ai-overview-hall");
    expect(css).not.toContain(".home-worlds");
  });

  it.each(LOCALES)("opens on the four curated collection halls in %s", (locale) => {
    activeLocale = locale;
    const m = messages[locale].ai;
    const { container } = render(<AiWorldsView />);
    const halls = [...container.querySelectorAll<HTMLElement>("article.ai-hall")];
    const collections = getAiCollections();
    expect(halls).toHaveLength(4);
    halls.forEach((hall, i) => {
      const collection = collections[i]!;
      const title = collectionText(collection.title, locale);
      expect(within(hall).getByRole("heading", { level: 2 })).toHaveTextContent(title);
      expect(hall).toHaveAccessibleName(title);
      const action = within(hall).getByRole("link", { name: `${m.exploreCollection}: ${title}` });
      expect(action).toHaveAttribute("href", `/ai-worlds/collections/${collection.slug}`);
      expect(action).toHaveTextContent(m.exploreCollection);
    });
    // The professions hall opens on its own first three works.
    const professions = halls[1]!;
    expect(
      [...professions.querySelectorAll<HTMLImageElement>(".ai-hall-shot img")].map((img) =>
        img.getAttribute("src"),
      ),
    ).toEqual(
      getCollectionWorks(collections[1]!, locale)
        .slice(0, 3)
        .map((w) => w.image),
    );
    expect(professions.textContent).not.toMatch(/coming soon|очаква|подготвя/i);
    expect(container.textContent).not.toContain(
      locale === "bg" ? "Едно лице. Много култури." : "One Face. Many Cultures.",
    );
    expect(container.textContent).not.toContain(
      locale === "bg" ? "Фантазия и космос" : "Fantasy & Space",
    );
    expect(container.textContent).not.toContain(
      locale === "bg" ? "Ретро колажи" : "Retro Collages",
    );
    // Filters belong to All Artworks, not to the halls.
    expect(screen.queryByRole("group", { name: m.filterLabel })).toBeNull();
    expectNoPrivateIdeas(container, locale);
  });

  it.each(LOCALES)(
    "shows only completed works in All Artworks in %s",
    (locale) => {
      activeLocale = locale;
      currentSearch = { view: "works" };
      const { container } = render(<AiWorldsView />);
      const gallery = screen.getByRole("region", { name: messages[locale].ai.allWorks });
      const tiles = Array.from(gallery.querySelectorAll(".ai-thumb"));
      expect(tiles).toHaveLength(64);
      expect(screen.getByRole("status")).toHaveTextContent(messages[locale].ai.shown(64));
      expect(gallery.querySelectorAll('a[href^="/ai-worlds/"]')).toHaveLength(64);
      // All works in collection order.
      expect(Array.from(gallery.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(
        getAiCollections()
          .flatMap((c) => getCollectionWorks(c, locale))
          .map((w) => `/ai-worlds/${w.slug}`),
      );
      expect(
        within(gallery).queryByRole("button", { name: /copy.*prompt|копирай.*промпт/i }),
      ).toBeNull();
      for (const title of locale === "bg"
        ? ["Владетел на морското кралство", "Лято на морето — AI колаж", "The Wild West"]
        : ["Ruler of the sea kingdom", "Summer by the sea — AI collage", "The Wild West"]) {
        expect(gallery.textContent).not.toContain(title);
      }
      expectNoPrivateIdeas(container, locale);
    },
    10_000,
  );

  it("shows no AI tool names on the tiles (the mock tiles carry only the AI chip)", () => {
    currentSearch = { view: "works" };
    render(<AiWorldsView />);
    const gallery = screen.getByRole("region", { name: messages.bg.ai.allWorks });
    expect(gallery.textContent).not.toMatch(/ChatGPT|Gemini|Grok/);
    const chips = gallery.querySelectorAll(".ai-thumb-chip");
    expect(chips).toHaveLength(64);
    expect(chips[0]).toHaveAttribute("aria-hidden", "true");
  });

  it.each(LOCALES)("filters All Artworks by collection in %s", (locale) => {
    activeLocale = locale;
    currentSearch = { view: "works" };
    const m = messages[locale].ai;
    const view = render(<AiWorldsView />);
    const group = () => screen.getByRole("group", { name: m.filterLabel });
    const buttons = () => within(group()).getAllByRole("button");
    expect(buttons().map((b) => b.textContent)).toEqual([
      messages[locale].common.all,
      ...getAiCollections().map((c) => collectionText(c.shortTitle, locale)),
    ]);
    expect(buttons().map((b) => b.getAttribute("aria-pressed"))).toEqual([
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);
    fireEvent.click(buttons()[3]!);
    expect(currentSearch["collection"]).toBe("cinema-archetypes");
    expect(currentSearch["view"]).toBe("works");
    view.rerender(<AiWorldsView />);
    expect(buttons()[3]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(m.shown(16));
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByRole("region", { name: m.allWorks }).querySelectorAll(".ai-thumb"),
    ).toHaveLength(16);
    fireEvent.click(buttons()[0]!);
    expect(currentSearch["collection"]).toBeUndefined();
    view.rerender(<AiWorldsView />);
    expect(screen.getByRole("status")).toHaveTextContent(m.shown(64));
  });

  it("opens All Artworks from an old filter deep link and picks the closest collection", () => {
    activeLocale = "en";
    currentSearch = validateAiSearch({ role: "ruler" });
    render(<AiWorldsView />);
    const group = screen.getByRole("group", { name: "Collection" });
    const pressed = within(group)
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");
    const mapped = legacyFilterCollection({ role: "ruler" });
    expect(mapped).toBe("historical-eras-rulers");
    expect(pressed.map((b) => b.textContent)).toEqual(["Historical"]);
    expect(screen.getByRole("status")).toHaveTextContent("16 artworks shown");
  });

  it("reads every old filter parameter without errors and ignores unknown values", () => {
    expect(validateAiSearch({ category: "nope", tool: 3, collection: "nope", view: "x" })).toEqual({
      view: undefined,
      collection: undefined,
      category: undefined,
      role: undefined,
      era: undefined,
      setting: undefined,
      tool: undefined,
    });
    // A filter whose matches span several collections opens All works without a collection.
    const tool = aiWorks[0]!.tool;
    expect(legacyFilterCollection({ tool })).toBeUndefined();
    currentSearch = validateAiSearch({ tool });
    render(<AiWorldsView />);
    expect(screen.getByRole("status")).toHaveTextContent(messages.bg.ai.shown(64));
  });

  it("ships every hall visible in the server HTML", () => {
    const html = renderToString(<AiWorldsView />);
    expect(html.match(/class="ai-hall surface-dark"/g)).toHaveLength(4);
    expect(html).not.toContain("data-hall-reveal");
  });
});
