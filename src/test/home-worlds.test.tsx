// Home "One face, four worlds": content from the collection data, exposed group and header marker.
import { cleanup, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeWorlds } from "@/components/home-worlds";
import { collectionText, getAiCollections, getCollectionWorkSlugs } from "@/content/ai-collections";
import { messages } from "@/i18n/messages";
import { WORLDS_PIN_QUERY } from "@/lib/worlds-motion";

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
    "takes titles, intros, short names and routes from the data in %s",
    (locale) => {
      activeLocale = locale;
      const { container } = render(<HomeWorlds />);
      const section = container.querySelector("section")!;
      expect(section).toHaveAttribute("aria-label", messages[locale].home.worldsLabel);
      expect(section).toHaveAttribute("data-header-theme", "dark");

      const pin = section.querySelector<HTMLElement>(".home-worlds-pin")!;
      const stack = section.querySelector<HTMLElement>(".home-worlds-stack")!;
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

      // The CTA follows the exposed (first) collection; this section shows no work count.
      const prefix = locale === "en" ? "/en" : "";
      const ctas = Array.from(pin.querySelectorAll("a"));
      expect(ctas.map((a) => a.getAttribute("href"))).toEqual([
        `${prefix}/ai-worlds/collections/${collections[0]!.slug}`,
      ]);
      expect(ctas[0]).toHaveTextContent(messages[locale].ai.exploreCollection);
      expect(ctas[0]!.className).toContain("interaction-primary");
      for (const collection of collections) {
        const count = messages[locale].ai.count(getCollectionWorkSlugs(collection).length);
        expect(section).not.toHaveTextContent(count);
      }
      expect(section.textContent).not.toMatch(locale === "bg" ? /творб/ : /artworks?\b/);

      // Four real name buttons with the short names; the full title stays their label. Since
      // stage 6 they are the sticky tab bar at the top of the section (outside the pinned stage).
      expect(
        within(pin).queryByRole("group", { name: messages[locale].home.worldsJump }),
      ).toBeNull();
      const names = within(section).getByRole("navigation", {
        name: messages[locale].home.worldsJump,
      });
      expect(section.firstElementChild).toBe(names);
      const buttons = within(names).getAllByRole("button");
      expect(buttons.map((b) => b.textContent)).toEqual(
        collections.map((c) => collectionText(c.shortTitle, locale)),
      );
      expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual(titles);
      // Label in name: the accessible name starts with the visible short name.
      buttons.forEach((b) =>
        expect(b.getAttribute("aria-label")!.toLowerCase()).toContain(b.textContent!.toLowerCase()),
      );
      expect(buttons.map((b) => b.getAttribute("aria-current"))).toEqual([
        "true",
        null,
        null,
        null,
      ]);
      // The current tab is the cream pill (data-current), never a gold text colour.
      expect(buttons.map((b) => b.hasAttribute("data-current"))).toEqual([
        true,
        false,
        false,
        false,
      ]);
      expect(buttons.some((b) => b.classList.contains("text-gold"))).toBe(false);

      // Four portraits; only the exposed one is announced.
      const portraits = Array.from(
        pin.querySelectorAll<HTMLImageElement>(".home-worlds-portrait img"),
      );
      expect(portraits).toHaveLength(4);
      // Nothing is drawn over the faces: the box holds only the four portraits.
      expect(pin.querySelector(".home-worlds-portrait")!.children).toHaveLength(4);
      expect(portraits.filter((img) => img.getAttribute("alt") !== "")).toHaveLength(1);
      expect(portraits.every((img) => img.getAttribute("decoding") === "async")).toBe(true);

      // Stacked fallback: four complete blocks, each linking to its own collection.
      expect(Array.from(stack.querySelectorAll("h2")).map((h) => h.textContent)).toEqual(titles);
      expect(Array.from(stack.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(
        collections.map((c) => `${prefix}/ai-worlds/collections/${c.slug}`),
      );
      expect(stack.querySelectorAll("img[alt]:not([alt=''])")).toHaveLength(4);
    },
  );

  it("shows no prototype-only labels", () => {
    const { container } = render(<HomeWorlds />);
    expect(container.textContent).not.toMatch(/Закачен скрол|Идея|Idea|Pinned scroll/);
  });
});

describe("Home worlds crossfade as applied to the stage", () => {
  afterEach(() => vi.restoreAllMocks());

  /** Pin query answers as on a wide window; the track sits at progress p of its 300svh travel. */
  const renderAt = (p: number, reducedMotion: boolean) => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query === WORLDS_PIN_QUERY && !reducedMotion,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const vh = window.innerHeight;
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.classList.contains("home-worlds-pin")
        ? ({ top: -p * 2 * vh, height: 3 * vh, width: 1280, left: 0 } as DOMRect)
        : original.call(this);
    });
    const { container } = render(<HomeWorlds />);
    return Array.from(
      container.querySelectorAll<HTMLElement>(".home-worlds-pin .home-worlds-copy"),
    );
  };

  it.each(["bg", "en"] as const)(
    "empties the text column at every transition midpoint, keeps the portrait, and hands over the heading there (%s)",
    (locale) => {
      activeLocale = locale;
      for (const [mid, i0] of [
        [0.22, 0],
        [0.5, 1],
        [0.78, 2],
      ] as const) {
        const copies = renderAt(mid, false);
        expect(copies.map((c) => Number(c.style.opacity))).toEqual([0, 0, 0, 0]);
        // The outgoing portrait stays opaque under the incoming one: never a blank stage.
        const imgs = Array.from(
          document.querySelectorAll<HTMLImageElement>(".home-worlds-pin .home-worlds-portrait img"),
        );
        expect(Number(imgs[i0]!.style.opacity)).toBe(1);
        expect(Number(imgs[i0 + 1]!.style.opacity)).toBeCloseTo(0.5, 6);
        cleanup();
        // One meaningful heading, handed over inside the empty gap; the others are hidden and inert.
        for (const [p, exposed] of [
          [mid - 0.005, i0],
          [mid + 0.005, i0 + 1],
        ] as const) {
          const around = renderAt(p, false);
          expect(around.every((c) => Number(c.style.opacity) <= 0.02)).toBe(true);
          expect(around.map((c) => c.getAttribute("aria-hidden"))).toEqual(
            around.map((_, i) => (i === exposed ? "false" : "true")),
          );
          around.forEach((c, i) =>
            expect(c.classList.contains("pointer-events-none")).toBe(i !== exposed),
          );
          cleanup();
        }
        // Before the gap only the outgoing text shows, after it only the incoming one.
        const before = renderAt(mid - 0.05, false).map((c) => Number(c.style.opacity));
        expect(before.filter((a) => a > 0.02)).toHaveLength(1);
        expect(before[i0]).toBeGreaterThan(0.02);
        cleanup();
        const after = renderAt(mid + 0.05, false).map((c) => Number(c.style.opacity));
        expect(after.filter((a) => a > 0.02)).toHaveLength(1);
        expect(after[i0 + 1]).toBeGreaterThan(0.02);
        cleanup();
      }
    },
  );

  it("leaves the stage untouched under reduced motion (the stacked list shows instead)", () => {
    const copies = renderAt(0.5, true);
    expect(copies.map((c) => c.style.opacity)).toEqual(["", "", "", ""]);
    expect(copies.map((c) => c.getAttribute("aria-hidden"))).toEqual([
      "false",
      "true",
      "true",
      "true",
    ]);
    expect(WORLDS_PIN_QUERY).toContain("(prefers-reduced-motion: no-preference)");
  });
});
