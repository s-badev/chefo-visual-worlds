// Redesign stage 6 · AI Worlds: the sticky collection tabs that follow the scroll, the sliding
// indicator, the view switch and the collection page tab row.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeWorlds } from "@/components/home-worlds";
import { collectionText, getAiCollections } from "@/content/ai-collections";
import { messages } from "@/i18n/messages";
import {
  ACTIVE_LINE,
  TAB_LOCK_IDLE_MS,
  TAB_LOCK_MAX_MS,
  activeSceneIndex,
  pinnedSlotTops,
  tabScrollTarget,
} from "@/lib/world-tabs";
import { WORLD_COUNT, exposedIndex, progressAt } from "@/lib/worlds-motion";
import { AiCollectionView, AiWorldsView } from "@/views/ai-worlds";

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
    ...rest
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a
      href={`${activeLocale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}`}
      className={className}
      aria-label={rest["aria-label"] as string | undefined}
      aria-current={rest["aria-current"] as "page" | undefined}
      data-current={rest["data-current"] as string | undefined}
    >
      {children}
    </a>
  ),
}));

const LOCALES = ["bg", "en"] as const;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  activeLocale = "bg";
  currentSearch = {};
});

describe("activeSceneIndex", () => {
  const line = 470;
  it("defaults to the first scene when every slot is below the line", () => {
    expect(activeSceneIndex([600, 1200, 1800, 2400], line)).toBe(0);
  });
  it("takes the last scene when every slot is above the line", () => {
    expect(activeSceneIndex([-2400, -1800, -1200, -600], line)).toBe(3);
  });
  it("counts a slot exactly on the line as reached", () => {
    expect(activeSceneIndex([-200, line, line + 1, 2000], line)).toBe(1);
  });
  it("handles a single scene and an empty list", () => {
    expect(activeSceneIndex([900], line)).toBe(0);
    expect(activeSceneIndex([-900], line)).toBe(0);
    expect(activeSceneIndex([], line)).toBe(-1);
  });
  it("uses a reading line at 47% of the viewport", () => {
    expect(ACTIVE_LINE).toBe(0.47);
  });
});

describe("pinned slots", () => {
  it("agree with the world the pinned stage shows, all the way through the track", () => {
    const vh = 900;
    const height = 3 * vh;
    for (let step = 0; step <= 200; step++) {
      const p = step / 200;
      // Skip the exact handover point, where the two rules may round differently.
      const { i0, t } = progressAt(p);
      if (Math.abs(t - 0.5) < 0.01) continue;
      const tops = pinnedSlotTops(-p * (height - vh), height, vh);
      expect(tops).toHaveLength(WORLD_COUNT);
      expect(activeSceneIndex(tops, vh * ACTIVE_LINE), `p=${p}`).toBe(exposedIndex(i0, t));
    }
  });
  it("keeps the first world before the track and the last one after it", () => {
    expect(activeSceneIndex(pinnedSlotTops(400, 2700, 900), 423)).toBe(0);
    expect(activeSceneIndex(pinnedSlotTops(-5000, 2700, 900), 423)).toBe(3);
  });
  it("lands a stacked scene just under the header and the tab bar", () => {
    expect(tabScrollTarget(2000, 65, 62)).toBe(2000 - 65 - 62 - 8);
    expect(tabScrollTarget(50, 65, 62)).toBe(0);
  });
});

describe("collection tabs on the One face, four worlds section", () => {
  it.each(LOCALES)(
    "renders one tab per collection in data order with a nav label in %s",
    (locale) => {
      activeLocale = locale;
      const { container } = render(<HomeWorlds />);
      const nav = screen.getByRole("navigation", { name: messages[locale].home.worldsJump });
      expect(container.querySelector("section")!.firstElementChild).toBe(nav);
      const tabs = within(nav).getAllByRole("button");
      const collections = getAiCollections();
      expect(tabs.map((tab) => tab.textContent)).toEqual(
        collections.map((c) => collectionText(c.shortTitle, locale)),
      );
      expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual(
        collections.map((c) => collectionText(c.title, locale)),
      );
      expect(tabs.map((tab) => tab.getAttribute("aria-current"))).toEqual([
        "true",
        null,
        null,
        null,
      ]);
      // The old jump group is gone: one row of names only.
      expect(screen.queryByRole("group", { name: messages[locale].home.worldsJump })).toBeNull();
    },
  );

  it("ships the first tab as current, painted by itself until the indicator is measured", () => {
    const html = renderToString(<HomeWorlds />);
    expect(html).toMatch(/aria-current="true"[^>]*data-current=""/);
    expect(html).not.toContain("data-indicator");
    expect(html).toContain('class="slide-indicator"');
  });

  describe("scroll sync and the click lock (stacked layout)", () => {
    let scrollY = 0;
    const docTops = [1000, 1600, 2200, 2800];
    const scrollTo = vi.fn();
    let reduced = false;

    beforeEach(() => {
      scrollY = 0;
      reduced = false;
      scrollTo.mockReset();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
        setTimeout(() => cb(0), 16),
      );
      vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
      vi.stubGlobal("innerHeight", 1000);
      Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
      window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
      vi.spyOn(window, "matchMedia").mockImplementation(
        (query: string) =>
          ({
            matches: query.includes("prefers-reduced-motion: reduce") ? reduced : false,
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
      );
      const original = HTMLElement.prototype.getBoundingClientRect;
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.tagName === "HEADER") return { top: 0, height: 65, bottom: 65 } as DOMRect;
        if (this.classList.contains("home-worlds-stack-item")) {
          const i = Array.from(this.parentElement!.children).indexOf(this);
          return { top: docTops[i]! - scrollY, height: 500 } as DOMRect;
        }
        return original.call(this);
      });
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains("home-worlds-tabs") ? 62 : 0;
      });
    });

    const renderWithHeader = () => {
      const header = document.createElement("header");
      document.body.prepend(header);
      const view = render(<HomeWorlds />);
      return { ...view, done: () => header.remove() };
    };
    const tabs = () =>
      within(screen.getByRole("navigation", { name: messages.bg.home.worldsJump })).getAllByRole(
        "button",
      );
    const current = () => tabs().findIndex((tab) => tab.getAttribute("aria-current") === "true");
    const scrollToY = async (y: number) => {
      scrollY = y;
      window.dispatchEvent(new Event("scroll"));
      await act(() => vi.advanceTimersByTimeAsync(20));
    };

    it("follows the scroll: last scene at or above 47% of the viewport, first at the top", async () => {
      const { done } = renderWithHeader();
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(current()).toBe(0);
      await scrollToY(1600 - 470); // scene 2 reaches the line
      expect(current()).toBe(1);
      await scrollToY(2200 - 471); // one pixel short of scene 3
      expect(current()).toBe(1);
      await scrollToY(9000); // past the last scene
      expect(current()).toBe(3);
      await scrollToY(0); // back to the top
      expect(current()).toBe(0);
      done();
    });

    it("scrolls to a clicked scene, shows it at once and holds it until scrolling is idle", async () => {
      const { done } = renderWithHeader();
      await act(() => vi.advanceTimersByTimeAsync(20));
      fireEvent.click(tabs()[2]!);
      expect(scrollTo).toHaveBeenLastCalledWith({
        top: 2200 - (65 + 62 + 8),
        behavior: "smooth",
      });
      expect(current()).toBe(2);
      // On the way there the geometry says scene 1, but the clicked tab is held.
      await scrollToY(1600 - 400);
      await act(() => vi.advanceTimersByTimeAsync(TAB_LOCK_IDLE_MS - 40));
      await scrollToY(1600 - 300);
      expect(current()).toBe(2);
      // Idle for the lock time: the tab follows the real position again.
      await act(() => vi.advanceTimersByTimeAsync(TAB_LOCK_IDLE_MS + 40));
      expect(current()).toBe(1);
      done();
    });

    it("lets a wheel, touch or key unlock at once, and never holds longer than the hard limit", async () => {
      const { done } = renderWithHeader();
      await act(() => vi.advanceTimersByTimeAsync(20));
      fireEvent.click(tabs()[3]!);
      expect(current()).toBe(3);
      window.dispatchEvent(new Event("wheel"));
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(current()).toBe(0);

      fireEvent.click(tabs()[2]!);
      expect(current()).toBe(2);
      await act(() => vi.advanceTimersByTimeAsync(TAB_LOCK_MAX_MS - 50));
      expect(current()).toBe(2);
      await act(() => vi.advanceTimersByTimeAsync(100));
      expect(current()).toBe(0);
      done();
    });

    it("jumps without smooth scrolling under reduced motion", async () => {
      reduced = true;
      const { done } = renderWithHeader();
      await act(() => vi.advanceTimersByTimeAsync(20));
      fireEvent.click(tabs()[1]!);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 1600 - 135, behavior: "auto" });
      done();
    });
  });
});

describe("AI Worlds view switch", () => {
  it.each(LOCALES)("shows the tab bar only in the Collections view in %s", (locale) => {
    activeLocale = locale;
    const label = messages[locale].home.worldsJump;
    const view = render(<AiWorldsView />);
    expect(screen.getByRole("navigation", { name: label })).toBeInTheDocument();
    const group = screen.getByRole("group", { name: messages[locale].ai.view });
    const [collections, works] = within(group).getAllByRole("button");
    expect(group.querySelector(".slide-indicator")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(works!);
    expect(currentSearch["view"]).toBe("works");
    view.rerender(<AiWorldsView />);
    expect(screen.queryByRole("navigation", { name: label })).toBeNull();
    expect(works).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(collections!);
    expect(currentSearch["view"]).toBeUndefined();
    view.rerender(<AiWorldsView />);
    expect(screen.getByRole("navigation", { name: label })).toBeInTheDocument();
  });

  it("opens straight on All artworks from the URL, without the tab bar", () => {
    currentSearch = { view: "works" };
    render(<AiWorldsView />);
    expect(screen.queryByRole("navigation", { name: messages.bg.home.worldsJump })).toBeNull();
    expect(screen.getByRole("region", { name: messages.bg.ai.allWorks })).toBeInTheDocument();
  });
});

describe("collection page tab row", () => {
  it.each(LOCALES)("links every collection and marks the current page in %s", (locale) => {
    activeLocale = locale;
    const collections = getAiCollections();
    const collection = collections[1]!;
    render(<AiCollectionView collection={collection} />);
    const nav = screen.getByRole("navigation", { name: messages[locale].ai.allCollections });
    const links = within(nav).getAllByRole("link");
    const prefix = locale === "en" ? "/en" : "";
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      collections.map((c) => `${prefix}/ai-worlds/collections/${c.slug}`),
    );
    expect(links.map((a) => a.textContent)).toEqual(
      collections.map((c) => collectionText(c.shortTitle, locale)),
    );
    expect(links.map((a) => a.getAttribute("aria-current"))).toEqual([null, "page", null, null]);
    // The previous/next cards keep their own navigation.
    expect(
      screen.getByRole("navigation", { name: messages[locale].ai.collections }),
    ).toBeInTheDocument();
    // Header chips: the AI chip and the work count.
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveClass("ai-collection-title");
    expect(screen.getByText(messages[locale].common.aiBadge)).toHaveClass("ai-chip");
  });
});

describe("stage 6 styles", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\r\n/g, "\n");
  const block = css.slice(css.indexOf("/*\n * Redesign stage 6"));

  it("lives in styles.css, where both interaction guards scan it", () => {
    expect(block.length).toBeGreaterThan(1000);
    expect(block).toContain(".collection-tab");
    expect(block).toContain(".slide-indicator");
  });

  it("slides the pill over 360ms on the one easing, and not at all with reduced motion", () => {
    expect(block).toMatch(
      /\[data-indicator="on"\] > \.slide-indicator \{\s*transition:\s*transform 360ms var\(--motion-ease\),\s*width 360ms var\(--motion-ease\)/,
    );
    const reduced = block.slice(block.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(
      /\[data-indicator\] > \.slide-indicator,\s*\.collection-tab \{\s*transition: none;/,
    );
  });

  it("sticks under the measured header and keeps hover inside a fine-pointer query", () => {
    expect(block).toMatch(
      /\.collection-tabs\[data-mode="scroll"\] \{\s*position: sticky;\s*top: var\(--worlds-tabs-top, 65px\);/,
    );
    const outside = block.replace(
      /@media \(hover: hover\)[^{]*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g,
      "",
    );
    expect(outside).not.toMatch(/:hover/);
    for (const rule of block.match(/[^{}]*:active[^{]*\{[^}]*\}/g) ?? [])
      expect(rule).not.toMatch(/scale|translate|rotate/);
  });
});
