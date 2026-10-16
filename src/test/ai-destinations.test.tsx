import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aiCollections, getAiCollection } from "@/content/ai-collections";
import { destinations, getDestination, getDestinations } from "@/content/ai-destinations";
import { aiWorks, getAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { routeTree } from "@/routeTree.gen";
import { DestinationView } from "@/components/ai-atlas";
import { PromptNote } from "@/components/ai-exhibition";
import { AiCollectionView } from "@/views/ai-worlds";

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
] as const;

const REMOVED = ["chefo-v-kioto", "chefo-v-edinburg", "chefo-vav-fes", "chefo-v-teksas"];

describe("Around the World data", () => {
  it("is the fourth of exactly four collections", () => {
    expect(aiCollections).toHaveLength(4);
    const atlas = getAiCollection("chefo-around-the-world")!;
    expect(atlas.order).toBe(4);
    expect(atlas.title).toEqual({ bg: "По света", en: "Around the World" });
    expect(atlas.tagline).toEqual({ bg: "Едно лице. Много култури.", en: "One Face. Many Cultures." });
    expect(atlas.intro).toEqual({
      bg: "Пътешествие през 12 дестинации, в които облеклото, прическите и атмосферата се променят, но лицето остава същото. Различни култури, епохи и светове, пресъздадени с AI.",
      en: "A journey across 12 destinations where clothing, hairstyles, and atmosphere change, but the face remains the same. Different cultures, eras, and worlds reimagined with AI.",
    });
  });

  it("has exactly the twelve owner-selected destinations in the requested order", () => {
    expect(destinations).toHaveLength(12);
    expect(getDestinations().map((d) => d.order)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    );
    expect(getDestinations().map((d) => [d.slug, d.country.en])).toEqual(FINAL_DESTINATIONS);
    const keys = destinations.map((d) => `${d.country.en}|${d.place?.en ?? ""}`);
    expect(new Set(keys).size).toBe(12);
    expect(new Set(destinations.map((d) => d.slug)).size).toBe(12);
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
      ["Цветовете на Индия", "Colors of India"],
      ["Между традиция и съвременност", "Between Tradition and Modernity"],
      ["Египетски хоризонти", "Egyptian Horizons"],
      ["Съвременен Дубай", "Modern Dubai"],
    ];
    expect(destinations.map((d) => [d.title.bg, d.title.en])).toEqual(titles);
    expect(destinations.map((d) => [getAiWork(d.slug)?.title, getAiWork(d.slug)?.en?.title])).toEqual(titles);
  });

  it("removes the four unused examples without deleting a published artwork", () => {
    for (const slug of REMOVED) {
      expect(getDestination(slug)).toBeUndefined();
      expect(getAiWork(slug)).toBeUndefined();
    }
  });

  it("only names places that were specified", () => {
    const withPlace = destinations.filter((d) => d.place).map((d) => d.place!.en);
    expect(withPlace).toEqual(["Dubai"]);
  });

  it("describes Greenland as a territory within the Kingdom of Denmark", () => {
    const greenland = destinations.find((d) => d.country.en === "Greenland")!;
    expect(greenland.context?.en).toContain("Kingdom of Denmark");
    expect(greenland.context?.bg).toContain("Кралство Дания");
  });

  it("has every brief field in both languages", () => {
    for (const d of destinations) {
      for (const field of [
        d.country,
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
      expect(d.styles.length).toBeGreaterThan(0);
      expect(d.promptDraft).toMatch(/keep my facial features/);
    }
  });

  it("publishes the twelve supplied portraits with reconstruction prompts and no invented tool or date", () => {
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
    ] as const;
    for (const [index, d] of destinations.entries()) {
      const work = getAiWork(d.slug);
      expect(d.status).toBe("published");
      expect(work).toBeDefined();
      expect(work?.image).toContain(portraits[index]![0]);
      expect(work?.width).toBe(portraits[index]![1]);
      expect(work?.height).toBe(portraits[index]![2]);
      expect(work?.en?.title).toBe(d.title.en);
      expect(work?.en?.alt).toBeTruthy();
      expect(work?.en?.description).toBeTruthy();
      expect(work?.portraitDetails?.clothing.en).toBeTruthy();
      expect(work?.prompt.length).toBeGreaterThan(300);
      expect(work?.promptKind).toBe("illustrative");
      expect(work?.tool).toBeUndefined();
      expect(work?.date).toBeUndefined();
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
  it("lists the twelve published destinations on the collection page", () => {
    activeLocale = "bg";
    render(<AiCollectionView collection={getAiCollection("chefo-around-the-world")!} />);
    expect(screen.getByText("Едно лице. Много култури.")).toBeInTheDocument();
    const index = screen.getByRole("region", { name: messages.bg.ai.allDestinations });
    const links = within(index).getAllByRole("link");
    expect(links).toHaveLength(12);
    expect(links.map((a) => a.textContent)).toContain("Гръцки следобед");
    expect(links.map((a) => a.textContent)).toContain("Под слънцето на Арабия");
    expect(screen.getByText("12 направления · 12 завършени портрета")).toBeInTheDocument();
    expect(screen.getByText(getAiCollection("chefo-around-the-world")!.intro.bg)).toBeInTheDocument();
    expect(within(index).queryByText("01 / 12")).not.toBeInTheDocument();
    expect(within(index).queryByText("12 / 12")).not.toBeInTheDocument();
    for (const title of ["Под слънцето на Арабия", "Гръцки следобед"]) {
      expect(within(index).getByRole("heading", { name: title }).previousElementSibling).toBeNull();
    }
    for (const removed of ["Киото", "Единбург", "Фес", "Тексас"]) {
      expect(index.textContent).not.toContain(removed);
    }
    expect(index.textContent).not.toMatch(/оригиналното видео|ново направление/i);
  });

  it("shows the approved English collection copy without origin labels", () => {
    render(<AiCollectionView collection={getAiCollection("chefo-around-the-world")!} />);
    expect(screen.getByText(getAiCollection("chefo-around-the-world")!.intro.en)).toBeInTheDocument();
    expect(screen.getByText("One Face. Many Cultures.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/original video|new destination/i);
  });

  it("keeps the planned fallback distinct from finished art when a portrait is missing", () => {
    const planned = { ...getDestination("chefo-v-gartsiya")!, status: "planned" as const };
    const { container } = render(
      <DestinationView destination={planned} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "A Greek Afternoon" })).toBeInTheDocument();
    expect(screen.getByText("Destination 02 / 12")).toBeInTheDocument();
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
    expect(portrait.closest("figure")).toHaveClass("ai-frame-portal");
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
    expect(screen.getByRole("button", { name: messages.en.ai.copyPromptButton })).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { level: 1, name: "Под слънцето на Арабия" })).toBeInTheDocument();
    expect(screen.getByText("Направление 01 / 12")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: messages.bg.ai.prompt })).toBeInTheDocument();
    expect(screen.getByText(getAiWork(destination.slug)!.prompt)).toBeInTheDocument();
    expect(screen.getByText("Пясъчни дюни, палми и камили в далечината.")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: messages.bg.ai.allDestinations });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/ai-worlds/chefo-v-dubai",
      "/ai-worlds/chefo-v-gartsiya",
    ]);
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
    expect(screen.getByRole("button", { name: messages.en.ai.showLessPrompt })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: messages.en.ai.copyPromptButton })).toBeInTheDocument();
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
      expect(screen.getByRole("button", { name: messages.en.ai.copyPromptButton })).toHaveClass("bg-navy", "text-gold");
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
