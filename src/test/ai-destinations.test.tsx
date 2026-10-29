import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiCollections, getAiCollection, getCollectionWorks } from "@/content/ai-collections";
import { destinations, getDestination, getDestinations } from "@/content/ai-destinations";
import { aiWorks, getAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { routeTree } from "@/routeTree.gen";
import { Route as BgDetailRoute } from "@/routes/ai-worlds.$slug";
import { Route as EnDetailRoute } from "@/routes/en.ai-worlds.$slug";
import { DestinationView } from "@/components/ai-atlas";
import { PromptNote } from "@/components/ai-exhibition";
import { AiCollectionView, AiDetailView } from "@/views/ai-worlds";

let activeLocale: "bg" | "en" = "en";

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

afterEach(() => {
  cleanup();
  activeLocale = "en";
});

const FINAL_DESTINATIONS = [
  ["chefo-v-sauditska-arabiya", "Saudi Arabia"],
  ["chefo-v-gartsiya", "Greece"],
  ["chefo-v-kuba", "Cuba"],
  ["chefo-v-braziliya", "Brazil"],
  ["chefo-v-grenlandiya", "Greenland"],
  ["chefo-v-rusiya", "Russia"],
  ["chefo-v-italiya", "Italy"],
  ["chefo-vav-frantsiya", "France"],
  ["chefo-v-indiya", "India"],
  ["chefo-v-turtsiya", "Turkey"],
  ["chefo-v-egipet", "Egypt"],
  ["chefo-v-dubai", "UAE"],
  ["chefo-rainy-new-york", "USA"],
  ["chefo-sydney-harbour-sunset", "Australia"],
  ["chefo-coastal-adventure", "Tropical coast"],
  ["chefo-rice-terraces-morning", "Rice terraces"],
] as const;

const REMOVED = ["chefo-v-kioto", "chefo-v-edinburg", "chefo-vav-fes", "chefo-v-teksas"];

describe("Around the World data", () => {
  it("is the fourth of exactly four collections", () => {
    expect(aiCollections).toHaveLength(4);
    const atlas = getAiCollection("chefo-around-the-world")!;
    expect(atlas.order).toBe(4);
    expect(atlas.title).toEqual({ bg: "По света", en: "Around the World" });
    expect(atlas.tagline).toBeUndefined();
    expect(atlas.intro).toEqual({
      bg: "Пътешествие през 16 дестинации, в които облеклото, прическите и атмосферата се променят, но лицето остава същото. Различни култури, епохи и светове, пресъздадени с AI.",
      en: "A journey across 16 destinations where clothing, hairstyles, and atmosphere change, but the face remains the same. Different cultures, eras, and worlds reimagined with AI.",
    });
  });

  it("keeps the twelve owner-selected destinations and appends the four new travel works", () => {
    expect(destinations).toHaveLength(16);
    expect(getDestinations().map((d) => d.order)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    expect(getDestinations().map((d) => [d.slug, d.country?.en ?? d.place?.en])).toEqual(
      FINAL_DESTINATIONS,
    );
    const keys = destinations.map((d) => `${d.country?.en ?? ""}|${d.place?.en ?? ""}`);
    expect(new Set(keys).size).toBe(16);
    expect(new Set(destinations.map((d) => d.slug)).size).toBe(16);
  });

  it("uses the approved editorial titles for every published destination", () => {
    const titles = [
      ["Под слънцето на Арабия", "Under the Arabian Sun"],
      ["Гръцки следобед", "A Greek Afternoon"],
      ["Улиците на Куба", "Streets of Cuba"],
      ["Бразилски ритъм", "Brazilian Rhythm"],
      ["Тишината на Гренландия", "The Quiet of Greenland"],
      ["Руска зима", "Russian Winter"],
      ["Италианска елегантност", "Italian Elegance"],
      ["Френски стил", "French Style"],
      ["Цветовете на пазара", "Colours of the Market"],
      ["Между традиция и съвременност", "Between Tradition and Modernity"],
      ["Египетски хоризонти", "Egyptian Horizons"],
      ["Съвременен Дубай", "Modern Dubai"],
      ["Ню Йорк след дъжда", "New York After the Rain"],
      ["Залез над Сидни", "Sydney at Sunset"],
      ["Последните лъчи", "The Last Light"],
      ["Утро сред оризовите тераси", "Morning Among the Rice Terraces"],
    ];
    expect(destinations.map((d) => [d.title.bg, d.title.en])).toEqual(titles);
    // The Bosphorus artwork carries its Home card title; the destination keeps the earlier
    // editorial headline until the owner decides where it belongs.
    expect(
      destinations.map((d) => [getAiWork(d.slug)?.title, getAiWork(d.slug)?.en?.title]),
    ).toEqual(
      titles.map((pair) =>
        pair[0] === "Между традиция и съвременност"
          ? ["Вечер край Босфора", "Evening on the Bosphorus"]
          : pair,
      ),
    );
  });

  it("removes the four unused examples without deleting a published artwork", () => {
    for (const slug of REMOVED) {
      expect(getDestination(slug)).toBeUndefined();
      expect(getAiWork(slug)).toBeUndefined();
    }
  });

  it("only names places that were specified", () => {
    const withPlace = destinations.filter((d) => d.place).map((d) => d.place!.en);
    expect(withPlace).toEqual(["Dubai", "New York", "Sydney", "Tropical coast", "Rice terraces"]);
  });

  it("describes Greenland as a territory within the Kingdom of Denmark", () => {
    const greenland = destinations.find((d) => d.country?.en === "Greenland")!;
    expect(greenland.context?.en).toContain("Kingdom of Denmark");
    expect(greenland.context?.bg).toContain("Кралство Дания");
  });

  it("has every brief field in both languages", () => {
    for (const d of destinations) {
      for (const field of [
        d.title,
        d.description,
        d.clothing,
        d.grooming,
        d.inspiration,
        d.setting,
      ]) {
        expect(field.bg.trim()).not.toBe("");
        expect(field.en.trim()).not.toBe("");
      }
      expect(d.country ?? d.place).toBeDefined();
      if (d.country) {
        expect(d.country.bg.trim()).not.toBe("");
        expect(d.country.en.trim()).not.toBe("");
      }
      expect(d.styles.length).toBeGreaterThan(0);
      if (d.order <= 12) expect(d.promptDraft).toMatch(/keep my facial features/);
      else expect(d.promptDraft).toBe("Original generation prompt not supplied.");
    }
  });

  it("publishes all sixteen supplied portraits with reconstruction prompts and only owner-supplied tools", () => {
    const portraits = [
      ["chefo-saudi-arabia.png", 1122, 1402],
      ["chefo-greece.png", 1122, 1402],
      ["chefo-cuba.png", 1024, 1536],
      ["chefo-brazil.png", 1024, 1536],
      ["chefo-greenland.png", 1122, 1402],
      ["chefo-russia.png", 1024, 1536],
      ["chefo-italy.png", 1024, 1536],
      ["chefo-france.png", 1122, 1402],
      ["chefo-india.png", 1122, 1402],
      ["chefo-turkey.png", 1024, 1536],
      ["chefo-egypt.png", 1122, 1402],
      ["chefo-dubai.png", 1122, 1402],
      ["chefo-rainy-new-york.webp", 1122, 1402],
      ["chefo-sydney-harbour-sunset.webp", 1122, 1402],
      ["chefo-coastal-adventure.webp", 1122, 1402],
      ["chefo-rice-terraces-morning.webp", 1122, 1402],
    ] as const;
    for (const [index, d] of destinations.entries()) {
      const work = getAiWork(d.slug);
      expect(d.status).toBe("published");
      expect(work).toBeDefined();
      expect(work?.image).toContain(portraits[index]![0]);
      expect(work?.width).toBe(portraits[index]![1]);
      expect(work?.height).toBe(portraits[index]![2]);
      expect(work?.en?.title).toBe(
        d.slug === "chefo-v-turtsiya" ? "Evening on the Bosphorus" : d.title.en,
      );
      expect(work?.en?.alt).toBeTruthy();
      expect(work?.en?.description).toBeTruthy();
      expect(work?.portraitDetails?.clothing.en).toBeTruthy();
      expect(work?.prompt.length).toBeGreaterThan(300);
      expect(work?.promptKind).toBe("illustrative");
      // Only the Bosphorus tool has been confirmed by the owner; the others stay unset.
      expect(work?.tool).toBe(
        d.slug === "chefo-v-turtsiya" ? "ChatGPT Image Generation" : undefined,
      );
      // Only the Bosphorus portrait has a creation date (owner decision 6d).
      expect(work?.date).toBe(d.slug === "chefo-v-turtsiya" ? "2026-10-12" : undefined);
    }
  });

  it("shows only the Bosphorus destination on the shared artwork template", () => {
    expect(destinations.filter((d) => d.artworkTemplate).map((d) => d.slug)).toEqual([
      "chefo-v-turtsiya",
    ]);
    for (const route of [BgDetailRoute, EnDetailRoute]) {
      const load = route.options.loader as (ctx: { params: { slug: string } }) => {
        work?: { slug: string };
        destination?: { slug: string };
      };
      for (const d of destinations) {
        const data = load({ params: { slug: d.slug } });
        if (d.slug === "chefo-v-turtsiya") {
          expect(data.destination).toBeUndefined();
          expect(data.work?.slug).toBe(d.slug);
        } else {
          expect(data.destination?.slug).toBe(d.slug);
          expect(data.work).toBeUndefined();
        }
      }
    }
  });

  it("resolves destination pages on the artwork route without breaking existing ones", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const path of [
      "/ai-worlds/chefo-v-gartsiya",
      "/en/ai-worlds/chefo-v-gartsiya",
      "/ai-worlds/renesansov-portret",
    ]) {
      expect(router.matchRoutes(path).at(-1)?.routeId).toMatch(/ai-worlds\/\$slug$/);
    }
    expect(
      router.matchRoutes("/ai-worlds/collections/chefo-around-the-world").at(-1)?.routeId,
    ).toBe("/ai-worlds/collections/$slug");
    const workSlugs = new Set(aiWorks.map((w) => w.slug));
    for (const d of destinations) {
      expect(d.slug).not.toBe("collections");
      for (const prefix of ["", "/en"]) {
        expect(router.matchRoutes(`${prefix}/ai-worlds/${d.slug}`).at(-1)?.routeId).toMatch(
          /ai-worlds\/\$slug$/,
        );
      }
      expect(workSlugs.has(d.slug)).toBe(true);
    }
  });
});

describe("Around the World pages", () => {
  it.each(["bg", "en"] as const)(
    "shows the Bosphorus artwork template with its full brief in %s",
    (locale) => {
      activeLocale = locale;
      const work = getAiWork("chefo-v-turtsiya")!;
      const m = messages[locale].ai;
      const collection = getAiCollection("chefo-around-the-world")!.title[locale];
      render(<AiDetailView work={work} />);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        locale === "bg" ? "Вечер край Босфора" : "Evening on the Bosphorus",
      );
      expect(screen.getAllByRole("link", { name: collection })).toHaveLength(2); // breadcrumb + chip
      expect(screen.getByText(messages[locale].common.aiBadge)).toBeInTheDocument();
      const metadata = document.querySelector("dl");
      expect(metadata).not.toBeNull();
      expect(metadata?.querySelectorAll("dt")).toHaveLength(8);
      expect(within(metadata as HTMLElement).getByText("ChatGPT Image Generation")).toBeInTheDocument();
      expect(
        within(metadata as HTMLElement).getByText(
          locale === "bg" ? "12 октомври 2026 г." : "12 October 2026",
        ),
      ).toBeInTheDocument();
      expect(
        within(metadata as HTMLElement).getByText(
          locale === "bg" ? "Култури по света" : "World cultures",
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: m.others })).toBeInTheDocument();
    },
  );

  it("lists the sixteen published destinations on the collection page", () => {
    activeLocale = "bg";
    const collection = getAiCollection("chefo-around-the-world")!;
    const galleryWorks = getCollectionWorks(collection, "bg");
    render(<AiCollectionView collection={collection} />);
    expect(screen.queryByText("Едно лице. Много култури.")).toBeNull();
    expect(galleryWorks).toHaveLength(16);
    for (const work of galleryWorks) {
      expect(screen.getByRole("heading", { name: work.title })).toBeInTheDocument();
    }
    expect(screen.queryByRole("region", { name: messages.bg.ai.allDestinations })).toBeNull();
    expect(screen.getByText(messages.bg.ai.count(16))).toBeInTheDocument();
    expect(
      screen.getByText(getAiCollection("chefo-around-the-world")!.intro.bg),
    ).toBeInTheDocument();
    const collectionNav = screen.getByRole("navigation", { name: messages.bg.ai.collections });
    expect(within(collectionNav).getAllByRole("link")).toHaveLength(2);
    for (const removed of ["Киото", "Единбург", "Фес", "Тексас"]) {
      expect(document.body.textContent).not.toContain(removed);
    }
    expect(document.body.textContent).not.toMatch(/оригиналното видео|ново направление/i);
  });

  it.each(["bg", "en"] as const)(
    "keeps a clean Dubai detail ending with only adjacent-destination navigation in %s",
    (locale) => {
      activeLocale = locale;
      render(<DestinationView destination={getDestination("chefo-v-dubai")!} />);
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: locale === "bg" ? "Съвременен Дубай" : "Modern Dubai",
        }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: messages[locale].ai.allDestinations }),
      ).toBeNull();
      expect(
        screen.getByRole("link", { name: messages[locale].ai.backToCollection }),
      ).toHaveAttribute("href", "/ai-worlds/collections/chefo-around-the-world");
      const navigation = screen.getByRole("navigation", {
        name: messages[locale].ai.allDestinations,
      });
      expect(within(navigation).getAllByRole("link")).toHaveLength(2);
      expect(document.querySelectorAll("img")).toHaveLength(3); // main artwork + two nav thumbnails
    },
  );

  it("shows the approved English collection copy without origin labels", () => {
    render(<AiCollectionView collection={getAiCollection("chefo-around-the-world")!} />);
    expect(
      screen.getByText(getAiCollection("chefo-around-the-world")!.intro.en),
    ).toBeInTheDocument();
    expect(screen.queryByText("One Face. Many Cultures.")).toBeNull();
    expect(screen.getByText(messages.en.ai.count(16))).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/original video|new destination/i);
  });

  it("keeps the planned fallback distinct from finished art when a portrait is missing", () => {
    const planned = { ...getDestination("chefo-v-gartsiya")!, status: "planned" as const };
    const { container } = render(<DestinationView destination={planned} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "A Greek Afternoon" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Destination 02 / 16")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/original video|new destination/i);
    expect(screen.getByText(messages.en.ai.portraitPlanned)).toBeInTheDocument();
    expect(container.querySelector("main img, article > div img")).toBeNull();
    expect(screen.queryByRole("button", { name: messages.en.ai.copyPromptButton })).toBeNull();
    expect(screen.getByRole("heading", { name: messages.en.ai.promptDraft })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: messages.en.ai.allDestinations });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/ai-worlds/chefo-v-sauditska-arabiya", "/ai-worlds/chefo-v-kuba"]);
  });

  it("shows a supplied portrait at natural ratio with fullscreen and honest prompt status", () => {
    const work = getAiWork("chefo-v-gartsiya")!;
    const { container } = render(<DestinationView destination={getDestination(work.slug)!} />);
    expect(screen.queryByText(messages.en.ai.portraitPlanned)).toBeNull();
    const portrait = screen.getByAltText(work.en!.alt!);
    expect(portrait).toBeInTheDocument();
    expect(portrait.closest("figure")).not.toHaveClass("ai-frame-portal");
    expect(portrait).toHaveAttribute("width", String(work.width));
    expect(portrait).toHaveAttribute("height", String(work.height));
    expect(portrait).toHaveAttribute("loading", "eager");
    expect(portrait).toHaveAttribute("fetchpriority", "high");
    expect(portrait).toHaveClass("object-contain", "h-auto", "w-full");
    expect(container.querySelector("figure")?.parentElement).toHaveClass("max-w-[68rem]");
    expect(screen.getByRole("heading", { level: 1, name: work.en!.title! })).toBeInTheDocument();
    expect(screen.getByText(work.en!.description!)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: messages.en.ai.prompt })).toBeInTheDocument();
    expect(screen.getByText(work.prompt)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: messages.en.ai.copyPromptButton }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: `Open “${work.en!.title}” in full screen` }),
    );
    expect(screen.getByRole("dialog", { name: work.en!.title! })).toBeInTheDocument();
    expect(
      screen.getByRole("dialog").querySelector(".ai-frame-portal, .ai-frame-compact"),
    ).toBeNull();
  });

  it("shows the new Saudi portrait in Bulgarian and wraps destination navigation", () => {
    activeLocale = "bg";
    const destination = getDestination("chefo-v-sauditska-arabiya")!;
    render(<DestinationView destination={destination} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Под слънцето на Арабия" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Направление 01 / 16")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: messages.bg.ai.prompt })).toBeInTheDocument();
    expect(screen.getByText(getAiWork(destination.slug)!.prompt)).toBeInTheDocument();
    expect(
      screen.getByText("Глинени крепостни стени, палми и високи кули на заден план."),
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: messages.bg.ai.allDestinations });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/ai-worlds/chefo-rice-terraces-morning", "/ai-worlds/chefo-v-gartsiya"]);
  });

  it("shows a neutral heading and expands a long artwork prompt", () => {
    const work = aiWorks.find((w) => w.slug === "renesansov-portret")!;
    const published = {
      ...getDestination("chefo-v-gartsiya")!,
      slug: work.slug,
      status: "published" as const,
    };
    render(<DestinationView destination={published} />);
    expect(screen.getByRole("heading", { name: messages.en.ai.prompt })).toBeInTheDocument();
    expect(screen.getByText(work.prompt)).toHaveAttribute("lang", "en");
    const button = screen.getByRole("button", { name: messages.en.ai.showFullPrompt });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: messages.en.ai.showLessPrompt })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("button", { name: messages.en.ai.copyPromptButton }),
    ).toBeInTheDocument();
  });

  it("copies the full English prompt and returns to the default state after two seconds", async () => {
    const work = getAiWork("chefo-v-gartsiya")!;
    const oldClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    vi.useFakeTimers();
    try {
      render(<DestinationView destination={getDestination(work.slug)!} />);
      const button = screen.getByRole("button", { name: messages.en.ai.copyPromptButton });
      expect(button).toHaveClass("bg-navy", "text-gold", "min-h-11");
      await act(async () => {
        fireEvent.click(button);
        await Promise.resolve();
      });
      expect(writeText).toHaveBeenCalledWith(work.prompt);
      const copiedButton = screen.getByRole("button", { name: messages.en.ai.copiedPromptButton });
      expect(copiedButton).toHaveClass("bg-gold", "text-navy");
      expect(copiedButton.querySelectorAll("svg.lucide-check")).toHaveLength(1);
      expect(copiedButton.textContent).toBe("Copied");
      expect(work.prompt).not.toMatch(/\bChefo\b/i);
      expect(work.prompt).toContain("uploaded reference photograph");
      expect(screen.getByRole("status")).toHaveTextContent(messages.en.ai.copiedPromptButton);
      act(() => vi.advanceTimersByTime(2000));
      expect(screen.getByRole("button", { name: messages.en.ai.copyPromptButton })).toHaveClass(
        "bg-navy",
        "text-gold",
      );
    } finally {
      vi.useRealTimers();
      if (oldClipboard) Object.defineProperty(navigator, "clipboard", oldClipboard);
      else Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("reports clipboard failure in Bulgarian without claiming success", async () => {
    activeLocale = "bg";
    const work = getAiWork("chefo-v-sauditska-arabiya")!;
    const oldClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    try {
      render(<DestinationView destination={getDestination(work.slug)!} />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: messages.bg.ai.copyPromptButton }));
        await Promise.resolve();
      });
      expect(screen.getByRole("alert")).toHaveTextContent(messages.bg.ai.copyPromptError);
      expect(screen.queryByRole("button", { name: messages.bg.ai.copiedPromptButton })).toBeNull();
      expect(screen.getByText(work.prompt)).toBeInTheDocument();
    } finally {
      if (oldClipboard) Object.defineProperty(navigator, "clipboard", oldClipboard);
      else Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("does not show a copy button when the prompt is empty", () => {
    const work = getAiWork("chefo-v-gartsiya")!;
    render(<PromptNote work={work} prompt="" />);
    expect(screen.queryByRole("button", { name: messages.en.ai.copyPromptButton })).toBeNull();
  });
});
