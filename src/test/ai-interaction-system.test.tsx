import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AiHalls } from "@/components/ai-halls";
import {
  aiCollections,
  collectionText,
  getCollectionCover,
  getCollectionWorks,
} from "@/content/ai-collections";
import { messages } from "@/i18n/messages";
import { aiWorks } from "@/content/ai-works";
import { AiCollectionView, AiDetailView, AiWorldsView } from "@/views/ai-worlds";
import { Wordmark } from "@/components/site";

// Renders a view inside a real router at `path`, so links and locale are the real ones.
const renderAt = async (path: string, view: () => ReactNode) => {
  const root = createRootRoute();
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: "$", component: view }),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return { ...render(<RouterProvider router={router} />), router };
};

const prefix = { bg: "", en: "/en" } as const;
const INTERACTIVE = "a[href], button, input, select, textarea, [tabindex]";
const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");

// sRGB hex -> linear RGB -> OKLab (Bjorn Ottosson), for exact token comparisons.
const linear = (hex: string) =>
  [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
const oklab = (hex: string) => {
  const [r, g, b] = linear(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ] as const;
};
// OKLab distance scaled by 100, the algorithm the guard has always used.
const deltaEok = (a: string, b: string) => {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
};
const luminance = (hex: string) => {
  const [r, g, b] = linear(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
};
const CREAM = "#f4eee1";
// The one calm hover gold and its darker pressed shade.
const GOLD = "#c9a46b";
const PRESSED = "#b8935a";
const INK = "#1b1610";
// The bright amber-orange that the hover gold replaced (assembled so this file never contains it).
const ORANGE = ["e2b1" + "4e", "226 177 " + "78", "226, 177, " + "78"];
// --navy, oklch(0.21 0.045 262), and the light --background, oklch(0.965 0.017 85), in sRGB.
const NAVY = "#0d182d";
const LIGHT_PAGE = "#f9f3e7";

// Every style rule with the at-rules that enclose it, so tests can check where a hover lives.
const rules = (() => {
  const found: { selector: string; body: string; context: string }[] = [];
  const stack: string[] = [];
  let buffer = "";
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      stack.push(buffer.trim().replace(/\s+/g, " "));
      buffer = "";
    } else if (ch === "}") {
      const selector = stack.pop() ?? "";
      if (!selector.startsWith("@") && buffer.includes(":")) {
        found.push({
          selector,
          body: buffer.trim().replace(/\s+/g, " "),
          context: stack.join(" "),
        });
      }
      buffer = "";
    } else buffer += ch;
  }
  return found;
})();
const rule = (selector: string, context = "") =>
  rules.find((r) => r.selector === selector && r.context === context);
const POINTER = "@media (hover: hover) and (pointer: fine)";

afterEach(cleanup);

// Stage 6b: the halls of the approved mock (AiHalls) and the compact collection grid replaced
// the old halls, the pinned scenes and the wall of large works.
describe("AI Worlds overview halls", () => {
  it.each(["bg", "en"] as const)(
    "enters each %s collection through one named link, with its photos linking to their works",
    async (locale) => {
      const m = messages[locale].ai;
      const { container } = await renderAt(`${prefix[locale]}/ai-worlds`, () => <AiHalls />);
      const halls = [...container.querySelectorAll("article")];
      expect(halls).toHaveLength(aiCollections.length);
      halls.forEach((hall, index) => {
        const collection = aiCollections[index]!;
        const title = collectionText(collection.title, locale);
        const toCollection = hall.querySelectorAll(
          `a[href$="/ai-worlds/collections/${collection.slug}"]`,
        );
        expect(toCollection).toHaveLength(1);
        const link = within(hall).getByRole("link", { name: `${m.exploreCollection}: ${title}` });
        expect(link).toBe(toCollection[0]);
        expect(link).toHaveTextContent(m.exploreCollection);
        expect(link).toHaveClass("ai-fan");
        expect(link.querySelector(`${INTERACTIVE}, img`)).toBeNull();
        // Title and photos stay outside the collection link.
        expect(within(hall).getByRole("heading", { level: 2, name: title })).not.toContainElement(
          link,
        );
        // The three photos are the collection's first three works, each linking to its page.
        const works = getCollectionWorks(collection, locale).slice(0, 3);
        const shots = [...hall.querySelectorAll<HTMLAnchorElement>("a.ai-hall-shot")];
        expect(shots.map((a) => a.getAttribute("href"))).toEqual(
          works.map((w) => `${prefix[locale]}/ai-worlds/${w.slug}`),
        );
        shots.forEach((shot, k) => {
          expect(shot).toHaveAccessibleName(works[k]!.alt);
          expect(link).not.toContainElement(shot);
        });
      });
    },
  );

  it("adds one inert responsive scene to each hall, never to an artwork page", async () => {
    const expected = ["historical", "professions", "cinema", "world"];
    const { container, unmount } = await renderAt("/ai-worlds", () => <AiHalls />);
    const halls = [...container.querySelectorAll<HTMLElement>(".ai-hall")];
    expect(halls).toHaveLength(4);
    halls.forEach((hall, index) => {
      const name = expected[index]!;
      const layer = hall.querySelector<HTMLElement>(`[data-ai-section-background="${name}"]`)!;
      expect(layer).toHaveAttribute("aria-hidden", "true");
      expect(layer).toHaveClass("ai-hall-bg");
      expect(layer.closest("a, button")).toBeNull();
      const source = layer.querySelector("source")!;
      expect(source).toHaveAttribute("media", "(max-width: 767px)");
      expect(source).toHaveAttribute("srcset", `/background/ai-bg-${name}-960.webp`);
      const image = layer.querySelector("img")!;
      expect(image).toHaveAttribute("src", `/background/ai-bg-${name}-1600.webp`);
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("aria-hidden", "true");
      // Only the first hall can be in the initial viewport; the rest load on approach.
      expect(image).toHaveAttribute("loading", index === 0 ? "eager" : "lazy");
      expect(image).toHaveAttribute("decoding", "async");
      expect(image).toHaveAttribute("width", "1600");
      expect(image).toHaveAttribute("height", "900");
    });
    unmount();

    const work = aiWorks[0]!;
    const detailView = await renderAt(`/ai-worlds/${work.slug}`, () => (
      <AiDetailView work={work} />
    ));
    expect(detailView.container.querySelector("[data-ai-section-background]")).toBeNull();
    detailView.unmount();
  });

  it("ships exactly the eight WebP derivatives and no PNG source", () => {
    expect(readdirSync(path.resolve(__dirname, "../../public/background")).sort()).toEqual([
      "ai-bg-cinema-1600.webp",
      "ai-bg-cinema-960.webp",
      "ai-bg-historical-1600.webp",
      "ai-bg-historical-960.webp",
      "ai-bg-professions-1600.webp",
      "ai-bg-professions-960.webp",
      "ai-bg-world-1600.webp",
      "ai-bg-world-960.webp",
    ]);
  });
});

describe("AI collection page atmosphere", () => {
  const scenes = {
    "historical-eras-rulers": "historical",
    "professions-roles": "professions",
    "cinema-archetypes": "cinema",
    "chefo-around-the-world": "world",
  } as const;

  it.each(["bg", "en"] as const)(
    "shows each %s collection page its own hall scene behind the whole page",
    async (locale) => {
      expect(aiCollections.map((c) => c.slug)).toEqual(Object.keys(scenes));
      for (const collection of aiCollections) {
        const name = scenes[collection.slug as keyof typeof scenes];
        const { container, unmount } = await renderAt(
          `${prefix[locale]}/ai-worlds/collections/${collection.slug}`,
          () => <AiCollectionView collection={collection} />,
        );
        const page = container.querySelector<HTMLElement>("article.ai-col-page")!;
        expect(page).toHaveClass("surface-dark");
        const layers = page.querySelectorAll<HTMLElement>("[data-ai-section-background]");
        expect(layers).toHaveLength(1);
        const layer = layers[0]!;
        // First in the page, a sibling of the content, so everything else paints over it.
        expect(page.firstElementChild).toBe(layer);
        expect(layer).toHaveAttribute("data-ai-section-background", name);
        expect(layer).toHaveClass("ai-col-bd");
        expect(layer).toHaveAttribute("aria-hidden", "true");
        expect(layer.querySelector(INTERACTIVE)).toBeNull();
        // The same two files as the hall, so they come from the browser cache.
        expect(layer.querySelector("source")).toHaveAttribute(
          "srcset",
          `/background/ai-bg-${name}-960.webp`,
        );
        expect(layer.querySelector("picture")).toHaveClass("ai-col-st");
        const image = layer.querySelector("img")!;
        expect(image).toHaveAttribute("src", `/background/ai-bg-${name}-1600.webp`);
        expect(image).toHaveAttribute("alt", "");
        expect(image).toHaveAttribute("loading", "eager");
        expect(image).toHaveAttribute("width", "1600");
        expect(image).toHaveAttribute("height", "900");
        // Header, tab row, grid and cards sit on top of it.
        expect(page.querySelector(":scope > header")).toHaveClass("ai-col-head");
        expect(page.querySelector("ol.ai-thumb-grid")).toBeInTheDocument();
        unmount();
      }
    },
    20_000,
  );

  it("keeps the scene sticky behind the article, blurred as in the mock, and never over the footer", () => {
    const scene = rule(".ai-col-st")!.body;
    expect(scene).toContain("position: sticky");
    expect(scene).toContain("top: 0");
    expect(scene).toContain("height: 100svh");
    expect(rule(".ai-col-st img")!.body).toContain(
      "filter: blur(6px) saturate(0.9) brightness(1.35)",
    );
    expect(rule(".ai-col-bd")!.body).toContain("z-index: -1");
    expect(
      rules.some((r) => r.selector === ".ai-col-page" && r.body.includes("overflow-x: clip")),
    ).toBe(true);
    expect(rule(".ai-hall-bg img")!.body).toContain(
      "filter: blur(6px) saturate(0.9) brightness(1.5)",
    );
    expect(rule(".ai-overview-hall")).toBeUndefined();
  });
});

describe("AI Worlds hall links", () => {
  it("opens the collection from its button and a work from its photo", async () => {
    const collection = aiCollections[0]!;
    const work = getCollectionWorks(collection, "bg")[0]!;
    for (const [selector, target] of [
      [".ai-fan", `/ai-worlds/collections/${collection.slug}`],
      ["a.ai-hall-shot", `/ai-worlds/${work.slug}`],
    ] as const) {
      const { container, router, unmount } = await renderAt("/ai-worlds", () => <AiHalls />);
      fireEvent.click(container.querySelector("article")!.querySelector(selector)!);
      await waitFor(() => expect(router.state.location.pathname).toBe(target));
      unmount();
    }
  });
});

describe("AI collection tiles", () => {
  it.each(["bg", "en"] as const)(
    "keep a separate artwork link and full-screen button for every %s work",
    async (locale) => {
      for (const collection of aiCollections) {
        const works = getCollectionWorks(collection, locale);
        const { container, unmount } = await renderAt(
          `${prefix[locale]}/ai-worlds/collections/${collection.slug}`,
          () => <AiCollectionView collection={collection} />,
        );
        const tiles = [...container.querySelectorAll("ol.ai-thumb-grid > li")];
        expect(tiles).toHaveLength(works.length);
        tiles.forEach((tile, index) => {
          const work = works[index]!;
          const view = within(tile as HTMLElement).getByRole("link", { name: work.title });
          const fullscreen = within(tile as HTMLElement).getByRole("button", {
            name: messages[locale].common.openFullscreen(work.title),
          });
          expect(view).toHaveAttribute("href", `${prefix[locale]}/ai-worlds/${work.slug}`);
          expect(view).toHaveClass("ai-thumb-title");
          expect(fullscreen).toHaveClass("ai-thumb-im");
          expect(fullscreen).toHaveAttribute("type", "button");
          // Keyboard order within a tile: the image button, then the title link.
          expect(fullscreen.compareDocumentPosition(view)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
          // Controls are never nested.
          for (const control of tile.querySelectorAll("a, button")) {
            expect(control.querySelector("a, button")).toBeNull();
          }
        });
        unmount();
      }
    },
    20_000,
  );

  it("opens the full-screen viewer from a tile's image", async () => {
    const collection = aiCollections[0]!;
    const work = getCollectionWorks(collection, "bg")[0]!;
    const { container } = await renderAt(`/ai-worlds/collections/${collection.slug}`, () => (
      <AiCollectionView collection={collection} />
    ));
    const first = container.querySelector<HTMLElement>("ol.ai-thumb-grid > li")!;
    fireEvent.click(
      within(first).getByRole("button", { name: messages.bg.common.openFullscreen(work.title) }),
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(work.title);
  });
});
describe("Design A interaction system", () => {
  it("defines the exact owner-approved tokens", () => {
    expect(css).toContain(`--interaction-cream: ${CREAM};`);
    expect(css).toContain(`--interaction-ink-on-gold: ${INK};`);
    // One hover gold (the single source), a darker pressed gold, and the dark ink on both.
    expect(css).toContain(`--btn-hover-bg: ${GOLD};`);
    expect(css).toContain(`--btn-active-bg: ${PRESSED};`);
    expect(css).toContain("--btn-hover-fg: var(--interaction-ink-on-gold);");
    expect(css).toContain("--btn-hover-border: var(--btn-hover-bg);");
    expect(css).toContain("--interaction-gold: var(--btn-hover-bg);");
  });

  it("keeps rest cream and hover gold apart (OKLab distance x100 >= 18)", () => {
    expect(deltaEok(CREAM, GOLD)).toBeGreaterThanOrEqual(18);
  });

  it("keeps every text pair readable (WCAG >= 4.5:1)", () => {
    expect(contrast(INK, CREAM)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, GOLD)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, PRESSED)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(CREAM, NAVY)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(GOLD, NAVY)).toBeGreaterThanOrEqual(4.5);
  });

  it("presses into a darker gold, never brighter than hover and without movement", () => {
    expect(luminance(PRESSED)).toBeLessThan(luminance(GOLD));
    const pressed = rules.find((r) => r.selector.includes(".ai-view-switch-tab:active"))!;
    for (const part of [
      ".interaction-primary:active",
      "a.back-pill:active",
      ".surface-dark a.back-pill:active",
    ]) {
      expect(pressed.selector).toContain(part);
    }
    // It comes after every hover fill, so a more specific hover never hides the pressed gold.
    const at = rules.indexOf(pressed);
    for (const hover of [
      ".ai-view-switch-tab:hover",
      "a.back-pill:hover",
      ".surface-dark a.back-pill:hover",
    ]) {
      expect(rules.findIndex((r) => r.selector === hover)).toBeLessThan(at);
    }
    expect(pressed.body).toContain("background-color: var(--btn-active-bg)");
    expect(pressed.body).toContain("color: var(--btn-hover-fg)");
    expect(pressed.body).toContain("box-shadow: none");
    for (const r of rules.filter((r) => r.selector.includes(":active"))) {
      expect(r.body, r.selector).not.toMatch(/scale|translate/);
    }
  });

  it("fills the primary action with cream at rest, never a dark outline", () => {
    const rest = rule(".interaction-primary")!.body;
    expect(rest).toContain("background-color: var(--interaction-cream)");
    expect(rest).toContain("color: var(--interaction-ink-on-gold)");
    expect(rule(".interaction-primary, .interaction-secondary")!.body).toContain(
      "min-height: 44px",
    );
    // On dark surfaces the border is cream too, so the button reads as one filled shape.
    expect(rule('.surface-dark, [data-theme="dark"]')!.body).toContain(
      "--interaction-primary-border: var(--interaction-cream)",
    );
  });

  it("keeps the shared primary hover a calm fill change", () => {
    const hover = rule(".interaction-primary:hover", POINTER)!.body;
    expect(hover).toContain("background-color: var(--btn-hover-bg)");
    expect(hover).toContain("border-color: var(--btn-hover-border)");
    expect(hover).toContain("color: var(--btn-hover-fg)");
    // A calm fill change: no glow around the button.
    expect(hover).toContain("box-shadow: none");
  });

  it("sweeps the hall button's gold in on hover and keyboard focus, and presses without movement", () => {
    expect(rule(".ai-fan::before")!.body).toContain("background-color: var(--btn-hover-bg)");
    expect(rule(".ai-fan::before")!.body).toContain("transform: scaleX(0)");
    expect(rule(".ai-fan:hover::before", POINTER)!.body).toBe("transform: scaleX(1);");
    expect(rule(".ai-fan:focus-visible::before")!.body).toBe("transform: scaleX(1);");
    const motion = `${POINTER} and (prefers-reduced-motion: no-preference)`;
    expect(rule(".ai-fan:hover .ai-fan-arrow", motion)!.body).toBe(
      "transform: scaleX(1.7) translateX(3px);",
    );
    expect(rule(".ai-fan:active")!.body).toBe("background-color: var(--btn-active-bg);");
  });

  it("fans the hall's works out only while its button is hovered or focused", () => {
    const motion = `${POINTER} and (prefers-reduced-motion: no-preference)`;
    expect(rule(".ai-hall:has(.ai-fan:hover) .ai-hall-shot", motion)!.body).toContain(
      "transform: translate(8px, -6px)",
    );
    expect(
      rule(
        ".ai-hall:has(.ai-fan:focus-visible) .ai-hall-shot",
        "@media (prefers-reduced-motion: no-preference)",
      )!.body,
    ).toContain("transform: translate(8px, -6px)");
  });

  it("lights a tile with a soft gold hairline and a slight zoom (fine pointers only)", () => {
    expect(rule(".ai-thumb:hover .ai-thumb-im", POINTER)!.body).toContain(
      "0 0 0 1px rgb(201 164 107 / 0.7)",
    );
    const motion = `${POINTER} and (prefers-reduced-motion: no-preference)`;
    expect(rule(".ai-thumb:hover .ai-thumb-im img", motion)!.body).toBe("transform: scale(1.05);");
  });

  it("keeps hover pointer-only and every movement optional", () => {
    for (const r of rules.filter((r) =>
      /interaction-|ai-hall|ai-fan|ai-thumb|ai-filter|collection-tab/.test(r.selector),
    )) {
      if (r.selector.includes(":hover")) expect(r.context).toContain(POINTER);
      if (/translate: (0 -2px|6px 0)|scale: 0\.98/.test(r.body)) {
        expect(r.context).toContain("(prefers-reduced-motion: no-preference)");
      }
    }
    const reduced = rules.find(
      (r) =>
        r.context === "@media (prefers-reduced-motion: reduce)" &&
        r.selector.includes(".interaction-primary"),
    )!;
    expect(reduced.body).toContain("translate: none !important");
    expect(reduced.body).toContain("scale: none !important");
  });

  it("draws a dark focus ring on light surfaces and a gold one on dark surfaces", () => {
    expect(css).toContain("--interaction-focus-ring: var(--interaction-ink-on-gold);");
    expect(rule('.surface-dark, [data-theme="dark"]')!.body).toContain(
      "--interaction-focus-ring: var(--interaction-gold)",
    );
    const shared = rules.find((r) => r.selector.endsWith(".interaction-special:focus-visible"))!;
    expect(shared.body).toContain("outline: 2px solid var(--interaction-focus-ring)");
    expect(shared.body).toContain("outline-offset: 3px");
    // Non-text contrast of the ring against the surrounding light page (WCAG >= 3:1).
    expect(contrast(INK, LIGHT_PAGE)).toBeGreaterThanOrEqual(3);
    expect(contrast(INK, CREAM)).toBeGreaterThanOrEqual(3);
    expect(contrast(GOLD, NAVY)).toBeGreaterThanOrEqual(3);
  });

  it("never paints an interactive hover, focus or pressed state with the old orange", () => {
    // Custom properties as declared on :root and on dark surfaces (dark wins where both exist).
    const tokens = (selector: string) =>
      new Map(
        rules
          .filter((r) => r.selector === selector)
          .flatMap((r) => r.body.split(";"))
          .map((d) => d.trim().match(/^(--[\w-]+):\s*(.+)$/))
          .filter((m): m is RegExpMatchArray => m !== null)
          .map((m) => [m[1]!, m[2]!.trim()] as const),
      );
    const light = tokens(":root");
    const dark = new Map([...light, ...tokens('.surface-dark, [data-theme="dark"]')]);
    const resolve = (value: string, scope: Map<string, string>, depth = 0): string =>
      depth > 10
        ? value
        : value.replace(/var\((--[\w-]+)\)/g, (_, name: string) =>
            resolve(scope.get(name) ?? name, scope, depth + 1),
          );
    const states = rules.filter((r) =>
      /:(hover|focus-visible|focus-within|active)\b/.test(r.selector),
    );
    expect(states.length).toBeGreaterThan(30);
    for (const r of states) {
      for (const declaration of r.body.split(";")) {
        const [property, ...rest] = declaration.split(":");
        const name = property!.trim();
        const painted =
          /^(color|background(-color)?|border(-\w+)*-color|border|outline(-color)?|box-shadow|text-decoration-color)$/;
        if (!painted.test(name)) continue;
        for (const scope of [light, dark]) {
          const value = resolve(rest.join(":").trim(), scope).toLowerCase();
          for (const orange of ORANGE) {
            expect(value, `${r.selector} { ${name} }`).not.toContain(orange);
          }
        }
      }
    }
    // No source file brings the orange back, in any spelling.
    const everything = readdirSync(path.resolve(__dirname, ".."), {
      recursive: true,
      withFileTypes: true,
    })
      .filter(
        (f) => f.isFile() && /\.(css|tsx?|mjs)$/.test(f.name) && f.name !== "routeTree.gen.ts",
      )
      .map((f) => [f.name, readFileSync(path.join(f.parentPath, f.name), "utf8").toLowerCase()]);
    expect(everything.length).toBeGreaterThan(50);
    for (const [name, source] of everything) {
      for (const orange of ORANGE) expect(source, name).not.toContain(orange);
    }
    // Tailwind state utilities in components use the interaction gold, never the decorative --gold.
    const sources = ["components", "views", "i18n", "routes"].flatMap((dir) =>
      readdirSync(path.resolve(__dirname, "..", dir), { recursive: true, withFileTypes: true })
        .filter((f) => f.isFile() && f.name.endsWith(".tsx"))
        .map((f) => readFileSync(path.join(f.parentPath, f.name), "utf8")),
    );
    for (const source of sources) {
      expect(source).not.toMatch(
        /\b(?:group-)?(?:hover|focus-visible|focus-within|active):(?:bg|border|ring|text|outline|decoration)-gold\b/,
      );
    }
  });

  it("keeps ink text on the back pill's bright fill in editorial albums", () => {
    // The editorial album recolours its text links on hover; the back pill is not one of them.
    expect(
      rules.find(
        (r) => r.body === "color: var(--gold-ink);" && r.selector.startsWith(".editorial-album a"),
      )!.selector,
    ).toBe(".editorial-album a:not(.next-album-card):not(.back-pill):hover");
    expect(rule("a.back-pill:hover", POINTER)!.body).toContain("color: var(--btn-hover-fg)");
  });

  it("leaves the Home Hero CTA outside the shared system", () => {
    for (const r of rules.filter((r) => r.selector.includes("hero-cta"))) {
      expect(r.body).not.toContain("--interaction-");
    }
  });

  it("returns focus to the exact full-screen opener after Escape", async () => {
    const collection = aiCollections[1]!;
    const { container } = await renderAt(`/ai-worlds/collections/${collection.slug}`, () => (
      <AiCollectionView collection={collection} />
    ));
    const second = container.querySelectorAll<HTMLElement>("ol.ai-thumb-grid > li")[1]!;
    const opener = within(second).getByRole("button", { name: /в цял екран/ });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

describe("AI Worlds view switch", () => {
  it.each(["bg", "en"] as const)(
    "keeps the %s group and pressed semantics as one segmented switch",
    async (locale) => {
      await renderAt(`${prefix[locale]}/ai-worlds`, () => <AiWorldsView />);
      const group = screen.getByRole("group", { name: messages[locale].ai.view });
      expect(group).toHaveClass("ai-view-switch");
      expect(group.className).not.toMatch(/border-b/);
      const [collections, works] = within(group).getAllByRole("button");
      expect(collections).toHaveTextContent(messages[locale].ai.collections);
      expect(works).toHaveTextContent(messages[locale].ai.allWorks);
      expect(collections).toHaveAttribute("aria-pressed", "true");
      expect(works).toHaveAttribute("aria-pressed", "false");
      for (const tab of [collections!, works!]) {
        expect(tab.className).toBe("ai-view-switch-tab");
        // The old flat gold block and underline came from these classes.
        expect(tab.className).not.toMatch(/interaction-control|border-b|border-gold/);
      }
    },
  );

  it("paints rest, selected, hover and focus with the mock's values", () => {
    const container = rule(".ai-view-switch")!.body;
    expect(container).toContain("border-radius: 999px");
    expect(container).toContain("padding: 4px");
    expect(container).toContain("background-color: rgb(244 238 226 / 0.06)");
    expect(container).toContain("box-shadow: inset 0 0 0 1px rgb(246 240 228 / 0.16)");
    const tab = rule(".ai-view-switch-tab")!.body;
    expect(tab).toContain("min-height: 40px");
    expect(tab).toContain("border-radius: 999px");
    expect(tab).toContain("background-color: transparent");
    expect(tab).toContain("color: rgb(244 238 226 / 0.74)");
    expect(tab).toContain("font-size: 12.5px");
    expect(tab).not.toMatch(/border-bottom|inset/);
    // Coarse pointers keep the 44px touch minimum.
    expect(rule(".ai-view-switch-tab", "@media (pointer: coarse)")!.body).toBe("min-height: 44px;");
    const selected = rule('.ai-view-switch-tab[aria-pressed="true"]')!.body;
    expect(selected).toContain("background-color: var(--interaction-cream)");
    expect(selected).toContain("color: var(--navy)");
    const hover = rule('.ai-view-switch-tab:not([aria-pressed="true"]):hover', POINTER)!.body;
    expect(hover).toBe("color: var(--interaction-cream);");
    const focus = rule(".ai-view-switch-tab:focus-visible")!.body;
    expect(focus).toContain("outline: 2px solid var(--interaction-gold)");
    expect(focus).toContain("outline-offset: 2px");
  });

  it("keeps the switch hover pointer-only and without movement", () => {
    const own = rules.filter((r) => r.selector.includes("ai-view-switch"));
    expect(own.some((r) => r.selector.includes(":hover"))).toBe(true);
    for (const r of own) {
      if (r.selector.includes(":hover")) expect(r.context).toContain(POINTER);
      // Only the shared reduced-motion reset may name a transform (to switch it off).
      if (!r.context.includes("prefers-reduced-motion: reduce"))
        expect(r.body).not.toMatch(/translate|scale/);
    }
  });

  it("keeps switch text readable in every state (WCAG >= 4.5:1)", () => {
    // Rest: cream at 74% over the 6% cream wash on the page navy (#0c1729) ~ #b9b7b2 on #171f30.
    expect(contrast("#b9b7b2", "#171f30")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, CREAM)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, GOLD)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Brand lockup hover (the mock's logo)", () => {
  it("rings the portrait in gold and turns Visual Worlds gold, with no underline", () => {
    // Stage 9b: the old wordmark underline is gone.
    expect(rule(".brand-lockup-text")!.body).not.toContain("linear-gradient");
    expect(rule(".brand-lockup:hover img", POINTER)!.body).toBe(
      "transform: rotate(-10deg) scale(1.07); box-shadow: 0 0 0 1.5px currentColor, 0 0 0 5px rgb(201 164 107 / 0.45);",
    );
    expect(rule(".brand-lockup:hover .brand-lockup-text > span:last-child", POINTER)!.body).toBe(
      "color: var(--gold-ink);",
    );
    expect(rule(".interaction-link.brand-lockup:hover", POINTER)!.body).toContain(
      "text-decoration-line: none;",
    );
    expect(rule(".interaction-link.brand-lockup:focus-visible")!.body).toContain(
      "text-decoration-line: none;",
    );
  });
});

describe("Dash-free wordmark", () => {
  it.each(["bg", "en"] as const)("names the %s brand link Chefo Visual Worlds", async (locale) => {
    await renderAt(`${prefix[locale]}/`, () => <Wordmark />);
    const link = screen.getByRole("link", { name: "Chefo Visual Worlds" });
    expect(link).toHaveAttribute("href", locale === "en" ? "/en" : "/");
    expect(link.textContent).not.toMatch(/[—–\-·|/]/);
    expect(link.textContent).toBe("CHEFO VISUAL WORLDS");
    // One inline run with a real word space: no flex gap that would widen the first gap.
    expect(link.className).not.toMatch(/\b(inline-)?flex\b|\bgap-/);
    expect(link.querySelector(".font-bold")!.textContent).toBe("CHEFO");
  });
});
