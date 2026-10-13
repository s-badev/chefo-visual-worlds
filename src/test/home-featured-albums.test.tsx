import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
    expect(section.textContent).not.toContain("Владетел на морското кралство");
    expect(section.textContent).not.toContain("Лято на морето — AI колаж");
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
