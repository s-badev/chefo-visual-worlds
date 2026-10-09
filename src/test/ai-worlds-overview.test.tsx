import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("AI Worlds overview", () => {
  it.each(["bg", "en"] as const)(
    "keeps completed works separate from planned ideas in %s",
    (locale) => {
      activeLocale = locale;
      const { container } = render(<AiWorldsView />);
      expect(screen.getByText(messages[locale].ai.futureTitle)).toBeInTheDocument();
      const gallery = screen.getByRole("region", { name: messages[locale].ai.title });
      const galleryCards = Array.from(gallery.querySelectorAll(":scope > article"));
      expect(galleryCards).toHaveLength(6);
      expect(gallery.className).toContain("sm:grid-cols-2");
      expect(gallery.className).toContain("lg:grid-cols-3");
      const cowboyTitle = locale === "bg" ? "Чефо като каубой" : "Chefo as a Cowboy";
      const cowboy = screen.getByRole("heading", { name: cowboyTitle }).closest("article");
      expect(galleryCards[5]).toBe(cowboy);
      expect(cowboy?.querySelector("img, button, a")).toBeNull();
      expect(cowboy?.textContent).toContain(messages[locale].ai.imageComingSoon);
      expect(cowboy?.querySelector("div")?.className).toContain("aspect-[4/5]");
      expect(screen.getByText(messages[locale].ai.count(5))).toBeInTheDocument();
      expect(container.querySelectorAll('a[href^="/ai-worlds/"]')).toHaveLength(5);
      expect(
        container.querySelectorAll('section[aria-labelledby="future-ai-concepts"] article'),
      ).toHaveLength(8);
    },
  );

  it("combines role and AI tool without hiding the future concepts", () => {
    activeLocale = "en";
    const view = render(<AiWorldsView />);
    fireEvent.click(
      within(screen.getByRole("group", { name: "Profession / Role" })).getByRole("button", {
        name: "Ruler",
      }),
    );
    view.rerender(<AiWorldsView />);
    fireEvent.click(
      within(screen.getByRole("group", { name: "AI Tool" })).getByRole("button", { name: "Grok" }),
    );
    view.rerender(<AiWorldsView />);

    expect(screen.getByText("1 artwork")).toBeInTheDocument();
    expect(view.container.querySelectorAll('a[href^="/ai-worlds/"]')).toHaveLength(1);
    expect(screen.getByText("Ruler of the sea kingdom")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chefo as a Cowboy" })).not.toBeInTheDocument();
    expect(
      view.container.querySelectorAll('section[aria-labelledby="future-ai-concepts"] article'),
    ).toHaveLength(8);

    fireEvent.click(
      within(screen.getByRole("group", { name: "Historical Era" })).getByRole("button", {
        name: "Medieval",
      }),
    );
    view.rerender(<AiWorldsView />);
    expect(screen.getByText("0 artworks")).toBeInTheDocument();
    expect(screen.getByText(messages.en.ai.empty)).toBeInTheDocument();
    expect(
      view.container.querySelectorAll('section[aria-labelledby="future-ai-concepts"] article'),
    ).toHaveLength(8);

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    view.rerender(<AiWorldsView />);
    expect(screen.getByText("5 artworks")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chefo as a Cowboy" })).toBeInTheDocument();
  });
});
