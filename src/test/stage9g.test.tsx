// Stage 9g: the About portrait alignment, the header on dark pages, the tab band at rest and
// stuck, the pill states (hover, press) and the back-to-top filled state.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { getAiWork } from "@/content/ai-works";
import { BackToTop } from "@/components/back-to-top";
import { CollectionTabs } from "@/components/collection-tabs";
import { PortraitSwitch } from "@/components/portrait";
import { AiDetailView } from "@/views/ai-worlds";
import { getInitialHeaderTheme } from "@/components/header-theme";
import { BACK_TO_TOP } from "@/lib/back-to-top";

let activeLocale: "bg" | "en" = "bg";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
    useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
      select({ location: { pathname: "/ai-worlds", searchStr: "" }, matches: [] }),
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
    <a href={slug ? to.replace("$slug", slug) : to} className={className} {...rest}>
      {children}
    </a>
  ),
  LanguageSwitcher: ({ label }: { label: string }) => <div role="group" aria-label={label} />,
}));

const rawCss = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");
const css = rawCss.replace(/\s+/g, " ");
/** The stage 9g block only (everything after its marker). */
const block = css.slice(css.indexOf("/* ==== Stage 9g"));

/** Every rule body for an exact selector list in the 9g block, in source order. */
function rules(selector: string): string[] {
  const out: string[] = [];
  const needle = `${selector} {`;
  let i = block.indexOf(needle);
  while (i !== -1) {
    const before = block[i - 1];
    if (before === " " || before === "}" || before === "/") {
      out.push(block.slice(i + needle.length, block.indexOf("}", i)).trim());
    }
    i = block.indexOf(needle, i + 1);
  }
  return out;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  activeLocale = "bg";
});

describe("9G.1 · the AI portrait keeps the head where the real photo has it", () => {
  // Stage 9j: crop the original real photograph and align the wider AI file to it.
  // Both files are 1080 by 1350; the measured overlay needs no CSS compensation.
  const real = { eye: [0.52, 0.351463], iod: 0.1961 };
  const ai = { eye: [0.517414, 0.348132], iod: 0.198039 };
  const read = (name: string) => {
    const m = css.match(new RegExp(`--about-ai-${name}: (-?[\\d.]+)(%?);`));
    if (!m) throw new Error(`--about-ai-${name} missing`);
    return Number(m[1]) / (m[2] === "%" ? 100 : 1);
  };

  it("holds the three alignment values in one block that a regenerated picture resets", () => {
    expect(block).toContain(":root { --about-ai-scale: 1; --about-ai-x: 0%; --about-ai-y: 0%; }");
  });

  it("puts the AI eye line and eye distance on the real photo's, within 2% of the frame height", () => {
    const [s, x, y] = [read("scale"), read("x"), read("y")];
    // Eye line: |scaled AI eye height - real eye height| <= 0.02 of the frame height.
    expect(Math.abs(s * ai.eye[1]! + y - real.eye[1]!)).toBeLessThanOrEqual(0.02);
    // Eye distance (frame width 4/5 of its height): the shares are in width units.
    expect(Math.abs(s * ai.iod - real.iod) * (5 / 4)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(s * ai.eye[0]! + x - real.eye[0]!)).toBeLessThanOrEqual(0.02);
  });

  it("never exposes an empty edge", () => {
    const [s, x, y] = [read("scale"), read("x"), read("y")];
    expect(x).toBeLessThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(0);
    expect(x + s).toBeGreaterThanOrEqual(1);
    expect(y + s).toBeGreaterThanOrEqual(1);
  });

  it("needs no CSS transform on either portrait", () => {
    expect(rules(".portrait-iris .portrait-img")).toEqual([]);
    // Neither picture is transformed: alignment belongs to the new image file.
    const others = css.match(/[^{}]*\.portrait-img[^{}]*\{[^}]*\}/g) ?? [];
    for (const rule of others) {
      if (rule.includes(".portrait-iris .portrait-img")) continue;
      expect(rule).not.toMatch(/transform/);
    }
    const { container } = render(<PortraitSwitch />);
    const frame = container.querySelector("[data-portrait-frame]")!;
    const real = frame.querySelector(":scope > img.portrait-img")!;
    const ai = frame.querySelector(":scope > .portrait-iris img.portrait-img")!;
    expect(real).not.toBeNull();
    expect(ai).not.toBeNull();
    expect(real.closest(".portrait-iris")).toBeNull();
    expect(rawCss).toMatch(/\.portrait-frame \{[^}]*overflow: hidden;/);
  });
});

describe("9G.2 · the header is navy at the top of every dark page", () => {
  it("is the page navy at rest and the glass once scrolled", () => {
    expect(rules('header[data-theme="dark"]:not([data-transparent]):not([data-scrolled])')).toEqual(
      ["background-color: rgb(12 23 41);"],
    );
    // The glass for the scrolled state is untouched.
    expect(css).toContain(
      'header[data-theme="dark"]:not([data-transparent]) { background-color: rgb(12 23 41 / 0.72);',
    );
  });

  it("treats an artwork page as dark, like the collection pages", () => {
    expect(getInitialHeaderTheme("/ai-worlds/guardian-of-the-time-portal")).toBe("dark");
    expect(getInitialHeaderTheme("/en/ai-worlds/collections/cinema-archetypes")).toBe("dark");
    const raw = getAiWork("guardian-of-the-time-portal")!;
    const { container } = render(<AiDetailView work={raw} />);
    const marked = [...container.querySelectorAll("[data-header-theme]")];
    expect(marked.length).toBeGreaterThan(0);
    for (const el of marked) expect(el).toHaveAttribute("data-header-theme", "dark");
  });
});

/** A minimal IntersectionObserver that lets a test deliver entries. */
class FakeObserver {
  static all: FakeObserver[] = [];
  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit,
  ) {
    FakeObserver.all.push(this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
  fire(entry: Partial<IntersectionObserverEntry>) {
    this.callback([entry as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

describe("9G.3 · the tab band at rest and stuck", () => {
  beforeEach(() => {
    FakeObserver.all = [];
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });

  it("starts at rest and becomes stuck when its top edge sits on the sticky line", () => {
    const { container } = render(
      <CollectionTabs mode="scroll" label="Tabs" active={0} onSelect={() => {}} />,
    );
    const nav = container.querySelector("nav.collection-tabs")!;
    expect(nav).not.toHaveAttribute("data-stuck");
    const observer = FakeObserver.all.at(-1)!;
    // The only threshold is "fully inside"; the top margin is the sticky offset plus one pixel.
    expect(observer.options.threshold).toEqual([1]);
    expect(observer.options.rootMargin).toMatch(/^-\d+px 0px 0px 0px$/);
    // Lower on the page, cut off at the bottom of the screen: still at rest.
    act(() =>
      observer.fire({
        intersectionRatio: 0.4,
        boundingClientRect: { top: 800 } as DOMRectReadOnly,
      }),
    );
    expect(nav).not.toHaveAttribute("data-stuck");
    // Resting on the sticky line (one pixel outside the shrunken root): stuck.
    act(() =>
      observer.fire({
        intersectionRatio: 0.98,
        boundingClientRect: { top: 0 } as DOMRectReadOnly,
      }),
    );
    expect(nav).toHaveAttribute("data-stuck");
    act(() =>
      observer.fire({
        intersectionRatio: 1,
        boundingClientRect: { top: 300 } as DOMRectReadOnly,
      }),
    );
    expect(nav).not.toHaveAttribute("data-stuck");
  });

  it("keeps the server render at rest and the aria-current behaviour", () => {
    const { container } = render(
      <CollectionTabs mode="scroll" label="Tabs" active={2} onSelect={() => {}} />,
    );
    expect(container.querySelector("nav")).not.toHaveAttribute("data-stuck");
    const current = container.querySelector('[aria-current="true"]')!;
    expect(current).toHaveAttribute("data-current");
  });

  it("has no fill, no hairlines and no blur at rest; glass with one hairline when stuck", () => {
    const rest = rules(
      '.collection-tabs, .collection-tabs[data-mode="links"], .ai-index .ai-tabs-band',
    );
    // The same selector list appears again in the reduced-motion block (transition: none).
    expect(rest).toHaveLength(2);
    expect(rest[1]).toBe("transition: none;");
    expect(rest[0]).toContain("border-block: 0;");
    expect(rest[0]).toContain("background-color: transparent;");
    expect(rest[0]).toContain("box-shadow: none;");
    expect(rest[0]).toContain("backdrop-filter: none;");
    const stuck = rules(
      '.collection-tabs[data-stuck], .collection-tabs[data-mode="links"][data-stuck], .ai-index .ai-tabs-band[data-stuck]',
    );
    expect(stuck[0]).toContain("background-color: rgb(12 23 41 / 0.62);");
    expect(stuck[0]).toContain("box-shadow: 0 1px 0 rgb(246 240 228 / 0.16);");
    expect(stuck[0]).toContain("backdrop-filter: blur(14px) saturate(1.12);");
    expect(block).toMatch(
      /@supports not \(backdrop-filter: blur\(1px\)\) \{[^@]*background-color: rgb\(12 23 41 \/ 0\.92\);/,
    );
    expect(block).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \.collection-tabs,[^}]*\{ transition: none; \}/,
    );
  });

  it("gives each inactive pill its own navy fill, never the band", () => {
    expect(rules(".collection-tabs .collection-tab:not([data-current])")).toEqual([
      "background-color: var(--tab-pill-fill);",
    ]);
    expect(block).toContain(":root { --tab-pill-fill: rgb(12 23 41 / 0.62); }");
  });
});

describe("9G.5 · selection pills: quiet hover, clean press", () => {
  const DARK = [".ai-view-switch-tab", ".collection-tab", ".ai-filter"];
  const LIGHT = [".photo-seg-link", ".photo-chip", ".portrait-toggle-button"];

  it("hovers dark pills with a cream tint, a 35% cream border and full cream text", () => {
    for (const [selector, body] of [
      [
        '.ai-view-switch-tab:not([aria-pressed="true"]):hover, .ai-filter:not([aria-pressed="true"]):hover',
        "background-color: rgb(244 238 226 / 0.12); box-shadow: inset 0 0 0 1px rgb(244 238 226 / 0.35); color: #f4eee2;",
      ],
      [
        ".collection-tabs .collection-tab:not([data-current]):hover",
        "background-image: linear-gradient(rgb(244 238 226 / 0.12), rgb(244 238 226 / 0.12)); box-shadow: inset 0 0 0 1px rgb(244 238 226 / 0.35); color: #f4eee2;",
      ],
    ] as const) {
      const hover = block.match(
        new RegExp(
          `@media \\(hover: hover\\) and \\(pointer: fine\\) \\{[^@]*?${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`,
        ),
      );
      expect(hover, selector).not.toBeNull();
      expect(hover![1]!.trim()).toBe(body);
    }
  });

  it("hovers cream-surface pills with a navy tint, a 25% navy border and full navy text", () => {
    const hover = block.match(
      /@media \(hover: hover\) and \(pointer: fine\) \{ \.photo-seg-link:not\(\[aria-current="page"\]\):hover,[^{]*\{([^}]*)\}/,
    );
    expect(hover![1]!.trim()).toBe(
      "background-color: rgb(22 33 58 / 0.07); box-shadow: inset 0 0 0 1px rgb(22 33 58 / 0.25); color: var(--navy);",
    );
  });

  it("shows the selected look at once on press: no transition, no gold, no movement", () => {
    const pressed = [
      '.ai-view-switch .ai-view-switch-tab:not([aria-pressed="true"]):active, .ai-view-switch[data-indicator] .ai-view-switch-tab:not([aria-pressed="true"]):active, .collection-tabs .collection-tab:not([data-current]):active, .collection-tab:not([data-current]):active, .ai-filter:not([aria-pressed="true"]):active',
    ];
    const [dark] = rules(pressed[0]!);
    expect(dark).toBe(
      "background-color: var(--interaction-cream); background-image: none; box-shadow: none; color: var(--navy); transition: none;",
    );
    const [light] = rules(
      '.photo-seg-link:not([aria-current="page"]):active, .photo-chip:not([aria-pressed="true"]):active, .portrait-toggle-button[aria-pressed="false"]:active',
    );
    expect(light).toBe(
      "background-color: var(--navy); box-shadow: none; color: #f4eee2; transition: none;",
    );
    for (const body of [dark, light]) {
      expect(body).not.toMatch(/201 164 107|btn-active|interaction-gold|b8935a|scale|translate/i);
    }
  });

  it("presses the selected pill without changing it", () => {
    const [selected] = rules(
      '.ai-view-switch .ai-view-switch-tab[aria-pressed="true"]:active, .ai-view-switch[data-indicator] .ai-view-switch-tab[aria-pressed="true"]:active',
    );
    expect(selected).toBe("background-color: var(--interaction-cream); color: var(--navy);");
  });

  it("covers every audited pill with the 180ms transition on the one easing", () => {
    const [shared] = rules(
      ".ai-view-switch-tab, .collection-tab, .ai-filter, .photo-seg-link, .photo-chip, .portrait-toggle-button",
    );
    expect(shared).toBe(
      "transition: background-color 180ms var(--motion-ease), box-shadow 180ms var(--motion-ease), color 180ms var(--motion-ease);",
    );
    expect([...DARK, ...LIGHT]).toHaveLength(6);
  });

  it("no :active rule of the stylesheet paints the brown --btn-active-bg on an audited pill", () => {
    // The shared rule still serves the buttons that are not selection pills; the audited pills
    // are overridden by the 9g rules above (more specific and later), checked by their bodies.
    const shared = css.match(/\.interaction-primary:active, [^{]*\{[^}]*\}/)?.[0] ?? "";
    expect(shared).toContain("--btn-active-bg");
    expect(shared).toContain(".ai-view-switch-tab:active");
  });
});

describe("9G.6 · back to top: the filled state", () => {
  const setScroll = (progress: number) => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 3000,
    });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 2000 * progress });
  };
  afterEach(() => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 0,
    });
  });

  it("marks the complete state from 99% of the page", async () => {
    expect(BACK_TO_TOP.completeAt).toBe(0.99);
    setScroll(0.98);
    render(<BackToTop />);
    const button = document.querySelector<HTMLButtonElement>(".back-to-top")!;
    expect(button).not.toHaveAttribute("data-complete");
    setScroll(0.99);
    fireEvent.scroll(window);
    await vi.waitFor(() => expect(button).toHaveAttribute("data-complete"));
    setScroll(0.5);
    fireEvent.scroll(window);
    await vi.waitFor(() => expect(button).not.toHaveAttribute("data-complete"));
  });

  it("is a plain gold disc with a navy arrow and no ring when complete, hovered or focused", () => {
    expect(rules(".back-to-top[data-complete], .back-to-top:focus-visible")).toEqual([
      "background-color: var(--btn-hover-bg); color: var(--navy);",
    ]);
    expect(block).toContain(
      "@media (hover: hover) and (pointer: fine) { .back-to-top:hover { background-color: var(--btn-hover-bg); color: var(--navy); }",
    );
    expect(
      rules(
        ".back-to-top[data-complete] .back-to-top-ring, .back-to-top:focus-visible .back-to-top-ring",
      ),
    ).toEqual(["opacity: 0;"]);
    expect(
      rules(".back-to-top[data-complete]::before, .back-to-top:focus-visible::before"),
    ).toEqual(["opacity: 0;"]);
    // Pressed is a colour change only.
    const [pressed] = rules(".back-to-top[data-complete]:active, .back-to-top:active");
    expect(pressed).toBe("background-color: var(--btn-active-bg); color: var(--navy);");
    expect(pressed).not.toMatch(/scale|translate/);
    expect(block).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \.back-to-top-ring \{ transition: none; \} \}/,
    );
  });
});

describe("9G.4 · nothing light above the header", () => {
  it("keeps the flush top of the page: a navy canvas, the header pinned to 0, the cover under it", () => {
    expect(css).toContain("html { background-color: var(--navy); }");
    expect(css).toContain("body > header.sticky { top: 0; inset-block-start: 0; }");
    expect(css).toContain(".home-hero { margin-top: calc(-1 * var(--site-header-h)); }");
    expect(css).toMatch(/\.album-hero \{[^}]*margin-top: calc\(-1 \* var\(--site-header-h\)\);/);
  });
});
