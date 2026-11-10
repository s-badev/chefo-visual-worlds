import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAiCollection,
  getCollectionForWork,
  getCollectionWorks,
} from "@/content/ai-collections";
import { aiWorks, getAiWork, localizeAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { routeTree } from "@/routeTree.gen";
import { AiDetailView } from "@/views/ai-worlds";

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
  vi.restoreAllMocks();
});

const expectCleanDetail = (slug: string) => {
  const raw = getAiWork(slug)!;
  const work = localizeAiWork(raw, activeLocale);
  render(<AiDetailView work={raw} />);

  expect(screen.getByRole("heading", { level: 1, name: work.title })).toBeInTheDocument();
  expect(screen.getByText(work.description)).toBeInTheDocument();
  expect(screen.getByAltText(work.alt)).toHaveAttribute("src", work.image);
  const prompt = screen.getByRole("region", { name: messages[activeLocale].ai.promptLabel });
  const label = within(prompt).getByText(messages[activeLocale].ai.promptLabel);
  expect(label.tagName).toBe("P");
  expect(label).toHaveClass("section-eyebrow", "eyebrow", "uppercase");
  expect(prompt).toHaveAttribute("aria-labelledby", label.id);
  expect(prompt).not.toHaveAttribute("aria-label");
  expect(within(prompt).queryByRole("heading")).toBeNull();
  expect(prompt.querySelector(".ai-prompt-note")).toBeNull();
  expect(screen.getByText(raw.prompt)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: messages[activeLocale].ai.copyPromptButton }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: messages[activeLocale].ai.others }),
  ).toBeInTheDocument();
  const collection = getCollectionForWork(slug)!;
  const parentLink = screen.getByRole("link", {
    name: messages[activeLocale].ai.backToAiWorlds,
  });
  expect(parentLink).toHaveAttribute("href", `/ai-worlds/collections/${collection.slug}`);
  expect(parentLink).toHaveClass("back-pill");
  expect(screen.getAllByRole("link", { name: collection.title[activeLocale] })).toHaveLength(1);

  for (const unwanted of [
    messages[activeLocale].ai.process,
    messages[activeLocale].ai.references,
    messages[activeLocale].ai.series,
  ]) {
    expect(screen.queryByRole("heading", { name: unwanted })).toBeNull();
  }
};

describe("AI artwork detail cleanup", () => {
  it.each([
    [
      "chefo-srednovekoven-ritsar",
      ["tool", "created", "theme", "era", "setting", "role", "collectionLabel"],
      [],
    ],
    [
      "renesansov-portret",
      ["tool", "created", "theme", "era", "setting", "collectionLabel"],
      ["role"],
    ],
    [
      "eye-of-the-storm",
      ["theme", "collectionLabel"],
      ["tool", "created", "era", "setting", "role"],
    ],
  ] as const)("restores conditional detail metadata for %s", (slug, presentKeys, absentKeys) => {
    const labels = messages.en.ai;
    const labelFor = (key: (typeof presentKeys)[number] | (typeof absentKeys)[number]) =>
      labels[key];
    render(<AiDetailView work={getAiWork(slug)!} />);
    const metadata = document.querySelector("dl");
    expect(metadata).not.toBeNull();
    expect(metadata?.querySelectorAll("dt")).toHaveLength(presentKeys.length);
    for (const key of presentKeys) {
      expect(within(metadata as HTMLElement).getByText(labelFor(key))).toBeInTheDocument();
    }
    for (const key of absentKeys) {
      expect(within(metadata as HTMLElement).queryByText(labelFor(key))).toBeNull();
    }
  });

  it.each(["bg", "en"] as const)(
    "keeps the primary historical artwork and prompt but omits process imagery in %s",
    async (locale) => {
      activeLocale = locale;
      const work = getAiWork("chefo-srednovekoven-ritsar")!;
      expect(work.references.length).toBeGreaterThan(0);
      expect(work.variants.length).toBeGreaterThan(0);
      expectCleanDetail(work.slug);

      const secondarySource = work.variants.find((image) => image.src !== work.image)!.src;
      expect(document.querySelector(`img[src="${secondarySource}"]`)).toBeNull();

      const oldClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
      try {
        await act(async () => {
          fireEvent.click(
            screen.getByRole("button", { name: messages[locale].ai.copyPromptButton }),
          );
          await Promise.resolve();
        });
        expect(writeText).toHaveBeenCalledWith(work.prompt);
      } finally {
        if (oldClipboard) Object.defineProperty(navigator, "clipboard", oldClipboard);
        else Reflect.deleteProperty(navigator, "clipboard");
      }
    },
  );

  it.each([
    ["cinema-archetypes", "en"],
    ["professions-roles", "bg"],
    ["chefo-around-the-world", "en"],
  ] as const)("uses the same clean detail flow for %s in %s", (collectionSlug, locale) => {
    activeLocale = locale;
    const collection = getAiCollection(collectionSlug)!;
    const work =
      collectionSlug === "chefo-around-the-world"
        ? getAiWork("chefo-v-turtsiya")!
        : getCollectionWorks(collection, locale)[0]!;
    expectCleanDetail(work.slug);
    const navigation = screen.getByRole("navigation", { name: messages[locale].ai.others });
    expect(within(navigation).getAllByRole("link")).toHaveLength(2);
  });

  it("opens only the primary artwork in the fullscreen viewer", () => {
    const work = getAiWork("chefo-srednovekoven-ritsar")!;
    render(<AiDetailView work={work} />);
    const primaryImage = screen.getByAltText(work.en!.alt!);
    expect(primaryImage.closest("figure")).not.toHaveClass("ai-frame-portal");
    fireEvent.click(
      screen.getByRole("button", { name: `Open “${work.en!.title}” in full screen` }),
    );
    const dialog = screen.getByRole("dialog", { name: work.en!.title! });
    expect(within(dialog).getAllByRole("img")).toHaveLength(1);
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", work.image);
    // On its own page the viewer offers no link back to the same work; the eyebrow is the AI badge.
    expect(within(dialog).queryByRole("link")).toBeNull();
    expect(dialog.querySelector(".lb-meta")).toHaveTextContent(messages.en.common.aiBadge);
  });

  it("keeps every published artwork route resolvable in Bulgarian and English", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(aiWorks).toHaveLength(64);
    for (const work of aiWorks) {
      for (const prefix of ["", "/en"]) {
        expect(router.matchRoutes(`${prefix}/ai-worlds/${work.slug}`).at(-1)?.routeId).toMatch(
          /ai-worlds\/\$slug$/,
        );
      }
    }
  });

  it("keeps every artwork assigned to one deterministic parent collection", () => {
    for (const work of aiWorks) {
      const parent = getCollectionForWork(work.slug);
      expect(parent, work.slug).toBeDefined();
      expect(parent?.slug).toMatch(
        /^(historical-eras-rulers|professions-roles|cinema-archetypes|chefo-around-the-world)$/,
      );
    }
  });
});

describe.each(["bg", "en"] as const)("prompt presentation and full clipboard (%s)", (locale) => {
  it.each([
    "chefo-srednovekoven-ritsar",
    "chefo-barber",
    "captain-against-the-storm",
    "chefo-v-indiya",
  ])(
    "keeps the full prompt, controls and metadata for %s with a short visible label and no note",
    async (slug) => {
      activeLocale = locale;
      const work = getAiWork(slug)!;
      const m = messages[locale].ai;
      const writeText = vi.fn().mockResolvedValue(undefined);
      const oldClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
      try {
        render(<AiDetailView work={work} />);
        const prompt = screen.getByRole("region", { name: m.promptLabel });
        for (const removed of [
          "Реконструиран промпт",
          "Reconstructed prompt",
          "Описва готовото изображение. Не е оригиналният текст, с който е генерирано.",
          "It describes the finished image. It is not the original text it was generated from.",
        ]) {
          expect(screen.queryByText(removed)).toBeNull();
        }
        expect(within(prompt).queryByRole("heading")).toBeNull();
        const label = within(prompt).getByText(m.promptLabel);
        expect(label.tagName).toBe("P");
        expect(label).toHaveClass("section-eyebrow", "eyebrow", "uppercase");
        expect(prompt).toHaveAttribute("aria-labelledby", label.id);
        expect(prompt).not.toHaveAttribute("aria-label");
        const text = within(prompt).getByText(work.prompt);
        expect(text).toHaveAttribute("data-clamped", "true");
        const metadata = document.querySelector("dl")!;
        expect(Boolean(within(metadata).queryByText(m.tool))).toBe(Boolean(work.tool));
        expect(within(metadata).getByText(m.theme)).toBeInTheDocument();
        expect(within(metadata).getByText(m.collectionLabel)).toBeInTheDocument();
        const button = within(prompt).getByRole("button", { name: m.copyPromptButton });
        button.focus();
        await act(async () => fireEvent.click(button));
        expect(writeText).toHaveBeenCalledExactlyOnceWith(work.prompt);
        expect(within(prompt).getByRole("status")).toHaveTextContent(m.copiedPromptButton);
        expect(button).toHaveFocus();
        fireEvent.click(within(prompt).getByRole("button", { name: m.showFullPrompt }));
        expect(text).not.toHaveAttribute("data-clamped");
        expect(within(prompt).getByRole("button", { name: m.showLessPrompt })).toHaveAttribute(
          "aria-expanded",
          "true",
        );
        fireEvent.click(within(prompt).getByRole("button", { name: m.showLessPrompt }));
        expect(text).toHaveAttribute("data-clamped", "true");
      } finally {
        if (oldClipboard) Object.defineProperty(navigator, "clipboard", oldClipboard);
        else Reflect.deleteProperty(navigator, "clipboard");
      }
    },
  );
});
