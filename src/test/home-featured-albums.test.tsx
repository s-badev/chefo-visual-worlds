import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiCard } from "@/components/site";
import { aiWorks, localizeAiWork } from "@/content/ai-works";
import { getAlbum, getAlbumCover } from "@/content/albums";
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
}));

vi.mock("@/components/portrait", () => ({ PortraitSwitch: () => <div /> }));

afterEach(() => {
  cleanup();
  activeLocale = "bg";
});

describe("homepage featured albums", () => {
  it.each(["bg", "en"] as const)("keeps four valid AI preview links in %s", (locale) => {
    activeLocale = locale;
    render(<HomeView />);
    const heading = screen.getByRole("heading", { name: messages[locale].home.aiTitle });
    const section = heading.closest("section")!;
    const prefix = locale === "en" ? "/en" : "";
    expect(
      Array.from(section.querySelectorAll(`a[href^="${prefix}/ai-worlds/"]`)).map((link) =>
        link.getAttribute("href"),
      ),
    ).toEqual([
      `${prefix}/ai-worlds/chefo-srednovekoven-ritsar`,
      `${prefix}/ai-worlds/renesansov-portret`,
      `${prefix}/ai-worlds/chefo-v-badeshteto`,
      `${prefix}/ai-worlds/chefo-v-sauditska-arabiya`,
    ]);
    expect(section.querySelectorAll(".ai-frame-compact")).toHaveLength(0);
    expect(section.textContent).not.toContain("Владетел на морското кралство");
    expect(section.textContent).not.toContain("Лято на морето — AI колаж");
  });

  it("keeps the shared AI card unframed by default without changing its link or image", () => {
    const work = localizeAiWork(aiWorks[0]!, "bg");
    render(<AiCard work={work} />);

    const link = screen.getByRole("link", { name: new RegExp(work.title) });
    const image = within(link).getByRole("img", { name: work.alt });
    const imageFrame = image.parentElement;

    expect(link).toHaveAttribute("href", `/ai-worlds/${work.slug}`);
    expect(image).toHaveAttribute("src", work.image);
    expect(image).toHaveAttribute("width", String(work.width ?? 1024));
    expect(image).toHaveAttribute("height", String(work.height ?? 1280));
    expect(imageFrame).not.toHaveClass("ai-frame-compact");
  });

  it("applies the compact frame only when the shared AI card explicitly opts in", () => {
    const work = localizeAiWork(aiWorks[0]!, "bg");
    render(<AiCard work={work} frame="compact" />);

    const image = screen.getByRole("img", { name: work.alt });
    expect(image.parentElement).toHaveClass("ai-frame-compact");
  });

  it.each([
    ["bg", ["Несебър", "София", "Слънчев бряг"], "Разгледай всички 12 албума"],
    ["en", ["Nessebar", "Sofia", "Sunny Beach"], "Explore All 12 Albums"],
  ] as const)("shows three album covers in %s", (locale, names, cta) => {
    activeLocale = locale;
    render(<HomeView />);
    const section = screen
      .getByRole("heading", { name: messages[locale].home.photoTitle })
      .closest("section")!;
    const prefix = locale === "en" ? "/en" : "";
    const links = Array.from(section.querySelectorAll(`a[href^="${prefix}/photography/albums/"]`));

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `${prefix}/photography/albums/nessebar`,
      `${prefix}/photography/albums/sofia`,
      `${prefix}/photography/albums/sunny-beach`,
    ]);
    for (const [index, name] of names.entries()) {
      expect(within(links[index] as HTMLElement).getByText(name)).toBeInTheDocument();
      expect(links[index]?.querySelector("img")?.getAttribute("src")).toBe(
        getAlbumCover(getAlbum(["nessebar", "sofia", "sunny-beach"][index]!)!)?.image,
      );
    }
    expect(
      within(links[0] as HTMLElement).getByText(messages[locale].photos.count(33)),
    ).toBeInTheDocument();
    expect(
      within(links[1] as HTMLElement).getByText(messages[locale].photos.count(45)),
    ).toBeInTheDocument();
    expect(
      within(links[2] as HTMLElement).getByText(messages[locale].photos.count(58)),
    ).toBeInTheDocument();
    expect(
      section.querySelectorAll(`a[href^="${prefix}/photography/"]:not([href*="/albums/"])`),
    ).toHaveLength(0);
    expect(within(section as HTMLElement).getByRole("link", { name: cta })).toHaveAttribute(
      "href",
      `${prefix}/photography`,
    );
  });
});
