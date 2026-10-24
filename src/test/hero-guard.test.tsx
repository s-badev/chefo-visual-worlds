// Guards the approved homepage Hero and the header that sits on top of it.
// Checks meaning (copy, images, links, frozen tokens) rather than full markup snapshots.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublishedAlbum } from "@/content/albums";
import { getPhoto } from "@/content/photos";
import { SiteHeader } from "@/components/site";
import { messages } from "@/i18n/messages";
import { HomeView } from "@/views/home";

const heroPhoto = "/hero/sunny-beach-real-hero.webp";
const heroAi = "/hero/sunny-beach-ai-future-hero-v2.webp";
const heroPhotoSource = "/photos/sunny-beach/coastal-sunset-over-the-lit-town.webp";

let activeLocale: "bg" | "en" = "bg";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: activeLocale === "en" ? "/en" : "/", searchStr: "" } }),
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
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a
      href={`${activeLocale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}`}
      className={className}
    >
      {children}
    </a>
  ),
  LanguageSwitcher: ({ label }: { label: string }) => <div role="group" aria-label={label} />,
}));

vi.mock("@/components/portrait", () => ({ PortraitSwitch: () => <div /> }));

afterEach(() => {
  cleanup();
  activeLocale = "bg";
});

const FROZEN_COPY = {
  bg: {
    eyebrow: "Мобилна фотография × AI визии",
    h1a: "Реални места, ",
    h1b: "безкрайни светове.",
    heroPhotoAlt: "Залез над морето с вълни и осветения Слънчев бряг",
    heroPhotoBadge: "СЛЪНЧЕВ БРЯГ",
    heroAiAlt:
      "Футуристична AI визия на крайбрежието на Слънчев бряг с осветени кули, мостове и яхти",
    ctaPhotos: "Разгледай фотографиите",
    ctaAi: "Виж AI световете",
    heroAiBadge: "AI ГЕНЕРИРАНО",
  },
  en: {
    eyebrow: "Mobile photography × AI visions",
    h1a: "Real places, ",
    h1b: "endless worlds.",
    heroPhotoAlt: "Sunset over the sea with waves and the illuminated Sunny Beach skyline",
    heroPhotoBadge: "SUNNY BEACH",
    heroAiAlt:
      "Futuristic AI vision of the Sunny Beach coastline with illuminated towers, bridges and yachts",
    ctaPhotos: "Explore the photography",
    ctaAi: "See the AI worlds",
    heroAiBadge: "AI GENERATED",
  },
} as const;

describe("homepage Hero (approved, frozen)", () => {
  it.each(["bg", "en"] as const)("keeps its copy, images and CTAs in %s", (locale) => {
    activeLocale = locale;
    const copy = FROZEN_COPY[locale];
    const m = messages[locale].home;
    expect({
      eyebrow: m.eyebrow,
      h1a: m.h1a,
      h1b: m.h1b,
      heroPhotoAlt: m.heroPhotoAlt,
      heroPhotoBadge: m.heroPhotoBadge,
      heroAiAlt: m.heroAiAlt,
      ctaPhotos: m.ctaPhotos,
      ctaAi: m.ctaAi,
      heroAiBadge: m.heroAiBadge,
    }).toEqual(copy);

    const { container } = render(<HomeView />);
    const hero = container.querySelector("section")!;
    expect(hero).toHaveAttribute("data-header-theme", "dark");

    const h1 = within(hero).getByRole("heading", { level: 1 });
    expect(within(hero).getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(h1).toHaveTextContent(`${copy.h1a}${copy.h1b}`);
    expect(h1.querySelector("em")).toHaveTextContent(copy.h1b);
    expect(within(hero).getByText(copy.eyebrow)).toBeInTheDocument();
    expect(hero.querySelector("[data-hero-copy]")).not.toBeNull();
    expect(hero.querySelectorAll("[data-hero-scrim]")).toHaveLength(3);
    for (const scrim of hero.querySelectorAll("[data-hero-scrim]")) {
      expect(scrim).toHaveAttribute("aria-hidden", "true");
    }

    const images = Array.from(hero.querySelectorAll("img"));
    expect(images).toHaveLength(2);
    expect(images.map((img) => [img.getAttribute("src"), img.getAttribute("alt")])).toEqual([
      [heroPhoto, copy.heroPhotoAlt],
      [heroAi, copy.heroAiAlt],
    ]);
    expect(getPhoto("coastal-sunset-over-the-lit-town")?.image).toBe(heroPhotoSource);
    expect(
      getPublishedAlbum("sunny-beach")?.photos.some(
        ({ photoSlug }) => photoSlug === "coastal-sunset-over-the-lit-town",
      ),
    ).toBe(true);
    for (const image of images) {
      expect(image).toHaveAttribute("width", "936");
      expect(image).toHaveAttribute("height", "1053");
      expect(image).toHaveAttribute("loading", "eager");
      expect(image).toHaveAttribute("fetchpriority", "high");
      expect(image.className).toContain("object-cover");
      expect(image.className).toContain("object-top");
    }
    expect(
      images.map((image) => image.closest("[data-hero-panel]")?.getAttribute("data-hero-panel")),
    ).toEqual(["real", "future"]);

    expect(within(hero).getByText(copy.heroPhotoBadge)).toBeInTheDocument();
    expect(within(hero).getByText(copy.heroAiBadge)).toBeInTheDocument();
    expect(hero.querySelector("[data-hero-separator]")).toHaveAttribute("aria-hidden", "true");
    expect(hero.querySelector("[data-hero-mobile-separator]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(hero.textContent).not.toMatch(/\b(?:2025|2026|2126)\b/);
    expect(images.map((image) => image.getAttribute("src"))).not.toContain(
      "/src/assets/ai-knight.png",
    );

    const prefix = locale === "en" ? "/en" : "";
    // Two semantic links, named by the localized label only (the Gold Glow overlay is decorative).
    expect(hero.querySelectorAll("a")).toHaveLength(2);
    const ctas = within(hero).getAllByRole("link");
    expect(ctas).toHaveLength(2);
    expect(ctas.map((a) => a.getAttribute("href"))).toEqual([
      `${prefix}/photography`,
      `${prefix}/ai-worlds`,
    ]);
    expect(ctas[0]).toHaveAccessibleName(copy.ctaPhotos);
    expect(ctas[1]).toHaveAccessibleName(copy.ctaAi);
    expect(within(hero).getByRole("link", { name: copy.ctaPhotos })).toBe(ctas[0]);
    expect(within(hero).getByRole("link", { name: copy.ctaAi })).toBe(ctas[1]);
    expect(
      ctas.map((a) => a.closest("[data-hero-panel]")?.getAttribute("data-hero-panel")),
    ).toEqual(["real", "future"]);
    expect(ctas[0]).toHaveClass("hero-cta", "hero-cta--print");
    expect(ctas[1]).toHaveClass("hero-cta", "hero-cta--glow");
    for (const [cta, label, overlays] of [
      [ctas[0]!, copy.ctaPhotos, 0],
      [ctas[1]!, copy.ctaAi, 1],
    ] as const) {
      const faces = Array.from(cta.querySelectorAll(".hero-cta-face"));
      expect(faces).toHaveLength(1 + overlays);
      expect(faces.filter((f) => !f.closest("[aria-hidden='true']"))).toHaveLength(1);
      for (const face of faces) expect(face.textContent).toBe(label);
      const overlay = cta.querySelectorAll(".hero-cta-overlay");
      expect(overlay).toHaveLength(overlays);
      for (const o of overlay) expect(o).toHaveAttribute("aria-hidden", "true");
      const icons = cta.querySelectorAll("svg");
      expect(icons).toHaveLength(faces.length);
      for (const icon of icons) expect(icon).toHaveAttribute("aria-hidden", "true");
    }
    expect(hero.querySelectorAll("[data-hero-panel] > a")).toHaveLength(0);
  });
});

describe("Hero CTA styles (Cream Print / Gold Glow)", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

  it("reveals the gold sweep and the navy label with one shared clip-path transition", () => {
    expect(css).toContain(
      ".hero-cta--glow::before, .hero-cta-overlay { clip-path: inset(0 100% 0 0); transition: clip-path var(--hero-cta-sweep); }",
    );
    expect(css).toContain(
      ".hero-cta--glow:hover::before, .hero-cta--glow:hover .hero-cta-overlay { clip-path: inset(0 0 0 0); }",
    );
    expect(css).toMatch(/\.hero-cta--glow::before \{ content: ""; position: absolute; inset: 0;/);
    expect(css).toMatch(
      /\.hero-cta-overlay \{ position: absolute; inset: 0;[^}]*pointer-events: none;/,
    );
  });

  it("keeps decorative motion behind hover and motion preferences", () => {
    const hover = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine) { .hero-cta"));
    // Body of the motion block nested in the hover block (up to the next at-rule).
    const motionOpen = "@media (prefers-reduced-motion: no-preference) {";
    const motion = hover.slice(hover.indexOf(motionOpen) + motionOpen.length);
    expect(motion).toMatch(/^[^@]*\.hero-cta--print:hover \{ transform: translateY\(-2px\); \}/);
    expect(motion).toMatch(
      /^[^@]*\.hero-cta--glow:hover \.hero-cta-icon \{ animation: hero-cta-spark-pulse var\(--hero-cta-sweep\) both; \}/,
    );
    expect(css).toContain(
      "@keyframes hero-cta-spark-pulse { 0%, 42% { transform: scale(1); } 58% { transform: scale(1.12); } 78%, 100% { transform: scale(1); } }",
    );
    expect(css).toContain(
      "@media (prefers-reduced-motion: no-preference) { .hero-cta:active { transform: scale(0.98); } }",
    );
    const block = css.slice(css.indexOf("/* Home Hero CTAs"), css.indexOf(".photo-frame-print {"));
    expect(block).not.toMatch(/hero-cta--print[^}]*hero-cta-icon[^}]*transform/);
    expect(block).not.toMatch(/hero-cta--glow[^}]*rotate/);
  });

  it("is only used by the homepage Hero", () => {
    const src = path.resolve(__dirname, "..");
    const users = (readdirSync(src, { recursive: true }) as string[])
      .filter((f) => /\.tsx?$/.test(f) && !f.includes("test"))
      .filter((f) => readFileSync(path.join(src, f), "utf8").includes("hero-cta"));
    expect(users.map((f) => f.replaceAll("\\", "/"))).toEqual(["views/home.tsx"]);
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
    const { container, cleanupMarked } = renderOver("dark");
    const header = container.querySelector("header")!;
    expect(header).toHaveAttribute("data-theme", "dark");
    for (const cls of ["sticky", "top-0", "bg-navy", "text-navy-foreground", "border-navy-border"])
      expect(header.classList).toContain(cls);
    expect(header.querySelector(".h-16")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: messages.bg.nav.main }).className).toContain(
      "lg:flex",
    );
    expect(screen.getByRole("button", { name: messages.bg.nav.open }).className).toContain(
      "lg:hidden",
    );
    // Wordmark dash: white on the dark header, gold-ink on the light one, gold elsewhere (footer).
    const wordmark = within(header).getByRole("link", { name: "CHEFO — VISUAL WORLDS" });
    const dash = wordmark.querySelector("span")!;
    expect(dash).toHaveTextContent(/^—$/);
    expect(dash.className.split(" ").sort()).toEqual(
      [
        "text-gold",
        "[[data-theme=dark]_&]:text-white",
        "[[data-theme=light]_&]:text-gold-ink",
      ].sort(),
    );
    cleanupMarked();
  });

  it("uses the approved cream tone over light sections", async () => {
    const { container, cleanupMarked } = renderOver("light");
    await act(async () => {});
    const header = container.querySelector("header")!;
    expect(header).toHaveAttribute("data-theme", "light");
    expect(header.classList).toContain("bg-background");
    cleanupMarked();
  });
});
