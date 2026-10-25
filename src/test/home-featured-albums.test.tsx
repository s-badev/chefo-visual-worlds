import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiCard } from "@/components/site";
import { aiWorks, getAiWork, localizeAiWork } from "@/content/ai-works";
import { getAlbum, getAlbumCover } from "@/content/albums";
import { messages } from "@/i18n/messages";
import { AiDetailView } from "@/views/ai-worlds";
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
      `${prefix}/ai-worlds/captain-against-the-storm`,
      `${prefix}/ai-worlds/rainy-neon-noir`,
      `${prefix}/ai-worlds/chefo-v-turtsiya`,
    ]);
    expect(Array.from(section.querySelectorAll("h3")).map((h) => h.textContent)).toEqual(
      locale === "en"
        ? [
            "Medieval Ruler",
            "Captain Against the Storm",
            "The Last Witness",
            "Evening on the Bosphorus",
          ]
        : [
            "Средновековен владетел",
            "Капитанът срещу бурята",
            "Последният свидетел",
            "Вечер край Босфора",
          ],
    );
    expect(
      Array.from(section.querySelectorAll("article")).map(
        (card) => card.querySelector("p")?.textContent ?? null,
      ),
    ).toEqual([
      "ChatGPT Image Generation",
      "Gemini Nano Banana",
      "Gemini Nano Banana",
      "ChatGPT Image Generation",
    ]);
    expect(section.textContent).not.toMatch(/Чефо|Chefo/);
    for (const image of Array.from(section.querySelectorAll("article img"))) {
      expect(image.getAttribute("alt")).not.toMatch(/Чефо|Chefo/);
    }
    const bosphorus = getAiWork("chefo-v-turtsiya")!;
    const bosphorusImage = section.querySelectorAll("article img")[3] as HTMLImageElement;
    expect(bosphorusImage).toHaveAttribute("src", bosphorus.image);
    expect(bosphorusImage.style.objectPosition).toBe("50% 70%");
    expect(getAiWork("chefo-v-sauditska-arabiya")).toBeDefined();
    expect(section.querySelectorAll(".ai-frame-compact")).toHaveLength(0);
    expect(section.textContent).not.toContain("Владетел на морското кралство");
    expect(section.textContent).not.toContain("Лято на морето — AI колаж");
  });

  it.each(["bg", "en"] as const)(
    "gives each Home AI card the same title as its detail H1 in %s",
    (locale) => {
      activeLocale = locale;
      render(<HomeView />);
      const section = screen
        .getByRole("heading", { name: messages[locale].home.aiTitle })
        .closest("section")!;
      const cards = Array.from(section.querySelectorAll("article")).map((card) => ({
        slug: card.querySelector("a")!.getAttribute("href")!.split("/").at(-1)!,
        title: card.querySelector("h3")!.textContent,
      }));
      cleanup();
      expect(cards.map((card) => card.slug)).toEqual([
        "chefo-srednovekoven-ritsar",
        "captain-against-the-storm",
        "rainy-neon-noir",
        "chefo-v-turtsiya",
      ]);
      for (const { slug, title } of cards) {
        render(<AiDetailView work={getAiWork(slug)!} />);
        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(title);
        expect(title).not.toMatch(/Чефо|Chefo/);
        cleanup();
      }
    },
  );

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
    expect(image.style.objectPosition).toBe("");
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
