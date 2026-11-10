import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectionText, getAiCollection, getCollectionCover } from "@/content/ai-collections";
import { deckCoverSrc } from "@/lib/deck-covers";
import { messages } from "@/i18n/messages";
import { AiCollectionView } from "@/views/ai-worlds";

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
    "aria-label": label,
    "aria-current": current,
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
    "aria-current"?: "page";
  }) => (
    <a
      href={`${activeLocale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}`}
      className={className}
      aria-label={label}
      aria-current={current}
    >
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  activeLocale = "bg";
});

describe.each(["bg", "en"] as const)("collection image navigation (%s)", (locale) => {
  it.each([
    ["historical-eras-rulers", "chefo-around-the-world", "professions-roles"],
    ["professions-roles", "historical-eras-rulers", "cinema-archetypes"],
    ["cinema-archetypes", "professions-roles", "chefo-around-the-world"],
    ["chefo-around-the-world", "cinema-archetypes", "historical-eras-rulers"],
  ])("keeps the cover, accessible link contract and cycle on %s", (slug, previous, next) => {
    activeLocale = locale;
    const collection = getAiCollection(slug)!;
    const m = messages[locale].ai;
    render(<AiCollectionView collection={collection} />);
    const navigation = screen.getByRole("navigation", { name: m.collections });
    const links = within(navigation).getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const [index, targetSlug] of [previous, next].entries()) {
      const target = getAiCollection(targetSlug)!;
      const cover = getCollectionCover(target, locale)!;
      const title = collectionText(target.title, locale);
      const label = index === 0 ? m.prevCollection : m.nextCollection;
      const link = links[index]!;
      expect(link).toHaveAccessibleName(`${label}: ${title}`);
      expect(link).toHaveAttribute(
        "href",
        `${locale === "en" ? "/en" : ""}/ai-worlds/collections/${target.slug}`,
      );
      expect(link).toHaveClass("ai-col-nav-card", "ai-col-nav-card--image");
      expect(link.querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
      expect(link.querySelector("small")).toHaveTextContent(label);
      expect(link.querySelector("b")).toHaveTextContent(title);
      expect(link.querySelector(".ai-col-nav-arrow")).toHaveAttribute("aria-hidden", "true");
      const images = link.querySelectorAll("img");
      expect(images).toHaveLength(2);
      for (const image of images) {
        expect(image).toHaveAttribute("alt", "");
        expect(image).toHaveAttribute("aria-hidden", "true");
        expect(image).toHaveAttribute("loading", "lazy");
        expect(image).toHaveAttribute("decoding", "async");
        expect(Number(image.getAttribute("width"))).toBeGreaterThan(0);
        expect(Number(image.getAttribute("height"))).toBeGreaterThan(0);
      }
      expect(link.querySelector(".ai-col-nav-thumb img")).toHaveAttribute("src", cover.image);
      expect(link.querySelector(".ai-col-nav-backdrop img")).toHaveAttribute(
        "src",
        deckCoverSrc(cover),
      );
      expect(within(link).queryByRole("img")).toBeNull();
    }
    expect(links[0]).not.toHaveClass("ai-col-nav-card--next");
    expect(links[1]).toHaveClass("ai-col-nav-card--next");
  });
});

describe("touch and pen pressed feedback", () => {
  it.each(["touch", "pen"])(
    "releases %s paint after up, cancellation or window blur",
    async (pointerType) => {
      render(<AiCollectionView collection={getAiCollection("historical-eras-rulers")!} />);
      const navigation = screen.getByRole("navigation", { name: messages.bg.ai.collections });
      const link = within(navigation).getAllByRole("link")[0]!;
      const down = (type: string) => {
        const event = new Event("pointerdown", { bubbles: true });
        Object.defineProperty(event, "pointerType", { value: type });
        fireEvent(link.querySelector("b")!, event);
      };
      for (const release of ["pointerup", "pointercancel", "blur"]) {
        down(pointerType);
        expect(link).toHaveClass("ai-col-nav-card--pressed");
        fireEvent(window, new Event(release));
        expect(link).not.toHaveClass("ai-col-nav-card--pressed");
      }
      down("mouse");
      expect(link).not.toHaveClass("ai-col-nav-card--pressed");
    },
  );
});
