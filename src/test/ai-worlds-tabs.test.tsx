// AI Worlds (stage 6 behaviour, stage 6b halls): the sticky collection tab band that follows the
// scroll over the mock's halls, the halls themselves, the view switch and the collection page tabs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiHalls } from "@/components/ai-halls";
import { HALL_GLOW, hallId } from "@/lib/ai-halls";
import { collectionText, getAiCollections, getCollectionWorks } from "@/content/ai-collections";
import { messages } from "@/i18n/messages";
import {
  ACTIVE_LINE,
  TAB_LOCK_IDLE_MS,
  TAB_LOCK_MAX_MS,
  activeSceneIndex,
  tabScrollTarget,
} from "@/lib/world-tabs";
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
  it("defaults to the first hall when every hall is below the line", () => {
    expect(activeSceneIndex([600, 1200, 1800, 2400], line)).toBe(0);
  });
  it("takes the last hall when every hall is above the line", () => {
    expect(activeSceneIndex([-2400, -1800, -1200, -600], line)).toBe(3);
  });
  it("counts a hall exactly on the line as reached", () => {
    expect(activeSceneIndex([-200, line, line + 1, 2000], line)).toBe(1);
  });
  it("handles a single hall and an empty list", () => {
    expect(activeSceneIndex([900], line)).toBe(0);
    expect(activeSceneIndex([-900], line)).toBe(0);
    expect(activeSceneIndex([], line)).toBe(-1);
  });
  it("uses a reading line at 47% of the viewport", () => {
    expect(ACTIVE_LINE).toBe(0.47);
  });
  it("lands a hall just under the header and the tab band", () => {
    expect(tabScrollTarget(2000, 65, 62)).toBe(2000 - 65 - 62 - 8);
    expect(tabScrollTarget(50, 65, 62)).toBe(0);
  });
});

describe("collection halls", () => {
  it("has a BG and EN short name for every collection", () => {
    const collections = getAiCollections();
    expect(collections.map((c) => c.shortTitle.bg)).toEqual([
      "Исторически",
      "Професии",
      "Кино",
      "По света",
    ]);
    expect(collections.map((c) => c.shortTitle.en)).toEqual([
      "Historical",
      "Professions",
      "Cinema",
      "Around the world",
    ]);
  });

  it.each(LOCALES)(
    "shows one hall per collection in data order with its counter, title, three works and link in %s",
    (locale) => {
      activeLocale = locale;
      const m = messages[locale].ai;
      const prefix = locale === "en" ? "/en" : "";
      const { container } = render(<AiHalls />);
      const halls = [...container.querySelectorAll<HTMLElement>("article.ai-hall")];
      const collections = getAiCollections();
      expect(halls).toHaveLength(collections.length);
      halls.forEach((hall, i) => {
        const collection = collections[i]!;
        const works = getCollectionWorks(collection, locale);
        const title = collectionText(collection.title, locale);
        expect(hall.id).toBe(hallId(collection.slug));
        expect(hall).toHaveAccessibleName(title);
        expect(hall.style.getPropertyValue("--glow")).toBe(HALL_GLOW[collection.slug]);
        expect(hall.querySelector(".ai-hall-count")).toHaveTextContent(
          `${String(i + 1).padStart(2, "0")} · ${m.count(works.length)}`,
        );
        expect(within(hall).getByRole("heading", { level: 2 })).toHaveTextContent(title);
        expect(hall.querySelector(".ai-hall-intro")).toHaveTextContent(
          collectionText(collection.intro, locale),
        );
        const shots = [...hall.querySelectorAll<HTMLAnchorElement>("a.ai-hall-shot")];
        expect(shots).toHaveLength(3);
        shots.forEach((shot, k) => {
          const work = works[k]!;
          expect(shot).toHaveAttribute("href", `${prefix}/ai-worlds/${work.slug}`);
          const img = shot.querySelector("img")!;
          expect(img).toHaveAttribute("alt", work.alt);
          expect(img).toHaveAttribute("width");
          expect(img).toHaveAttribute("height");
          expect(img).toHaveAttribute("loading", i === 0 ? "eager" : "lazy");
          expect(shot.querySelector(".ai-hall-cap")).toHaveAttribute("aria-hidden", "true");
        });
        expect(
          within(hall).getByRole("link", { name: `${m.exploreCollection}: ${title}` }),
        ).toHaveAttribute("href", `${prefix}/ai-worlds/collections/${collection.slug}`);
      });
      // No "AI" badge on the hall images (the mock shows none there).
      expect(container.querySelector(".ai-hall .ai-thumb-chip, .ai-hall .ai-chip")).toBeNull();
      expect(container.textContent).not.toMatch(/Закачен скрол|Идея|Idea|Pinned scroll/);
    },
  );

  it("ships every hall visible: no reveal pre-state in the server HTML", () => {
    const html = renderToString(<AiHalls />);
    expect(html.match(/<article/g)).toHaveLength(4);
    expect(html).not.toContain("data-hall-reveal");
  });

  describe("reveal", () => {
    let observers: { callback: IntersectionObserverCallback }[] = [];
    class FakeObserver {
      constructor(readonly callback: IntersectionObserverCallback) {
        observers.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const setup = (reduced: boolean) => {
      observers = [];
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      vi.stubGlobal("IntersectionObserver", FakeObserver);
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
        setTimeout(() => cb(0), 16),
      );
      vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
      vi.spyOn(window, "matchMedia").mockImplementation(
        (query: string) =>
          ({
            matches: query.includes("reduce") ? reduced : false,
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
      );
      const original = HTMLElement.prototype.getBoundingClientRect;
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.hasAttribute("data-hall")) {
          const i = [...this.parentElement!.querySelectorAll("[data-hall]")].indexOf(this);
          return { top: i === 0 ? 100 : 2000 + i * 700, height: 700 } as DOMRect;
        }
        return original.call(this);
      });
    };

    it("hides only the halls below the fold, after mount, until they enter", async () => {
      setup(false);
      const { container } = render(<AiHalls />);
      const halls = [...container.querySelectorAll<HTMLElement>("[data-hall]")];
      expect(halls.every((h) => !h.dataset["hallReveal"])).toBe(true);
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(halls.map((h) => h.dataset["hallReveal"] ?? null)).toEqual([
        null,
        "pending",
        "pending",
        "pending",
      ]);
      const observer = observers.at(-1)!;
      act(() =>
        observer.callback(
          [{ isIntersecting: true, target: halls[1]! } as unknown as IntersectionObserverEntry],
          observer as unknown as IntersectionObserver,
        ),
      );
      expect(halls[1]!.dataset["hallReveal"]).toBe("shown");
    });

    it("shows every hall at once with reduced motion", async () => {
      setup(true);
      const { container } = render(<AiHalls />);
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(container.querySelector("[data-hall-reveal]")).toBeNull();
    });
  });
});

describe("collection tab band", () => {
  it.each(LOCALES)(
    "renders one tab per collection in data order with a nav label in %s",
    (locale) => {
      activeLocale = locale;
      const { container } = render(<AiHalls />);
      const nav = screen.getByRole("navigation", { name: messages[locale].ai.hallsNav });
      expect(container.querySelector(".ai-halls")!.firstElementChild).toBe(nav);
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
      expect(tabs.map((tab) => tab.hasAttribute("data-current"))).toEqual([
        true,
        false,
        false,
        false,
      ]);
    },
  );

  it("ships the first tab as current, painted by itself until the indicator is measured", () => {
    const html = renderToString(<AiHalls />);
    expect(html).toMatch(/aria-current="true"[^>]*data-current=""/);
    expect(html).not.toContain("data-indicator");
    expect(html).toContain('class="slide-indicator"');
  });

  describe("scroll sync and the click lock", () => {
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
      vi.stubGlobal("IntersectionObserver", undefined);
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
        if (this.hasAttribute("data-hall")) {
          const i = [...this.parentElement!.querySelectorAll("[data-hall]")].indexOf(this);
          return { top: docTops[i]! - scrollY, height: 600 } as DOMRect;
        }
        return original.call(this);
      });
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains("ai-tabs-band") ? 62 : 0;
      });
    });

    const renderWithHeader = () => {
      const header = document.createElement("header");
      document.body.prepend(header);
      const view = render(<AiHalls />);
      return { ...view, done: () => header.remove() };
    };
    const tabs = () =>
      within(screen.getByRole("navigation", { name: messages.bg.ai.hallsNav })).getAllByRole(
        "button",
      );
    const current = () => tabs().findIndex((tab) => tab.getAttribute("aria-current") === "true");
    const scrollToY = async (y: number) => {
      scrollY = y;
      window.dispatchEvent(new Event("scroll"));
      await act(() => vi.advanceTimersByTimeAsync(20));
    };

    it("follows the scroll: last hall at or above 47% of the viewport, first at the top", async () => {
      const { done } = renderWithHeader();
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(current()).toBe(0);
      await scrollToY(1600 - 470); // hall 2 reaches the line
      expect(current()).toBe(1);
      await scrollToY(2200 - 471); // one pixel short of hall 3
      expect(current()).toBe(1);
      await scrollToY(9000); // past the last hall
      expect(current()).toBe(3);
      await scrollToY(0); // back to the top
      expect(current()).toBe(0);
      done();
    });

    it("scrolls to a clicked hall, shows it at once and holds it until scrolling is idle", async () => {
      const { done } = renderWithHeader();
      await act(() => vi.advanceTimersByTimeAsync(20));
      fireEvent.click(tabs()[2]!);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 2200 - (65 + 62 + 8), behavior: "smooth" });
      expect(current()).toBe(2);
      // On the way there the geometry says hall 1, but the clicked tab is held.
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
  it.each(LOCALES)("shows the tab band only in the Collections view in %s", (locale) => {
    activeLocale = locale;
    const label = messages[locale].ai.hallsNav;
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
    expect(currentSearch["collection"]).toBeUndefined();
    view.rerender(<AiWorldsView />);
    expect(screen.getByRole("navigation", { name: label })).toBeInTheDocument();
  });

  it("opens straight on All artworks from the URL, without the tab band", () => {
    currentSearch = { view: "works" };
    render(<AiWorldsView />);
    expect(screen.queryByRole("navigation", { name: messages.bg.ai.hallsNav })).toBeNull();
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
    // The previous/next cards keep their own navigation, and the back pill leads to AI Worlds.
    const cards = within(
      screen.getByRole("navigation", { name: messages[locale].ai.collections }),
    ).getAllByRole("link");
    expect(cards.map((a) => a.getAttribute("href"))).toEqual([
      `${prefix}/ai-worlds/collections/${collections[0]!.slug}`,
      `${prefix}/ai-worlds/collections/${collections[2]!.slug}`,
    ]);
    expect(screen.getByRole("link", { name: messages[locale].ai.backToAiWorlds })).toHaveClass(
      "back-pill",
    );
    // Header: the mock's title and the two chips.
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("ai-col-title");
    expect(screen.getByText(messages[locale].common.aiBadge)).toHaveClass("ai-chip--ai");
    expect(screen.getByText(messages[locale].ai.count(16))).toHaveClass("ai-chip");
  });

  it("cycles: the first collection's previous is the last, the last's next is the first", () => {
    activeLocale = "en";
    const collections = getAiCollections();
    for (const [index, prev, next] of [
      [0, collections.length - 1, 1],
      [collections.length - 1, collections.length - 2, 0],
    ] as const) {
      const { unmount } = render(<AiCollectionView collection={collections[index]!} />);
      const cards = within(screen.getByRole("navigation", { name: "Collections" })).getAllByRole(
        "link",
      );
      expect(cards.map((a) => a.getAttribute("href"))).toEqual([
        `/en/ai-worlds/collections/${collections[prev]!.slug}`,
        `/en/ai-worlds/collections/${collections[next]!.slug}`,
      ]);
      unmount();
    }
  });
});

describe("stage 6 and 6b styles", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\r\n/g, "\n");
  const flat = css.replace(/\s+/g, " ");
  const block6 = css.slice(css.indexOf("/*\n * Redesign stage 6 ·"));

  it("keeps the short names on one row of tabs that scrolls instead of wrapping", () => {
    expect(flat).not.toContain(".home-worlds");
    const list = flat.match(/\.collection-tabs-list \{([^}]*)\}/)![1]!;
    expect(list).toContain("display: flex;");
    expect(list).toContain("overflow-x: auto;");
    expect(list).not.toContain("flex-wrap: wrap");
    const tab = flat.match(/\.collection-tab \{([^}]*)\}/)![1]!;
    expect(tab).toContain("min-height: 40px;");
    expect(tab).toContain("white-space: nowrap;");
    expect(tab).toContain("flex: none;");
    // Touch keeps the 44px minimum.
    expect(flat).toContain("@media (pointer: coarse) { .collection-tab { min-height: 44px; } }");
  });

  it("marks the current tab with a cream pill and keeps hover inside a fine-pointer query", () => {
    expect(flat).toContain(
      ".collection-tab[data-current] { box-shadow: none; color: var(--navy); }",
    );
    expect(flat).toContain(
      ".collection-tabs-list:not([data-indicator]) .collection-tab[data-current] { background-color: var(--interaction-cream); }",
    );
    expect(flat).toMatch(/\.slide-indicator \{[^}]*background-color: var\(--interaction-cream\);/);
    const outside = block6.replace(
      /@media \(hover: hover\)[^{]*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g,
      "",
    );
    expect(outside).not.toMatch(/:hover/);
  });

  it("slides the pill over 360ms on the one easing, and not at all with reduced motion", () => {
    expect(block6).toMatch(
      /\[data-indicator="on"\] > \.slide-indicator \{\s*transition:\s*transform 360ms var\(--motion-ease\),\s*width 360ms var\(--motion-ease\)/,
    );
    expect(block6).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\[data-indicator\] > \.slide-indicator,\s*\.collection-tab \{\s*transition: none;/,
    );
  });

  it("sticks the band under the measured header, inside its own block only", () => {
    expect(block6).toMatch(
      /\.collection-tabs \{\s*position: sticky;\s*top: var\(--ai-tabs-top, 65px\);/,
    );
    for (const rule of block6.match(/[^{}]*:active[^{]*\{[^}]*\}/g) ?? [])
      expect(rule).not.toMatch(/scale|translate|rotate/);
  });
});
