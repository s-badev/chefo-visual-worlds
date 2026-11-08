// Redesign stage 9a: the About page and its portrait switch as in the mock (d08 / m40), the
// switch wording of the AI index, and the one animation system of the Home stamp row.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortraitSwitch } from "@/components/portrait";
import { HomeStampRow } from "@/components/home-stamp-row";
import { messages } from "@/i18n/messages";
import { IRIS } from "@/lib/portrait-iris";
import { AboutView } from "@/views/about";
import { AiWorldsView } from "@/views/ai-worlds";

let activeLocale: "bg" | "en" = "bg";
let currentSearch: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useSearch: () => currentSearch,
    useNavigate: () => () => {},
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

const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");
const originalRect = HTMLElement.prototype.getBoundingClientRect;
const originalMatchMedia = window.matchMedia;

afterEach(() => {
  cleanup();
  activeLocale = "bg";
  currentSearch = {};
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  window.matchMedia = originalMatchMedia;
});

const reduceMotion = () => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};

describe("portrait switch (the mock's .pf / .ps)", () => {
  it("writes nothing on the photograph: no badge, tag or caption in the frame", () => {
    const { container } = render(<PortraitSwitch aiImage="/ai.webp" />);
    const frame = container.querySelector<HTMLElement>("[data-portrait-frame]")!;
    // Only the two images (and, after a press, the decorative ring) live in the frame.
    expect(frame.textContent).toBe("");
    expect(frame.querySelectorAll("img")).toHaveLength(2);
    expect(frame.querySelector(".eyebrow, [class*='badge'], [class*='tag']")).toBeNull();
    expect(within(frame).queryByText(messages.bg.common.aiBadge)).toBeNull();
  });

  it("opens the circle from 75% before any press, then from under the pressed button", () => {
    const { container } = render(<PortraitSwitch aiImage="/ai.webp" />);
    const frame = container.querySelector<HTMLElement>("[data-portrait-frame]")!;
    expect(IRIS.originX).toBe(75);
    expect(frame.style.getPropertyValue("--iris-x")).toBe("75%");
    // Frame 400px wide at x=100; the AI button centre at x=300 -> 50%.
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const box = (left: number, width: number) =>
        ({
          left,
          width,
          top: 0,
          height: 40,
          right: left + width,
          bottom: 40,
          x: left,
          y: 0,
        }) as DOMRect;
      if (this.hasAttribute("data-portrait-frame")) return box(100, 400);
      if (this.textContent === messages.bg.portrait.ai) return box(260, 80);
      return box(0, 0);
    };
    const ai = screen.getByRole("button", { name: messages.bg.portrait.ai });
    fireEvent.click(ai);
    expect(frame.style.getPropertyValue("--iris-x")).toBe("50%");
    expect(ai).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: messages.bg.portrait.real })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(container.querySelectorAll(".portrait-iris-ring")).toHaveLength(1);
  });

  it("switches at once without the ring under reduced motion", () => {
    reduceMotion();
    const { container } = render(<PortraitSwitch aiImage="/ai.webp" />);
    fireEvent.click(screen.getByRole("button", { name: messages.bg.portrait.ai }));
    expect(container.querySelector(".portrait-iris-ring")).toBeNull();
    expect(screen.getByRole("button", { name: messages.bg.portrait.ai })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("paints the mock's frame, switch and thin ring", () => {
    expect(css).toContain(
      ".portrait-frame { position: relative; aspect-ratio: 4 / 5; overflow: hidden; border-radius: 3px; background-color: #efe6d4; box-shadow: 0 0 0 6px #fbf7ee, 0 0 0 7px rgb(22 33 58 / 0.14), 0 30px 50px -36px rgb(22 33 58 / 0.6); }",
    );
    expect(css).toContain(
      ".portrait-toggle { display: inline-flex; margin-top: 18px; padding: 4px; border-radius: 999px;",
    );
    expect(css).toContain(
      '.portrait-toggle-button[aria-pressed="true"] { background-color: #16213a; color: #f4eee2; }',
    );
    expect(css).toContain("box-shadow: 0 0 0 1.5px var(--interaction-gold);");
    expect(css).toMatch(
      /@media \(pointer: coarse\) \{ \.portrait-toggle-button \{ min-height: 44px;/,
    );
  });
});

describe.each(["bg", "en"] as const)("About page (%s)", (locale) => {
  it("keeps the approved texts and ends with the two ways into the site", () => {
    activeLocale = locale;
    const t = messages[locale];
    render(<AboutView />);
    expect(screen.getByRole("heading", { level: 1, name: t.about.title })).toBeInTheDocument();
    expect(screen.getByText(t.about.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(t.about.quote).tagName).toBe("BLOCKQUOTE");
    for (const p of [t.about.p1, t.about.p2, t.about.p3])
      expect(screen.getByText(p)).toBeInTheDocument();
    const photos = screen.getByRole("link", { name: t.home.ctaPhotos });
    const ai = screen.getByRole("link", { name: t.home.ctaAi });
    expect(photos).toHaveAttribute("href", "/photography");
    expect(ai).toHaveAttribute("href", "/ai-worlds");
    expect(photos).toHaveClass("about-page-cta", "about-page-cta--solid");
    expect(ai).toHaveClass("about-page-cta", "about-page-cta--line");
    expect(screen.queryByRole("heading", { name: t.about.howTitle })).toBeNull();
    expect(screen.getByRole("group", { name: t.portrait.group })).toBeInTheDocument();
  });
});

describe("About layout and buttons", () => {
  it("uses the mock's two columns, its top padding and its pills", () => {
    expect(css).toContain(
      ".about-page { padding-block: calc(var(--site-header-h) + 40px) clamp(64px, 9vw, 120px);",
    );
    expect(css).toContain("grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);");
    expect(css).toMatch(
      /@media \(max-width: 899px\) \{ \.about-page-grid \{ grid-template-columns: minmax\(0, 1fr\); \} \.about-page-portrait \{ width: 100%; max-width: 440px; \} \}/,
    );
    expect(css).toContain(
      ".about-page-cta { position: relative; isolation: isolate; display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 0 22px;",
    );
    for (const rule of css.match(/[^{}]*:active[^{]*\{[^}]*\}/g) ?? [])
      expect(rule).not.toMatch(/scale|translate|rotate/);
  });
});

describe.each([
  ["bg", "Всички творби"],
  ["en", "All works"],
] as const)("AI index view switch (%s)", (locale, label) => {
  it("uses the mock's wording", () => {
    activeLocale = locale;
    render(<AiWorldsView />);
    const group = screen.getByRole("group", { name: messages[locale].ai.view });
    const tabs = within(group).getAllByRole("button");
    expect(tabs.map((tab) => tab.textContent)).toEqual([messages[locale].ai.collections, label]);
    expect(messages[locale].ai.allWorks).toBe(label);
  });
});

describe("Home stamp row", () => {
  it("animates with its own attribute only, never the global reveal", async () => {
    const io: { cb?: IntersectionObserverCallback } = {};
    class IO {
      constructor(cb: IntersectionObserverCallback) {
        io.cb = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    }
    const original = window.IntersectionObserver;
    Object.defineProperty(window, "IntersectionObserver", { value: IO, configurable: true });
    const innerHeight = window.innerHeight;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { top: innerHeight + 400, left: 0, width: 100, height: 100 } as DOMRect;
    };
    const { container } = render(<HomeStampRow />);
    const wrap = container.querySelector<HTMLElement>(".home-stamps")!;
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
    expect(wrap).toHaveAttribute("data-stamps-reveal", "pending");
    act(() =>
      io.cb?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver),
    );
    expect(wrap).toHaveAttribute("data-stamps-reveal", "shown");
    expect(container.querySelector("[data-reveal]")).toBeNull();
    Object.defineProperty(window, "IntersectionObserver", { value: original, configurable: true });

    // The mock's timing: the row rises 18px over 700ms, each stamp lands in 640ms from 12px lower
    // and 1.18 times larger, and no rule of the global reveal targets the row.
    expect(css).toContain(
      '.home-stamps[data-stamps-reveal="pending"] { opacity: 0.001; transform: translateY(18px); }',
    );
    expect(css).toContain("animation: home-stamp-rise 640ms var(--motion-ease) backwards;");
    expect(css).toContain("transform: translateY(12px) scale(1.18);");
    expect(css).not.toMatch(/\.home-stamps\[data-reveal/);
    expect(renderToString(<HomeStampRow />)).not.toContain("reveal");
  });
});
