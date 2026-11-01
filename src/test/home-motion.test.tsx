// Home motion: hero colour progress and the "Through my lens" card reveal with count-up.
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublishedAlbum } from "@/content/albums";
import { messages } from "@/i18n/messages";
import { HomeView } from "@/views/home";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: "bg", t: messages.bg }) };
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

vi.mock("@/components/portrait", () => ({ PortraitSwitch: () => <div /> }));

let observers: FakeObserver[] = [];
class FakeObserver {
  targets: Element[] = [];
  constructor(readonly callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(el: Element) {
    this.targets.push(el);
  }
  unobserve() {}
  disconnect() {
    this.targets = [];
  }
  fire() {
    this.callback(
      this.targets.map((target) => ({ isIntersecting: true, target }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver,
    );
  }
}

const media = (reduced: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion") ? reduced : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

const counts = () =>
  (["nessebar", "sofia", "sunny-beach"] as const).map((slug) =>
    messages.bg.photos.count(getPublishedAlbum(slug)!.photos.length),
  );

const grid = () =>
  screen
    .getByRole("heading", { name: messages.bg.home.photoTitle })
    .closest("section")!
    .querySelector<HTMLElement>(".grid")!;

const frames = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  observers = [];
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  // Everything starts below the fold.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 5000 } as DOMRect);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Home card reveal and frame count-up", () => {
  it("ships the final counts in the server HTML", () => {
    media(false);
    const html = renderToString(<HomeView />);
    for (const label of counts()) expect(html).toContain(label);
    expect(html).not.toContain("data-cards-reveal");
  });

  it("hides the cards below the fold, then reveals them and counts up to the album totals", async () => {
    media(false);
    render(<HomeView />);
    await frames(20);
    const cards = grid();
    expect(cards.dataset["cardsReveal"]).toBe("pending");
    // Hidden cards still carry the final numbers until they reveal.
    for (const label of counts()) expect(within(cards).getByText(label)).toBeInTheDocument();

    const observer = observers.find((o) => o.targets.includes(cards))!;
    act(() => observer.fire());
    expect(cards.dataset["cardsReveal"]).toBe("shown");
    expect(within(cards).getAllByText(messages.bg.photos.count(0))).toHaveLength(3);

    await frames(500);
    const [first] = within(cards).getAllByText(/кадър/);
    expect(Number.parseInt(first!.textContent!, 10)).toBeGreaterThan(0);

    await frames(1500);
    for (const label of counts()) expect(within(cards).getByText(label)).toBeInTheDocument();
  });

  it("leaves cards and counts untouched with reduced motion", async () => {
    media(true);
    render(<HomeView />);
    await frames(20);
    expect(grid().dataset["cardsReveal"]).toBeUndefined();
    for (const label of counts()) expect(within(grid()).getByText(label)).toBeInTheDocument();
  });
});

describe("Home hero colour progress", () => {
  const hero = () => document.querySelector<HTMLElement>("section.home-hero")!;

  it("writes --hp from the scroll position without re-rendering", async () => {
    media(false);
    render(<HomeView />);
    vi.spyOn(hero(), "getBoundingClientRect").mockReturnValue({ top: 0 } as DOMRect);
    await frames(20);
    expect(hero().style.getPropertyValue("--hp")).toBe("0.0000");

    // Not pinned (matchMedia says no): 45% of the hero height drives the shift.
    Object.defineProperty(hero().querySelector(".home-hero-stage"), "offsetHeight", {
      value: 1000,
    });
    vi.spyOn(hero(), "getBoundingClientRect").mockReturnValue({ top: -450 } as DOMRect);
    window.dispatchEvent(new Event("scroll"));
    await frames(20);
    expect(hero().style.getPropertyValue("--hp")).toBe("1.0000");
  });

  it("keeps --hp at 0 with reduced motion", async () => {
    media(true);
    render(<HomeView />);
    vi.spyOn(hero(), "getBoundingClientRect").mockReturnValue({ top: -450 } as DOMRect);
    window.dispatchEvent(new Event("scroll"));
    await frames(20);
    expect(hero().style.getPropertyValue("--hp")).toBe("0.0000");
  });

  it("keeps the sentinel and header marker on the section and the picture inside the stage", () => {
    media(false);
    render(<HomeView />);
    expect(hero()).toHaveAttribute("data-header-theme", "dark");
    expect(hero().querySelector(":scope > [data-header-sentinel]")).not.toBeNull();
    expect(hero().querySelector(".home-hero-stage > .home-hero-media > picture")).not.toBeNull();
    expect(hero().querySelector(".home-hero-stage > .home-hero-content h1")).not.toBeNull();
  });
});
