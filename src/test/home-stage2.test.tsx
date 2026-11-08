// Redesign stage 2 · Home: hero lens/portal buttons, the all-albums stamp row, deck-link pills
// and the About teaser without its button.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeckLink } from "@/components/deck-link";
import { HomeStampRow, STAMP_TILTS } from "@/components/home-stamp-row";
import { getAiCollections, getCollectionCover } from "@/content/ai-collections";
import { albumText, getAlbums } from "@/content/albums";
import { HERO_BUTTON_FOLLOW, heroButtonPointerVars } from "@/hooks/use-hero-button-pointer";
import { messages } from "@/i18n/messages";
import { HomeView } from "@/views/home";

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
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a
      href={`${activeLocale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}`}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/portrait", () => ({ PortraitSwitch: () => <div /> }));

const LOCALES = ["bg", "en"] as const;
const prefix = (locale: "bg" | "en") => (locale === "en" ? "/en" : "");

/** matchMedia double: `fine` answers the fine-pointer query, `reduced` the motion query. */
function media({ fine = false, reduced = false } = {}) {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion")
          ? reduced
          : query.includes("pointer: fine")
            ? fine
            : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

/** Gives the stamp row a measurable overflow (jsdom has no layout). */
function rowSize(scrollWidth: number, clientWidth: number) {
  const pick = (el: Element, value: number) =>
    el.classList.contains("home-stamps-row") ? value : 0;
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return pick(this, scrollWidth);
  });
  vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return pick(this, clientWidth);
  });
}

/** Step buttons by their label; hidden ones have no computed accessible name. */
const stepButton = (label: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  activeLocale = "bg";
});

describe("Home stamp row", () => {
  it.each(LOCALES)("links every album in album order with its real photo count in %s", (locale) => {
    activeLocale = locale;
    render(<HomeView />);
    const nav = screen.getByRole("navigation", { name: messages[locale].home.stampsLabel });
    const section = nav.closest("section")!;
    expect(section).toHaveAttribute("id", "featured-albums");

    const albums = getAlbums();
    expect(albums).toHaveLength(13);
    const items = within(nav).getAllByRole("listitem");
    const links = within(nav).getAllByRole("link");
    expect(items).toHaveLength(albums.length);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      albums.map((album) => `${prefix(locale)}/photography/albums/${album.slug}`),
    );
    for (const [index, album] of albums.entries()) {
      const name = albumText(album.title, locale);
      const count = messages[locale].photos.count(album.photos.length);
      expect(links[index]).toHaveAccessibleName(`${name} ${count}`);
      // The stamp art is decorative; the visible name and count carry the meaning.
      expect(links[index]!.querySelector(".home-stamp-art")).toHaveAttribute("aria-hidden", "true");
      expect(links[index]!.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(items[index]!.style.getPropertyValue("--stamp-tilt")).toBe(
        `${STAMP_TILTS[index % STAMP_TILTS.length]}deg`,
      );
    }
    // It sits after the three featured cards, inside the same section.
    const cards = section.querySelector("#featured-albums > .grid")!;
    expect(cards.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses the approved tilt list, repeating by index", () => {
    expect(STAMP_TILTS).toEqual([-5, 3, -2, 5, -4, 2, -6, 4, -3, 6, -1, 3, -5]);
  });

  it("ships every stamp fully visible in the server HTML", () => {
    const html = renderToString(<HomeStampRow />);
    for (const album of getAlbums()) expect(html).toContain(`/photography/albums/${album.slug}"`);
    expect(html).not.toContain("data-reveal");
    // Both step buttons start hidden: nothing is measured on the server.
    expect(html.match(/<button[^>]*hidden=""/g)).toHaveLength(2);
  });

  it.each(LOCALES)(
    "names the step buttons and hides them when nothing can scroll in %s",
    (locale) => {
      activeLocale = locale;
      media({ fine: true });
      rowSize(800, 800);
      render(<HomeStampRow />);
      const prev = stepButton(messages[locale].home.stampsPrev);
      const next = stepButton(messages[locale].home.stampsNext);
      expect(prev).not.toBeVisible();
      expect(next).not.toBeVisible();
      expect(prev).toHaveAttribute("hidden");
      expect(next).toHaveAttribute("hidden");
    },
  );

  it("shows next (not prev) at the start of an overflowing row for a fine pointer", () => {
    media({ fine: true });
    rowSize(2000, 1000);
    const { container } = render(<HomeStampRow />);
    expect(screen.getByRole("button", { name: messages.bg.home.stampsNext })).not.toHaveAttribute(
      "hidden",
    );
    expect(stepButton(messages.bg.home.stampsPrev)).toHaveAttribute("hidden");
    const wrap = container.querySelector(".home-stamps")!;
    expect(wrap).toHaveAttribute("data-fade-end");
    expect(wrap).not.toHaveAttribute("data-fade-start");
  });

  it("keeps the step buttons hidden on touch (coarse pointer) even when the row overflows", () => {
    media({ fine: false });
    rowSize(2000, 1000);
    const { container } = render(<HomeStampRow />);
    for (const name of [messages.bg.home.stampsPrev, messages.bg.home.stampsNext]) {
      expect(stepButton(name)).toHaveAttribute("hidden");
    }
    // The fade still marks the side that can be swiped.
    expect(container.querySelector(".home-stamps")).toHaveAttribute("data-fade-end");
  });

  it("scrolls by 80% of the row, instantly with reduced motion", () => {
    rowSize(2000, 1000);
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });
    media({ fine: true });
    render(<HomeStampRow />);
    fireEvent.click(screen.getByRole("button", { name: messages.bg.home.stampsNext }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 800, behavior: "smooth" });
    cleanup();
    vi.restoreAllMocks();
    rowSize(2000, 1000);
    media({ fine: true, reduced: true });
    render(<HomeStampRow />);
    fireEvent.click(screen.getByRole("button", { name: messages.bg.home.stampsNext }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 800, behavior: "auto" });
    delete (HTMLElement.prototype as { scrollBy?: unknown }).scrollBy;
  });

  describe("rise-in", () => {
    let observers: {
      callback: IntersectionObserverCallback;
      options?: IntersectionObserverInit | undefined;
    }[] = [];
    class FakeObserver {
      constructor(
        readonly callback: IntersectionObserverCallback,
        readonly options?: IntersectionObserverInit,
      ) {
        observers.push(this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    const setup = (top: number) => {
      observers = [];
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      vi.stubGlobal("IntersectionObserver", FakeObserver);
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
        setTimeout(() => cb(0), 16),
      );
      vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
      vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top } as DOMRect);
    };

    it("hides the cards only after mount for a row below the fold, then reveals them", async () => {
      setup(5000);
      media();
      const { container } = render(<HomeStampRow />);
      const wrap = container.querySelector<HTMLElement>(".home-stamps")!;
      expect(wrap.dataset["reveal"]).toBeUndefined();
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(wrap.dataset["reveal"]).toBe("pending");
      const observer = observers.at(-1)!;
      expect(observer.options?.threshold).toBe(0.3);
      act(() =>
        observer.callback(
          [{ isIntersecting: true, target: wrap } as unknown as IntersectionObserverEntry],
          observer as unknown as IntersectionObserver,
        ),
      );
      expect(wrap.dataset["reveal"]).toBe("shown");
      const delays = Array.from(container.querySelectorAll<HTMLElement>(".home-stamps-item")).map(
        (li) => li.style.getPropertyValue("--stamp-delay"),
      );
      expect(delays.slice(0, 10)).toEqual([
        "0ms",
        "60ms",
        "120ms",
        "180ms",
        "240ms",
        "300ms",
        "360ms",
        "420ms",
        "480ms",
        "480ms",
      ]);
    });

    it("leaves a row already on screen, and any row with reduced motion, as it is", async () => {
      setup(100);
      media();
      const first = render(<HomeStampRow />);
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(first.container.querySelector(".home-stamps")).not.toHaveAttribute("data-reveal");
      first.unmount();

      setup(5000);
      media({ reduced: true });
      const second = render(<HomeStampRow />);
      await act(() => vi.advanceTimersByTimeAsync(20));
      expect(second.container.querySelector(".home-stamps")).not.toHaveAttribute("data-reveal");
    });
  });
});

describe("Deck-link pills", () => {
  it.each(LOCALES)("replace the two plain 'all' links on Home in %s", (locale) => {
    activeLocale = locale;
    const m = messages[locale].home;
    render(<HomeView />);
    const albumsLink = screen.getByRole("link", { name: m.allAlbums(getAlbums().length) });
    const aiLink = screen.getByRole("link", { name: m.allAi });
    expect(albumsLink).toHaveAttribute("href", `${prefix(locale)}/photography`);
    expect(aiLink).toHaveAttribute("href", `${prefix(locale)}/ai-worlds`);
    for (const link of [albumsLink, aiLink]) {
      expect(link).toHaveClass("deck-link");
      expect(link.querySelector(".deck-link-deck")).toHaveAttribute("aria-hidden", "true");
      expect(link.querySelector(".deck-link-arrow")).toHaveAttribute("aria-hidden", "true");
      expect(link.querySelectorAll(".deck-link-item")).toHaveLength(3);
    }
    // Each pill sits in its section header, next to the heading block.
    expect(albumsLink.closest("section")).toHaveAttribute("id", "featured-albums");
    expect(aiLink.closest("section")).toHaveClass("surface-dark");
    const albumsHead = albumsLink.parentElement!;
    expect(within(albumsHead).getByRole("heading", { name: m.photoTitle })).toBeInTheDocument();
    expect(
      within(aiLink.parentElement!).getByRole("heading", { name: m.aiTitle }),
    ).toBeInTheDocument();
  });

  it("uses three different album stamps for albums and the first three collection covers for AI", () => {
    const { container } = render(
      <>
        <DeckLink to="/photography" kind="albums" label="A" />
        <DeckLink to="/ai-worlds" kind="ai" label="B" />
      </>,
    );
    const [albums, ai] = Array.from(container.querySelectorAll(".deck-link"));
    const stamps = albums!.querySelectorAll(".deck-link-item--stamp svg");
    expect(stamps).toHaveLength(3);
    const titles = new Set(Array.from(stamps).map((svg) => svg.textContent));
    expect(titles.size).toBe(3);

    const images = Array.from(ai!.querySelectorAll<HTMLImageElement>(".deck-link-item img"));
    expect(images.map((img) => img.getAttribute("src"))).toEqual(
      getAiCollections()
        .slice(0, 3)
        .map((c) => getCollectionCover(c, "bg")!.image),
    );
    for (const img of images) {
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
      expect(img).toHaveAttribute("decoding", "async");
      expect(img).toHaveAttribute("width", "30");
      expect(img).toHaveAttribute("height", "38");
    }
  });

  it("accepts an items override and names the link by its label only", () => {
    render(
      <DeckLink
        to="/ai-worlds"
        kind="ai"
        label="Label only"
        items={[{ type: "image", key: "x", src: "/x.webp" }]}
      />,
    );
    const link = screen.getByRole("link", { name: "Label only" });
    expect(link.querySelectorAll(".deck-link-item")).toHaveLength(1);
  });
});

describe("Home hero buttons and About teaser", () => {
  it.each(LOCALES)("keeps exactly two hero actions with their names in %s", (locale) => {
    activeLocale = locale;
    const m = messages[locale].home;
    const { container } = render(<HomeView />);
    const hero = container.querySelector<HTMLElement>("section.home-hero")!;
    const actions = within(hero).getAllByRole("link");
    expect(actions).toHaveLength(2);
    expect(actions[0]).toHaveAccessibleName(m.ctaPhotos);
    expect(actions[1]).toHaveAccessibleName(m.ctaAi);
    expect(actions[0]).toHaveClass("home-hero-lens");
    expect(actions[1]).toHaveClass("home-hero-portal");
    for (const action of actions) {
      expect(action.querySelector(".home-hero-arrow")).toHaveAttribute("aria-hidden", "true");
    }
    // No line of extra text under the buttons.
    expect(hero.querySelector(".home-hero-actions")!.nextElementSibling).toBeNull();
  });

  it("maps the pointer to the lens origin (%) and a small follow (px)", () => {
    const rect = { left: 100, top: 50, width: 200, height: 50 };
    expect(heroButtonPointerVars(rect, 200, 75)).toEqual({
      "--mx": "50.0%",
      "--my": "50.0%",
      "--tx": "0.00px",
      "--ty": "0.00px",
    });
    expect(heroButtonPointerVars(rect, 300, 100)).toEqual({
      "--mx": "100.0%",
      "--my": "100.0%",
      "--tx": `${(HERO_BUTTON_FOLLOW.x / 2).toFixed(2)}px`,
      "--ty": `${(HERO_BUTTON_FOLLOW.y / 2).toFixed(2)}px`,
    });
    // Clamped outside the button.
    expect(heroButtonPointerVars(rect, 0, 0)["--mx"]).toBe("0.0%");
  });

  it("follows a fine mouse pointer through CSS variables only, never touch", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    media({ fine: true });
    const { container } = render(<HomeView />);
    const lens = container.querySelector<HTMLElement>(".home-hero-lens")!;
    vi.spyOn(lens, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 50,
    } as DOMRect);
    const move = (pointerType: string, clientX: number) => {
      const event = new MouseEvent("pointermove", { bubbles: true, clientX, clientY: 25 });
      Object.defineProperty(event, "pointerType", { value: pointerType });
      lens.dispatchEvent(event);
    };
    move("touch", 200);
    expect(lens.style.getPropertyValue("--mx")).toBe("");
    move("mouse", 200);
    expect(lens.style.getPropertyValue("--mx")).toBe("100.0%");
    expect(lens.style.getPropertyValue("--tx")).toBe("3.50px");
    lens.dispatchEvent(new MouseEvent("pointerleave"));
    expect(lens.style.getPropertyValue("--tx")).toBe("0px");
  });

  it.each(LOCALES)("shows the About teaser without a link to /about in %s", (locale) => {
    activeLocale = locale;
    render(<HomeView />);
    const about = screen
      .getByRole("heading", { level: 2, name: messages[locale].home.aboutTitle })
      .closest("section")!;
    expect(about.querySelector("a")).toBeNull();
    expect(about.textContent).toContain(messages[locale].home.aboutLead);
    expect("more" in messages[locale].home).toBe(false);
  });
});

describe("stage 2 styles", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\r\n/g, "\n");
  const block = css.slice(css.indexOf("/*\n * Redesign stage 2 · Home hero buttons"));

  /** Every rule of the block with the @media conditions it sits in. */
  function rules(source: string, context: string[] = []) {
    const out: { selector: string; body: string; media: string[] }[] = [];
    let cursor = 0;
    while (cursor < source.length) {
      const open = source.indexOf("{", cursor);
      if (open === -1) break;
      let depth = 1;
      let close = open + 1;
      for (; close < source.length && depth > 0; close += 1) {
        if (source[close] === "{") depth += 1;
        if (source[close] === "}") depth -= 1;
      }
      const selector = source
        .slice(cursor, open)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();
      const body = source.slice(open + 1, close - 1);
      if (selector.startsWith("@media") || selector.startsWith("@supports"))
        out.push(...rules(body, [...context, selector]));
      else if (!selector.startsWith("@")) out.push({ selector, body, media: context });
      cursor = close;
    }
    return out;
  }

  it("lives in styles.css, where both interaction guards scan it", () => {
    expect(block.length).toBeGreaterThan(1000);
    for (const name of [".home-hero-lens", ".home-hero-portal", ".home-stamp", ".deck-link"])
      expect(block).toContain(name);
  });

  it("keeps every hover under a fine, hover-capable pointer", () => {
    const hovers = rules(block).filter((r) => r.selector.includes(":hover"));
    expect(hovers.length).toBeGreaterThan(10);
    for (const r of hovers) {
      expect(
        r.media.some((m) => m.includes("(hover: hover) and (pointer: fine)")),
        r.selector,
      ).toBe(true);
    }
  });

  it("presses without movement and drops transforms and transitions with reduced motion", () => {
    for (const r of rules(block).filter((r) => r.selector.includes(":active")))
      expect(r.body, r.selector).not.toMatch(/scale|translate|rotate|animation/);
    const reduced = rules(block).filter((r) =>
      r.media.some((m) => m.includes("prefers-reduced-motion: reduce")),
    );
    const selectors = reduced.map((r) => r.selector).join(" ");
    for (const name of [
      ".home-hero-lens::before",
      ".home-hero-portal::after",
      ".home-hero-arrow",
      ".home-stamp-art",
      ".deck-link-item",
      ".deck-link-arrow::before",
    ])
      expect(selectors).toContain(name);
    // Motion that moves things is opted into, never on by default for reduced motion.
    for (const r of rules(block).filter((r) =>
      /animation:\s*hero-arrow-fly|translateY\(-6px\)/.test(r.body),
    ))
      expect(
        r.media.some((m) => m.includes("prefers-reduced-motion: no-preference")),
        r.selector,
      ).toBe(true);
  });

  it("paints interactions only with navy, the interaction gold and cream", () => {
    const states = rules(block).filter((r) => /:(hover|focus-visible|active)/.test(r.selector));
    for (const r of states) expect(r.body, r.selector).not.toMatch(/terracotta|#a16a56|eyebrow/i);
  });
});
