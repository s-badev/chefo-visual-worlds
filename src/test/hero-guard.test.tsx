// Guards the homepage Hero and the header that sits on top of it.
// Checks meaning (copy, images, links, header states) rather than full markup snapshots.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site";
import { messages } from "@/i18n/messages";
import { HomeView } from "@/views/home";

let activeLocale: "bg" | "en" = "bg";
let activePath: string | null = null;

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({
      location: { pathname: activePath ?? (activeLocale === "en" ? "/en" : "/"), searchStr: "" },
    }),
}));

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
  LanguageSwitcher: ({ label }: { label: string }) => <div role="group" aria-label={label} />,
}));

vi.mock("@/components/portrait", () => ({ PortraitSwitch: () => <div /> }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  activeLocale = "bg";
  activePath = null;
});

const COPY = {
  bg: {
    eyebrow: "Между кадъра и въображението",
    h1a: "Реални места,",
    h1b: "безкрайни светове.",
    sub: "Фотографии от моите пътувания и\u00a0AI светове, в\u00a0които се озовавам там, където обективът не стига.",
    ctaPhotos: "Разгледай фотографиите",
    ctaAi: "Влез в AI световете",
    home: "CHEFO — Visual Worlds, начало",
  },
  en: {
    eyebrow: "Between the frame and the imagination",
    h1a: "Real places,",
    h1b: "endless worlds.",
    sub: "Photos from my travels and AI worlds, where I end up in places the lens cannot reach.",
    ctaPhotos: "Browse the photos",
    ctaAi: "Enter the AI worlds",
    home: "CHEFO — Visual Worlds, home",
  },
} as const;

/** Minimal IntersectionObserver double: tests decide when the sentinel enters or leaves. */
class SentinelObserver {
  static last: SentinelObserver | null = null;
  target: Element | null = null;
  constructor(readonly callback: IntersectionObserverCallback) {
    SentinelObserver.last = this;
  }
  observe(target: Element) {
    this.target = target;
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    const entry = { isIntersecting, target: this.target } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

describe("homepage Hero", () => {
  it.each(["bg", "en"] as const)(
    "renders one H1 with the localized copy and CTAs in %s",
    (locale) => {
      activeLocale = locale;
      const copy = COPY[locale];
      const m = messages[locale].home;
      expect([m.eyebrow, m.h1a, m.h1b, m.heroSub, m.ctaPhotos, m.ctaAi]).toEqual([
        copy.eyebrow,
        copy.h1a,
        copy.h1b,
        copy.sub,
        copy.ctaPhotos,
        copy.ctaAi,
      ]);

      const { container } = render(<HomeView />);
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      const hero = container.querySelector<HTMLElement>("section.home-hero")!;
      expect(hero).toHaveAttribute("data-header-theme", "dark");
      const h1 = within(hero).getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(`${copy.h1a}${copy.h1b}`);
      expect(h1.querySelector("br")).not.toBeNull();
      expect(h1.querySelector("em")).toHaveTextContent(copy.h1b);
      expect(within(hero).getByText(copy.eyebrow)).toHaveClass("eyebrow");
      expect(hero.querySelector(".home-hero-sub")?.textContent).toBe(copy.sub);

      const prefix = locale === "en" ? "/en" : "";
      const ctas = within(hero).getAllByRole("link");
      expect(ctas.map((a) => a.getAttribute("href"))).toEqual([
        `${prefix}/photography`,
        `${prefix}/ai-worlds`,
      ]);
      expect(ctas[0]).toHaveAccessibleName(copy.ctaPhotos);
      expect(ctas[1]).toHaveAccessibleName(copy.ctaAi);
      expect(ctas.every((cta) => cta.classList.contains("home-hero-button"))).toBe(true);
      expect(ctas[0]!.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(hero.textContent).not.toMatch(/Слънчев бряг|Sunny Beach|2126/);
    },
  );

  it("serves the owner's portrait as the high-priority LCP image with a desktop source", () => {
    const { container } = render(<HomeView />);
    const hero = container.querySelector<HTMLElement>("section.home-hero")!;
    const picture = hero.querySelector("picture")!;
    const desktop = [...picture.querySelectorAll("source")].filter(
      (s) => s.getAttribute("media") === "(min-width: 900px)",
    );
    expect(desktop.map((s) => s.getAttribute("type"))).toEqual(["image/avif", "image/webp"]);
    for (const source of desktop) {
      expect(source.getAttribute("srcset")).toMatch(
        /chefo-hero-desktop-1280\.\w+ 1280w, .*chefo-hero-desktop-1672\.\w+ 1672w/,
      );
    }
    const mobileAvif = [...picture.querySelectorAll("source")].find(
      (s) => !s.hasAttribute("media"),
    )!;
    expect(mobileAvif).toHaveAttribute("type", "image/avif");

    const img = picture.querySelector("img")!;
    expect(hero.querySelectorAll("img")).toHaveLength(1);
    expect(img).toHaveAttribute("src", "/hero/chefo-hero-mobile-941.webp");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).not.toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("width", "941");
    expect(img).toHaveAttribute("height", "1672");
    expect(hero.querySelector("[data-header-sentinel]")).toHaveAttribute("aria-hidden", "true");
  });

  it("only ships optimized derivatives of the hero images", () => {
    const src = readFileSync(path.resolve(__dirname, "../views/home.tsx"), "utf8");
    expect(src).not.toMatch(/hero-(desktop|mobile)\.png/);
    expect(src).not.toMatch(/sunny-beach-(real|ai-future)-hero/);
  });

  it("keeps Bulgarian one-letter words with the following word in the subtitle", () => {
    expect(messages.bg.home.heroSub).toContain("и\u00a0AI");
    expect(messages.bg.home.heroSub).toContain("в\u00a0които");
  });
});

describe("Home hero styles", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");
  const hero = css.slice(css.indexOf("/* * Home hero:"), css.indexOf(".photo-frame-print {"));

  it("switches to the wide layout at 900px and keeps the face side free of gradients", () => {
    expect(hero).toContain("@media (min-width: 900px)");
    expect(hero).toContain("object-position: 40% 50%");
    // The shifted copy gradient fades out at 48% of the width, before the face.
    expect(hero).toContain(
      "to right, oklch(0.21 0.045 262 / 0.7), oklch(0.21 0.045 262 / 0.58) 26%, transparent 48% )",
    );
  });

  it("draws a cream focus ring on the hero buttons and adds no hover or motion of its own", () => {
    expect(hero).toContain(
      ".home-hero .home-hero-button:focus-visible { outline: 2px solid var(--navy-foreground); outline-offset: 2px; }",
    );
    expect(hero).not.toMatch(/:hover|animation|transition/);
  });

  it("uses one Home gutter for the header logo and every Hero copy element", () => {
    expect(css).toContain("--home-gutter: clamp(20px, 5.5vw, 112px)");
    expect(css).toContain(".home-header-row { width: 100%; padding-inline: var(--home-gutter); }");
    expect(css).toMatch(/\.home-hero-content \{ .*padding-inline: var\(--home-gutter\);/);
  });

  it("uses the shared horizontal padding token and one Hero button size contract", () => {
    expect(css).toContain("--btn-pad-x: 28px");
    expect(css).toContain(
      ".home-hero-button { min-height: 52px; padding-block: 0.75rem; padding-inline: var(--btn-pad-x); justify-content: center; border-radius: 6px; font-size: 0.875rem; font-weight: 600; }",
    );
    expect(css).toContain(
      ".interaction-primary, .interaction-secondary { min-height: 44px; align-items: center; justify-content: center; gap: 12px; border-width: 2px; border-style: solid; border-radius: 6px; padding-block: 16px; padding-inline: var(--btn-pad-x); font-weight: 600; }",
    );
  });
});

describe("design tokens used by the Hero and header", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");
  const block = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    return css.slice(start, css.indexOf("\n}", start));
  };
  const root = block(":root");
  const token = (name: string) => root.match(new RegExp(`\\s${name}:\\s*([^;]+);`))?.[1]?.trim();

  it.each([
    ["--background", "oklch(0.965 0.017 85)"],
    ["--foreground", "oklch(0.25 0.05 262)"],
    ["--border", "oklch(0.86 0.025 80)"],
    ["--accent-foreground", "oklch(0.22 0.045 262)"],
    ["--gold", "oklch(0.7 0.095 78)"],
    ["--terracotta", "oklch(0.58 0.13 40)"],
    ["--navy", "oklch(0.21 0.045 262)"],
    ["--navy-foreground", "oklch(0.95 0.018 85)"],
    ["--navy-border", "oklch(0.35 0.04 262)"],
    ["--radius", "0.375rem"],
    ["--shadow-soft", "0 18px 40px -24px oklch(0.21 0.045 262 / 0.45)"],
  ])("keeps %s", (name, value) => {
    expect(token(name)).toBe(value);
  });

  it("keeps the fonts, heading style and eyebrow utility", () => {
    const flat = css.replace(/\s+/g, " ");
    expect(flat).toContain('--font-serif: "Cormorant Garamond", Georgia, serif;');
    expect(flat).toContain('--font-sans: "Manrope", system-ui, sans-serif;');
    expect(flat).toContain(
      "h1, h2, h3 { font-family: var(--font-serif); font-weight: 500; letter-spacing: -0.01em; }",
    );
    expect(flat).toContain(
      "@utility eyebrow { font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600; }",
    );
  });
});

describe("header over the Hero", () => {
  const renderOver = (theme: "dark" | "light") => {
    const marked = document.createElement("section");
    marked.dataset["headerTheme"] = theme;
    document.body.append(marked);
    document.elementsFromPoint = () => [marked];
    const view = render(<SiteHeader />);
    return { ...view, cleanupMarked: () => marked.remove() };
  };

  it("uses the approved navy tone over dark sections", () => {
    activePath = "/photography";
    const { container, cleanupMarked } = renderOver("dark");
    const header = container.querySelector("header")!;
    expect(header).toHaveAttribute("data-theme", "dark");
    expect(header).not.toHaveAttribute("data-transparent");
    for (const cls of ["sticky", "top-0", "bg-navy", "text-navy-foreground", "border-navy-border"])
      expect(header.classList).toContain(cls);
    expect(header.querySelector(".h-16")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: messages.bg.nav.main }).className).toContain(
      "lg:flex",
    );
    expect(screen.getByRole("button", { name: messages.bg.nav.open }).className).toContain(
      "lg:hidden",
    );
    cleanupMarked();
  });

  it("uses the approved cream tone over light sections", async () => {
    activePath = "/photography";
    const { container, cleanupMarked } = renderOver("light");
    await act(async () => {});
    const header = container.querySelector("header")!;
    expect(header).toHaveAttribute("data-theme", "light");
    expect(header.classList).toContain("bg-background");
    cleanupMarked();
  });

  it.each(["bg", "en"] as const)(
    "shows the logo lockup as one labelled home link in %s",
    (locale) => {
      activeLocale = locale;
      activePath = "/photography";
      const { cleanupMarked } = renderOver("dark");
      const lockup = screen.getByRole("link", { name: COPY[locale].home });
      expect(lockup).toHaveAttribute("href", locale === "en" ? "/en/" : "/");
      const icon = lockup.querySelector("img")!;
      expect(icon).toHaveAttribute("src", "/brand/chefo-icon.svg");
      expect(icon).toHaveAttribute("alt", "");
      expect(icon).toHaveAttribute("width", "44");
      expect(icon).toHaveAttribute("height", "44");
      expect(lockup).toHaveClass("min-h-11");
      expect(lockup).toHaveTextContent(/^CHEFO — Visual Worlds$/);
      cleanupMarked();
    },
  );

  it("is transparent over the Home hero at the top and solid once the sentinel leaves", () => {
    vi.stubGlobal("IntersectionObserver", SentinelObserver);
    document.elementsFromPoint = () => [];
    const { container } = render(
      <>
        <SiteHeader />
        <HomeView />
      </>,
    );
    const header = container.querySelector("header")!;
    expect(header.querySelector("[data-home-header-row]")).toHaveClass("home-header-row");
    const observer = SentinelObserver.last!;
    expect(observer.target).toBe(container.querySelector("[data-header-sentinel]"));
    expect(header).toHaveAttribute("data-transparent");
    expect(header).toHaveAttribute("data-theme", "dark");
    expect(header.classList).toContain("bg-transparent");
    expect(header.classList).not.toContain("bg-navy");

    act(() => observer.fire(false));
    expect(header).not.toHaveAttribute("data-transparent");
    expect(header.classList).not.toContain("bg-transparent");

    act(() => observer.fire(true));
    expect(header).toHaveAttribute("data-transparent");
  });

  it("keeps every other route on the solid header", () => {
    vi.stubGlobal("IntersectionObserver", SentinelObserver);
    activePath = "/ai-worlds";
    const { container, cleanupMarked } = renderOver("dark");
    const header = container.querySelector("header")!;
    expect(header).not.toHaveAttribute("data-transparent");
    expect(header.classList).toContain("bg-navy");
    expect(header.classList).not.toContain("bg-transparent");
    cleanupMarked();
  });

  it("turns solid while the mobile menu is open", async () => {
    vi.stubGlobal("IntersectionObserver", SentinelObserver);
    document.elementsFromPoint = () => [];
    const { container } = render(
      <>
        <SiteHeader />
        <HomeView />
      </>,
    );
    const header = container.querySelector("header")!;
    expect(header).toHaveAttribute("data-transparent");
    await act(async () => screen.getByRole("button", { name: messages.bg.nav.open }).click());
    expect(header).not.toHaveAttribute("data-transparent");
    expect(header.classList).toContain("bg-navy");
  });
});
