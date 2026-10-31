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
import { CollectionHalls } from "@/components/ai-exhibition";
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
const GOLD = "#e2b14e";
const INK = "#1b1610";
// Muted golds that must never paint an interactive hover, focus or pressed state: PR #13's
// hover/pressed fills and the decorative --gold / --accent tokens.
const MUTED_GOLDS = ["#c9a46b", "#b8935a", "oklch(0.7 0.095 78)", "oklch(0.72 0.095 78)"];
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

describe("AI Worlds overview halls", () => {
  it.each(["bg", "en"] as const)(
    "enters each %s collection through one named link that leaves the photo outside",
    async (locale) => {
      const m = messages[locale].ai;
      const { container } = await renderAt(`${prefix[locale]}/ai-worlds`, () => (
        <CollectionHalls />
      ));
      const halls = [...container.querySelectorAll("article")];
      expect(halls).toHaveLength(aiCollections.length);
      halls.forEach((hall, index) => {
        const collection = aiCollections[index]!;
        const title = collectionText(collection.title, locale);
        // One stop per hall: the link is its only interactive element.
        expect(hall.querySelectorAll(INTERACTIVE)).toHaveLength(1);
        const link = within(hall).getByRole("link", { name: `${m.exploreCollection}: ${title}` });
        expect(link).toHaveAttribute(
          "href",
          `${prefix[locale]}/ai-worlds/collections/${collection.slug}`,
        );
        expect(link).toHaveTextContent(m.exploreCollection);
        expect(link.querySelector(".ai-artwork-action-primary")).toHaveClass("interaction-primary");
        expect(link.querySelector(`${INTERACTIVE}, img`)).toBeNull();
        // Title and photo stay readable content next to the link, not inside it.
        expect(within(hall).getByRole("heading", { level: 2, name: title })).not.toContainElement(
          link,
        );
        const cover = getCollectionCover(collection, locale);
        if (cover) {
          const photo = within(hall).getByAltText(cover.alt);
          expect(link).not.toContainElement(photo);
        }
      });
    },
  );

  it("adds one inert responsive atmosphere to each overview hall only", async () => {
    const expected = ["historical", "professions", "cinema", "world"];
    const { container, unmount } = await renderAt("/ai-worlds", () => <CollectionHalls />);
    const halls = [...container.querySelectorAll<HTMLElement>(".ai-overview-hall")];
    expect(halls).toHaveLength(4);
    halls.forEach((hall, index) => {
      const name = expected[index]!;
      const layer = hall.querySelector<HTMLElement>(`[data-ai-section-background="${name}"]`)!;
      expect(layer).toHaveAttribute("aria-hidden", "true");
      expect(layer).toHaveClass("ai-section-background");
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

    const collection = aiCollections[0]!;
    const collectionView = await renderAt(`/ai-worlds/collections/${collection.slug}`, () => (
      <AiCollectionView collection={collection} />
    ));
    expect(collectionView.container.querySelector(".ai-section-background")).toBeNull();
    collectionView.unmount();

    const work = aiWorks[0]!;
    const detailView = await renderAt(`/ai-worlds/${work.slug}`, () => (
      <AiDetailView work={work} />
    ));
    expect(detailView.container.querySelector(".ai-section-background")).toBeNull();
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

describe("AI Worlds overview hall clicks", () => {
  it("opens the collection from the description and the photo through the one link", async () => {
    const collection = aiCollections[0]!;
    const target = `/ai-worlds/collections/${collection.slug}`;
    for (const part of ["p", "img"] as const) {
      const { container, router, unmount } = await renderAt("/ai-worlds", () => (
        <CollectionHalls />
      ));
      const hall = container.querySelector<HTMLElement>("article")!;
      fireEvent.click(hall.querySelector(part)!);
      await waitFor(() => expect(router.state.location.pathname).toBe(target));
      unmount();
    }
  });
});

describe("AI collection presentations", () => {
  it.each(["bg", "en"] as const)(
    "keep a separate artwork link and full-screen button for every %s work",
    async (locale) => {
      const m = messages[locale].ai;
      for (const collection of aiCollections) {
        const works = getCollectionWorks(collection, locale);
        const { container, unmount } = await renderAt(
          `${prefix[locale]}/ai-worlds/collections/${collection.slug}`,
          () => <AiCollectionView collection={collection} />,
        );
        const presentations = [...container.querySelectorAll("ol.container-page > li > article")];
        expect(presentations).toHaveLength(works.length);
        presentations.forEach((presentation, index) => {
          const work = works[index]!;
          const view = within(presentation as HTMLElement).getByRole("link", {
            name: `${m.viewWork}: ${work.title}`,
          });
          const fullscreen = within(presentation as HTMLElement).getByRole("button", {
            name: m.fullscreen,
          });
          expect(view).toHaveAttribute("href", `${prefix[locale]}/ai-worlds/${work.slug}`);
          expect(view).toHaveClass("interaction-primary");
          expect(fullscreen).toHaveClass("interaction-secondary");
          expect(fullscreen).toHaveAttribute("type", "button");
          // Keyboard order within the actions: the link, then the button.
          expect(view.compareDocumentPosition(fullscreen)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
          // The presentation itself is not a link, and controls are never nested.
          expect(presentation.closest("a")).toBeNull();
          for (const control of presentation.querySelectorAll("a, button")) {
            expect(control.querySelector("a, button")).toBeNull();
          }
        });
        unmount();
      }
    },
    20_000,
  );

  it("opens the full-screen viewer from a presentation's button", async () => {
    const collection = aiCollections[0]!;
    const work = getCollectionWorks(collection, "bg")[0]!;
    const { container } = await renderAt(`/ai-worlds/collections/${collection.slug}`, () => (
      <AiCollectionView collection={collection} />
    ));
    const first = container.querySelector<HTMLElement>("ol.container-page > li > article")!;
    fireEvent.click(within(first).getByRole("button", { name: messages.bg.ai.fullscreen }));
    expect(await screen.findByRole("dialog")).toHaveTextContent(work.title);
  });
});
describe("Design A interaction system", () => {
  it("defines the exact owner-approved tokens", () => {
    expect(css).toContain(`--interaction-cream: ${CREAM};`);
    expect(css).toContain(`--interaction-gold-bright: ${GOLD};`);
    expect(css).toContain(`--interaction-ink-on-gold: ${INK};`);
    // The shared button hover tokens point at the bright gold and its ink.
    expect(css).toContain("--btn-hover-bg: var(--interaction-gold-bright);");
    expect(css).toContain("--btn-hover-fg: var(--interaction-ink-on-gold);");
    expect(css).toContain("--btn-hover-border: var(--interaction-gold-bright);");
    expect(css).toContain("--btn-active-bg: var(--interaction-gold-bright);");
  });

  it("keeps rest cream and hover gold apart (OKLab distance x100 >= 18)", () => {
    expect(deltaEok(CREAM, GOLD)).toBeGreaterThanOrEqual(18);
  });

  it("keeps every text pair readable (WCAG >= 4.5:1)", () => {
    expect(contrast(INK, CREAM)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, GOLD)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(CREAM, NAVY)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(GOLD, NAVY)).toBeGreaterThanOrEqual(4.5);
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

  it("lights title and button together when the pointer is over the button", () => {
    const hover = rule(".interaction-primary:hover", POINTER)!.body;
    expect(hover).toContain("background-color: var(--btn-hover-bg)");
    expect(hover).toContain("border-color: var(--btn-hover-border)");
    expect(hover).toContain("color: var(--btn-hover-fg)");
    expect(hover).toContain(
      "box-shadow: 0 0 0 6px var(--interaction-ring), 0 12px 32px var(--interaction-halo)",
    );
    expect(
      rule(
        ".ai-presentation-title:hover, .ai-presentation:has(.ai-artwork-action-primary:hover) .ai-presentation-title",
        POINTER,
      )!.body,
    ).toBe("color: var(--btn-hover-bg);");
  });

  it("lights title and button together when the pointer is over the title", () => {
    const pair = ".ai-presentation:has(.ai-presentation-title:hover)";
    expect(rule(`${pair} .ai-artwork-action-primary`, POINTER)!.body).toContain(
      "background-color: var(--btn-hover-bg)",
    );
    const motion = `${POINTER} and (prefers-reduced-motion: no-preference)`;
    expect(rule(`${pair} .ai-artwork-action-primary`, motion)!.body).toBe("translate: 0 -2px;");
    expect(rule(`${pair} .ai-artwork-action-arrow`, motion)!.body).toBe("translate: 6px 0;");
    // The title hover zone is its own text box, not the full column.
    expect(rule(".ai-presentation-title")!.body).toContain("width: fit-content");
  });

  it("leaves description, count, image and empty space out of the pair", () => {
    const hovers = rules.filter(
      (r) => r.selector.includes(".ai-presentation") && r.selector.includes(":hover"),
    );
    expect(hovers.length).toBeGreaterThan(0);
    for (const r of hovers) {
      // Hovering the container itself (which covers the empty space) never triggers anything.
      expect(r.selector).not.toMatch(/\.ai-presentation:hover/);
      for (const part of r.selector.match(/[.\w-]+:hover/g) ?? []) {
        expect([
          ".ai-presentation-title:hover",
          ".ai-artwork-action-primary:hover",
          ".ai-presentation-media:hover",
        ]).toContain(part);
      }
    }
    // Hovering the photo only zooms it.
    expect(
      rule(
        ".ai-presentation-media:hover img",
        `${POINTER} and (prefers-reduced-motion: no-preference)`,
      )!.body,
    ).toBe("scale: 1.03;");
  });

  it("lights title and button together on keyboard focus", () => {
    expect(rule(".interaction-primary:focus-visible")!.body).toContain(
      "background-color: var(--interaction-gold-bright)",
    );
    const focused = rules.find(
      (r) =>
        r.selector.includes(".ai-presentation-link") &&
        r.selector.endsWith(".ai-presentation-title"),
    )!;
    expect(focused.selector).toContain(":focus-visible");
    expect(focused.body).toBe("color: var(--interaction-gold-bright);");
  });

  it("never paints the description or the count with the title", () => {
    for (const r of rules.filter((r) => r.selector.startsWith(".ai-presentation"))) {
      expect(r.selector).not.toMatch(/(\sp\b|lead|count)/);
    }
  });

  it("keeps hover pointer-only and every movement optional", () => {
    for (const r of rules.filter((r) =>
      /interaction-|ai-presentation|ai-artwork/.test(r.selector),
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
      "--interaction-focus-ring: var(--interaction-gold-bright)",
    );
    const shared = rules.find((r) => r.selector.endsWith(".interaction-special:focus-visible"))!;
    expect(shared.body).toContain("outline: 2px solid var(--interaction-focus-ring)");
    expect(shared.body).toContain("outline-offset: 3px");
    // Non-text contrast of the ring against the surrounding light page (WCAG >= 3:1).
    expect(contrast(INK, LIGHT_PAGE)).toBeGreaterThanOrEqual(3);
    expect(contrast(INK, CREAM)).toBeGreaterThanOrEqual(3);
    expect(contrast(GOLD, NAVY)).toBeGreaterThanOrEqual(3);
  });

  it("never paints an interactive hover, focus or pressed state with a muted gold", () => {
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
        // Text on light pages may use the dark --gold-ink; fills, borders and rings may not.
        const scopes = name === "color" ? [light] : [light, dark];
        for (const scope of scopes) {
          const value = resolve(rest.join(":").trim(), scope);
          for (const muted of MUTED_GOLDS) {
            expect(value, `${r.selector} { ${name} }`).not.toContain(muted);
          }
        }
      }
    }
    // Tailwind state utilities in components use the bright interaction gold, never --gold.
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
    const second = container.querySelectorAll<HTMLElement>("ol.container-page > li > article")[1]!;
    const opener = within(second).getByRole("button", { name: messages.bg.ai.fullscreen });
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

  it("paints rest, selected, hover and focus with the approved values", () => {
    const container = rule(".ai-view-switch")!.body;
    expect(container).toContain("border-radius: 999px");
    expect(container).toContain("padding: 5px");
    expect(container).toContain("gap: 4px");
    expect(container).toContain("border: 1px solid rgb(244 238 225 / 0.22)");
    expect(container).toContain("background-color: rgb(244 238 225 / 0.04)");
    const tab = rule(".ai-view-switch-tab")!.body;
    expect(tab).toContain("min-height: 44px");
    expect(tab).toContain("border-radius: 999px");
    expect(tab).toContain("background-color: transparent");
    expect(tab).toContain("color: #cfcabd");
    expect(tab).not.toMatch(/border-bottom|inset/);
    const selected = rule('.ai-view-switch-tab[aria-pressed="true"]')!.body;
    expect(selected).toContain("background-color: var(--interaction-cream)");
    expect(selected).toContain("color: var(--interaction-ink-on-gold)");
    const hover = rule(".ai-view-switch-tab:hover", POINTER)!.body;
    expect(hover).toContain("background-color: var(--interaction-gold-bright)");
    expect(hover).toContain("color: var(--interaction-ink-on-gold)");
    const focus = rule(".ai-view-switch-tab:focus-visible")!.body;
    expect(focus).toContain("outline: 2px solid var(--interaction-gold-bright)");
    expect(focus).toContain("outline-offset: 3px");
  });

  it("keeps the switch hover pointer-only and its movement optional", () => {
    const own = rules.filter((r) => r.selector.includes("ai-view-switch"));
    expect(own.some((r) => r.selector.includes(":hover"))).toBe(true);
    for (const r of own) {
      if (r.selector.includes(":hover")) expect(r.context).toContain(POINTER);
      if (/translate: 0 -1px|scale: 0\.98/.test(r.body)) {
        expect(r.context).toContain("(prefers-reduced-motion: no-preference)");
      }
    }
  });

  it("keeps switch text readable in every state (WCAG >= 4.5:1)", () => {
    // Rest: #cfcabd over the 4% cream wash on navy (#162134).
    expect(contrast("#cfcabd", "#162134")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, CREAM)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, GOLD)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Dash-free wordmark", () => {
  it.each(["bg", "en"] as const)("names the %s brand link Chefo Visual Worlds", async (locale) => {
    await renderAt(`${prefix[locale]}/`, () => <Wordmark />);
    const link = screen.getByRole("link", { name: "Chefo Visual Worlds" });
    expect(link).toHaveAttribute("href", locale === "en" ? "/en" : "/");
    expect(link.textContent).not.toMatch(/[—–\-·|/]/);
    expect(link.textContent?.replace(/\s+/g, " ").trim()).toBe("CHEFO VISUAL WORLDS");
  });
});
