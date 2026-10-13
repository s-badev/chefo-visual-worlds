// Guards the approved homepage Hero and the header that sits on top of it.
// Checks meaning (copy, images, links, frozen tokens) rather than full markup snapshots.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import heroAi from "@/assets/ai-knight.png";
import { getPublishedAlbum } from "@/content/albums";
import { getPhoto } from "@/content/photos";
import { btnHero, SiteHeader } from "@/components/site";
import { messages } from "@/i18n/messages";
import { HomeView } from "@/views/home";

const heroPhoto = "/photos/sunny-beach/coastal-sunset-over-the-lit-town.webp";

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
    heroAiAlt: "AI портрет на автора като средновековен владетел",
    ctaPhotos: "Разгледай фотографиите",
    ctaAi: "Виж AI световете",
    aiBadge: "AI генерация",
  },
  en: {
    eyebrow: "Mobile photography × AI visions",
    h1a: "Real places, ",
    h1b: "endless worlds.",
    heroPhotoAlt: "Sunset over the sea with waves and the illuminated Sunny Beach skyline",
    heroPhotoBadge: "SUNNY BEACH",
    heroAiAlt: "AI portrait of the author as a medieval ruler",
    ctaPhotos: "Explore the photography",
    ctaAi: "See the AI worlds",
    aiBadge: "AI generated",
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
      aiBadge: messages[locale].common.aiBadge,
    }).toEqual(copy);

    const { container } = render(<HomeView />);
    const hero = container.querySelector("section")!;
    expect(hero).toHaveAttribute("data-header-theme", "dark");

    const h1 = within(hero).getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(`${copy.h1a}${copy.h1b}`);
    expect(h1.querySelector("em")).toHaveTextContent(copy.h1b);
    expect(within(hero).getByText(copy.eyebrow)).toBeInTheDocument();

    const images = Array.from(hero.querySelectorAll("img"));
    expect(images.map((img) => [img.getAttribute("src"), img.getAttribute("alt")])).toEqual([
      [heroPhoto, copy.heroPhotoAlt],
      [heroAi, copy.heroAiAlt],
    ]);
    expect(getPhoto("coastal-sunset-over-the-lit-town")?.image).toBe(heroPhoto);
    expect(getPublishedAlbum("sunny-beach")?.photos.some(({ photoSlug }) => photoSlug === "coastal-sunset-over-the-lit-town")).toBe(true);
    expect(images[0].className).toContain("brightness-90");
    expect(images[0].className).toContain("object-center");
    expect(images[0].nextElementSibling?.className).toContain("via-navy/25");
    expect(images[1].className).not.toContain("brightness-90");
    expect(images[1].className).toContain("object-top");
    expect(images[1].nextElementSibling?.className).toContain("md:via-navy/55");

    expect(within(hero).getByText(copy.heroPhotoBadge)).toBeInTheDocument();
    expect(within(hero).getByText(copy.aiBadge)).toBeInTheDocument();

    const prefix = locale === "en" ? "/en" : "";
    const ctas = within(hero).getAllByRole("link");
    expect(ctas.map((a) => [a.getAttribute("href"), a.textContent?.trim()])).toEqual([
      [`${prefix}/photography`, copy.ctaPhotos],
      [`${prefix}/ai-worlds`, copy.ctaAi],
    ]);
    for (const cta of ctas) expect(cta.className).toContain(btnHero);
  });

  it("keeps the shared Hero CTA style", () => {
    expect(btnHero).toBe(
      "inline-flex items-center gap-2 rounded-sm border border-gold bg-gold px-6 py-3 text-sm font-semibold tracking-wide text-accent-foreground shadow-soft transition-colors hover:bg-navy-foreground hover:border-navy-foreground",
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
    cleanupMarked();
  });

  it("uses the approved cream tone over light sections", async () => {
    const { container, cleanupMarked } = renderOver("light");
    await act(async () => {});
    const header = container.querySelector("header")!;
    expect(header).toHaveAttribute("data-theme", "light");
    expect(header.classList).toContain("bg-background/95");
    cleanupMarked();
  });
});
