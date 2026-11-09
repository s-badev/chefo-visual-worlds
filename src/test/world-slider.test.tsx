import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorldSlider } from "@/components/world-slider";
import { WORLD_SLIDES } from "@/content/world-slider";
import { messages } from "@/i18n/messages";

let activeLocale: "bg" | "en" = "bg";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: activeLocale, t: messages[activeLocale] }) };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  activeLocale = "bg";
});

const reducedMotion = () =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

const COPY = {
  bg: {
    eyebrow: "Едно място · две времена",
    title: "Същото място, друго време",
    subtitle: "Отляво е мястото днес. Отдясно е същото място в друга епоха.",
    real: "Реално място",
    captions: [
      "Площад „Ларго“, София. Днес и през 2200 г.",
      "Ортакьой на Босфора. Днес и Константинопол около 1450 г.",
      "Трокадеро, Париж. Днес и по времето на Световното изложение през 1900 г.",
    ],
    right: ["AI свят · 2200", "AI свят · Константинопол 1450", "AI свят · 1900"],
    cities: ["София", "Истанбул", "Париж"],
  },
  en: {
    eyebrow: "One place · two times",
    title: "Same place, another time",
    subtitle: "On the left is the place today. On the right is the same place in another era.",
    real: "Real place",
    captions: [
      "Largo Square, Sofia. Today and in the year 2200.",
      "Ortaköy on the Bosphorus. Today and Constantinople around 1450.",
      "Trocadéro, Paris. Today and at the 1900 World's Fair.",
    ],
    right: ["AI world · 2200", "AI world · Constantinople 1450", "AI world · 1900"],
    cities: ["Sofia", "Istanbul", "Paris"],
  },
} as const;

describe("WorldSlider", () => {
  it("renders three worlds and supports keyboard and button selection", () => {
    reducedMotion();
    render(<WorldSlider />);

    const group = screen.getByRole("group", { name: "Избери свят" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(3);

    const slider = screen.getByRole("slider", {
      name: "Граница между реалния и AI света",
    });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "54");
    expect(slider).toHaveAttribute("aria-valuetext", "Реално място 54%, AI свят 46%");

    fireEvent.click(buttons[1]!);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
  });

  it.each(["bg", "en"] as const)(
    "shows the %s copy, labels and one-fact caption for each world",
    (locale) => {
      activeLocale = locale;
      reducedMotion();
      const { container } = render(<WorldSlider />);
      const copy = COPY[locale];
      expect(screen.getByText(copy.eyebrow)).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(copy.title);
      expect(screen.getByText(copy.subtitle)).toBeInTheDocument();
      expect(screen.getByRole("slider")).toHaveAttribute(
        "aria-valuetext",
        `${copy.real} 50%, ${locale === "bg" ? "AI свят" : "AI world"} 50%`,
      );

      const buttons = within(
        screen.getByRole("group", { name: messages[locale].home.worldSlider.chooseWorld }),
      ).getAllByRole("button");
      copy.cities.forEach((city, i) => {
        fireEvent.click(buttons[i]!);
        const left = container.querySelector(".world-slider-chip.is-left")!;
        const right = container.querySelector(".world-slider-chip.is-right")!;
        expect(left.textContent).toBe(`${copy.real} · ${city}`);
        expect(right.textContent).toBe(copy.right[i]);
        expect(container.querySelector(".world-slider-caption")).toHaveTextContent(
          copy.captions[i]!,
        );
      });
    },
  );

  it.each(["bg", "en"] as const)(
    "never tells the %s visitor what changes or how to drag",
    (locale) => {
      activeLocale = locale;
      reducedMotion();
      const { container } = render(<WorldSlider />);
      const buttons = container.querySelectorAll(".world-slider-selector button");
      const texts: string[] = [];
      for (const button of buttons) {
        fireEvent.click(button);
        texts.push(container.textContent ?? "");
        texts.push(screen.getByRole("slider").getAttribute("aria-valuetext") ?? "");
      }
      const all = texts.join(" ");
      expect(all).not.toMatch(/влач|стрелк|drag|arrow/i);
      expect(all).not.toMatch(/лицето|стойката|дрехите|the face|the pose|clothes/i);
      expect(all).not.toMatch(/Реален свят|Real world/);
    },
  );

  it("swaps the blurred backdrop with the chosen world and keeps it inert", () => {
    reducedMotion();
    const { container } = render(<WorldSlider />);
    const section = container.querySelector("section.world-slider-section")!;
    const backdrop = section.querySelector<HTMLElement>(":scope > .world-slider-backdrop")!;
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(backdrop.querySelector("a, button, img, [tabindex]")).toBeNull();
    const layers = [...backdrop.querySelectorAll<HTMLElement>(".world-slider-backdrop-layer")];
    expect(layers).toHaveLength(WORLD_SLIDES.length);
    const active = () => layers.map((layer) => layer.classList.contains("is-active"));

    // Only the first world's image is asked for until another world is chosen.
    expect(active()).toEqual([true, false, false]);
    expect(layers[0]!.style.backgroundImage).toBe(`url(${WORLD_SLIDES[0]!.ai.image})`);
    expect(layers[1]!.style.backgroundImage).toBe("");
    expect(layers[2]!.style.backgroundImage).toBe("");

    const buttons = section.querySelectorAll<HTMLButtonElement>(".world-slider-selector button");
    fireEvent.click(buttons[2]!);
    expect(active()).toEqual([false, false, true]);
    // The previous world keeps its image so it can fade out under the new one.
    expect(layers[0]!.style.backgroundImage).toBe(`url(${WORLD_SLIDES[0]!.ai.image})`);
    expect(layers[2]!.style.backgroundImage).toBe(`url(${WORLD_SLIDES[2]!.ai.image})`);

    fireEvent.click(buttons[1]!);
    expect(active()).toEqual([false, true, false]);
    expect(layers[1]!.style.backgroundImage).toBe(`url(${WORLD_SLIDES[1]!.ai.image})`);

    // Moving the divider never touches the backdrop.
    const before = backdrop.innerHTML;
    fireEvent.keyDown(screen.getByRole("slider"), { key: "End" });
    expect(backdrop.innerHTML).toBe(before);
  });

  it("styles the backdrop as a static blur that only fades its opacity", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ");
    const body = (selector: string) =>
      css.match(
        new RegExp(`(?:^|[}\\s])${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`),
      )?.[1] ?? "";
    const section = body(".world-slider-section");
    // Stage 9d: the section no longer clips; the backdrop clips itself and runs on below the
    // section (behind the AI intro) so it can merge into the first hall's scene.
    expect(section).not.toContain("overflow: hidden");
    expect(section).toContain("isolation: isolate");
    const backdrop = body(".world-slider-backdrop");
    expect(backdrop).toContain("z-index: -1");
    expect(backdrop).toContain("pointer-events: none");
    expect(backdrop).toContain("inset: 0 0 calc(-1 * var(--ai-merge-out))");
    expect(backdrop).toContain("overflow: hidden");
    // Stage 9a: the mock's backdrop (.sl-bg + .sl::after): a lighter blur, a top-to-bottom wash,
    // no mask. Stage 9d: the wash ends in navy only at the end of the extension, not at the
    // slider's bottom edge (no flat band before the halls).
    expect(backdrop).not.toContain("mask-image");
    const wash = body(".world-slider-backdrop::after");
    expect(wash).toContain(
      "linear-gradient( 180deg, rgb(12 23 41 / 0.55) 0, rgb(12 23 41 / 0.25) calc(40% - 224px), rgb(12 23 41 / 0.42) calc(100% - var(--ai-merge-out)), rgb(12 23 41 / 0.5) calc(100% - 140px), #0c1729 100% )",
    );
    const layer = body(".world-slider-backdrop-layer");
    expect(layer).toContain("inset: -5%");
    expect(layer).toContain("filter: blur(18px) saturate(0.9) brightness(0.7)");
    expect(layer).toContain("opacity: 0");
    expect(layer).toContain("transition: opacity 700ms cubic-bezier(0.65, 0, 0.25, 1)");
    expect(body(".world-slider-backdrop-layer.is-active")).toContain("opacity: 0.55");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ [^}]*\.world-slider-backdrop-layer[^{]*\{ transition: none;/,
    );
  });
});
