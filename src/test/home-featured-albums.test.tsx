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
  it.each([
    ["bg", ["Несебър", "София", "Слънчев бряг"], "Разгледай всички 10 албума"],
    ["en", ["Nessebar", "Sofia", "Sunny Beach"], "Explore All 10 Albums"],
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
      within(links[0] as HTMLElement).getByText(messages[locale].photos.count(3)),
    ).toBeInTheDocument();
    expect(
      within(links[1] as HTMLElement).getByText(messages[locale].photos.count(2)),
    ).toBeInTheDocument();
    expect(
      within(links[2] as HTMLElement).getByText(messages[locale].photos.count(1)),
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
