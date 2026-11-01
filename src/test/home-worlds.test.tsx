// Home "One face, four worlds": content from the collection data, exposed group and header marker.
import { cleanup, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeWorlds } from "@/components/home-worlds";
import { collectionText, getAiCollections, getCollectionWorkSlugs } from "@/content/ai-collections";
import { messages } from "@/i18n/messages";

let activeLocale: "bg" | "en" = "bg";

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
    tabIndex,
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
    tabIndex?: number;
  }) => (
    <a
      href={`${activeLocale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}`}
      className={className}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
    >
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  activeLocale = "bg";
});

describe("Home one face, four worlds", () => {
  it.each(["bg", "en"] as const)(
    "takes titles, intros, counts and routes from the data in %s",
    (locale) => {
      activeLocale = locale;
      const { container } = render(<HomeWorlds />);
      const section = container.querySelector("section")!;
      expect(section).toHaveAttribute("aria-label", messages[locale].home.worldsLabel);
      expect(section).toHaveAttribute("data-header-theme", "dark");

      const pin = section.querySelector<HTMLElement>(".home-worlds-pin")!;
      const collections = getAiCollections();
      const titles = collections.map((c) => collectionText(c.title, locale));

      // Pinned stage: four overlapping groups in collection order, only the first exposed.
      const groups = Array.from(pin.querySelectorAll<HTMLElement>(".home-worlds-copy"));
      expect(groups.map((g) => g.querySelector("h2")!.textContent)).toEqual(titles);
      expect(groups.map((g) => g.getAttribute("aria-hidden"))).toEqual([
        "false",
        "true",
        "true",
        "true",
      ]);
      expect(groups.slice(1).every((g) => g.classList.contains("pointer-events-none"))).toBe(true);
      groups.forEach((g, i) =>
        expect(
          within(g).getByText(collectionText(collections[i]!.intro, locale)),
        ).toBeInTheDocument(),
      );

      // Count and CTA follow the exposed (first) collection.
      const prefix = locale === "en" ? "/en" : "";
      const ctas = Array.from(pin.querySelectorAll("a"));
      expect(ctas.map((a) => a.getAttribute("href"))).toEqual([
        `${prefix}/ai-worlds/collections/${collections[0]!.slug}`,
      ]);
      expect(ctas[0]).toHaveTextContent(messages[locale].ai.exploreCollection);
      expect(ctas[0]!.className).toContain("interaction-primary");
      expect(pin).toHaveTextContent(
        messages[locale].ai.count(getCollectionWorkSlugs(collections[0]!).length),
      );

      // Four real name buttons; the exposed one is current.
      const names = within(pin).getByRole("group", { name: messages[locale].home.worldsJump });
      const buttons = within(names).getAllByRole("button");
      expect(buttons.map((b) => b.textContent)).toEqual(titles);
      expect(buttons.map((b) => b.getAttribute("aria-current"))).toEqual([
        "true",
        null,
        null,
        null,
      ]);

      // Four portraits; only the exposed one is announced.
      const portraits = Array.from(
        pin.querySelectorAll<HTMLImageElement>(".home-worlds-portrait img"),
      );
      expect(portraits).toHaveLength(4);
      expect(portraits.filter((img) => img.getAttribute("alt") !== "")).toHaveLength(1);
      expect(portraits.every((img) => img.getAttribute("decoding") === "async")).toBe(true);
    },
  );

  it("shows no prototype-only labels", () => {
    const { container } = render(<HomeWorlds />);
    expect(container.textContent).not.toMatch(/Закачен скрол|Идея|Idea|Pinned scroll/);
  });
});
