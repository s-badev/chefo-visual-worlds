import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotographyEditorial } from "@/components/photography-editorial";
import { WorldSlider } from "@/components/world-slider";
import { getAlbums } from "@/content/albums";
import { messages } from "@/i18n/messages";
import { PASSPORT_WORLDS, passportWorld, passportWorldSlide } from "@/lib/passport-world";
import { HomeView } from "@/views/home";
import { validateAiSearch } from "@/views/ai-worlds";

let locale: "bg" | "en" = "bg";

vi.mock("@/i18n", async (original) => ({
  ...(await original<typeof import("@/i18n")>()),
  useT: () => ({ locale, t: messages[locale] }),
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    slug,
    search,
    children,
    ...props
  }: {
    to: string;
    slug?: string;
    search?: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a
      {...props}
      href={`${locale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}${search ? `?${new URLSearchParams(search)}` : ""}`}
    >
      {children}
    </a>
  ),
}));

function finePointer() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches:
          query.includes("pointer: fine") || query.includes("prefers-reduced-motion: reduce"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  locale = "bg";
});

describe("stage 9e section labels", () => {
  it.each(["bg", "en"] as const)("gives Home AI a descriptive label in %s", (language) => {
    locale = language;
    const { container } = render(<HomeView />);
    const label = [...container.querySelectorAll(".section-eyebrow")].find(
      (el) => el.textContent === messages[language].home.aiEyebrow,
    )!;
    expect(label).toBeTruthy();
    expect(label.textContent).toBe(messages[language].common.aiBadge);
    expect(label.parentElement!.querySelector("h2")).toHaveTextContent(
      messages[language].home.aiTitle,
    );
    expect(label.textContent!.toLocaleLowerCase()).not.toBe(
      messages[language].home.aiTitle.toLocaleLowerCase(),
    );
    expect(container.querySelector(".home-hero-eyebrow")).not.toHaveClass("section-eyebrow");
  });
});

describe("stage 9e album rest state", () => {
  it("keeps Sofia in the preview without a highlighted row, then clears only the highlight on leave", () => {
    finePointer();
    const { container } = render(<PhotographyEditorial />);
    const list = container.querySelector(".photography-editorial-destination-list")!;
    expect(list.querySelector("[data-selected], [data-mobile-selected], .is-active")).toBeNull();
    expect(container.querySelector(".photography-editorial-preview-badge")).toHaveTextContent(
      "№ 01 / 13 · СОФИЯ",
    );
    const plovdiv = list.querySelector<HTMLElement>('[data-album-slug="plovdiv"]')!;
    fireEvent.mouseEnter(plovdiv);
    expect(plovdiv.querySelector("a")).toHaveAttribute("data-selected", "true");
    fireEvent.mouseLeave(plovdiv);
    expect(list.querySelector("[data-selected]")).toBeNull();
    expect(container.querySelector(".photography-editorial-preview-badge")).toHaveTextContent(
      "№ 06 / 13 · ПЛОВДИВ",
    );
    expect(plovdiv.querySelector("a")).toHaveAttribute("aria-current", "true");
  });
});

const expectedWorlds = [
  "sofia",
  "istanbul",
  "istanbul",
  "istanbul",
  "istanbul",
  "sofia",
  "sofia",
  "paris",
  "paris",
  "paris",
  "istanbul",
  "istanbul",
  "istanbul",
];

describe("stage 9e passport destinations", () => {
  it("maps all thirteen published albums to the approved worlds", () => {
    const albums = getAlbums();
    expect(albums).toHaveLength(13);
    expect(Object.keys(PASSPORT_WORLDS).sort()).toEqual(albums.map((album) => album.slug).sort());
    expect(albums.map((album) => passportWorld(album.slug))).toEqual(expectedWorlds);
  });

  it.each(["bg", "en"] as const)("follows every completed passport album in %s", (language) => {
    locale = language;
    finePointer();
    vi.useFakeTimers();
    const { container } = render(<PhotographyEditorial />);
    const rows = [
      ...container.querySelectorAll<HTMLElement>(".photography-editorial-destination-list > li"),
    ];
    expect(container.querySelector(".photography-editorial-complete-link")).toBeNull();
    rows.slice(0, -1).forEach((row) => fireEvent.mouseEnter(row));
    expect(container.querySelector(".photography-editorial-complete-link")).toBeNull();
    fireEvent.mouseEnter(rows.at(-1)!);
    act(() => vi.runOnlyPendingTimers());
    expect(container.querySelector(".photography-editorial-visa")).toBeInTheDocument();
    for (const [index, album] of getAlbums().entries()) {
      fireEvent.mouseEnter(rows[index]!);
      const world = passportWorldSlide(album.slug);
      const city = world.name[language];
      const links = within(container).getAllByRole("link", {
        name: messages[language].photos.passportToCityLabel(city),
      });
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link).toHaveTextContent(messages[language].photos.passportToCity(city));
        expect(link).toHaveAttribute(
          "href",
          `${language === "en" ? "/en" : ""}/ai-worlds?world=${world.slug}`,
        );
      }
    }
  });

  it.each(["bg", "en"] as const)("selects all three worlds on the server in %s", (language) => {
    locale = language;
    for (const world of ["sofia", "istanbul", "paris"] as const) {
      const search = validateAiSearch({ world });
      expect(search.world).toBe(world);
      const html = renderToString(<WorldSlider initialWorld={search.world} />);
      const document = new DOMParser().parseFromString(html, "text/html");
      expect(document.querySelector('[aria-pressed="true"]')?.textContent).toBe(
        passportWorldSlide(world).name[language],
      );
      expect(document.querySelector(".world-slider-real .is-active img")?.getAttribute("src")).toBe(
        `/worlds/${world}-real.webp`,
      );
    }
  });

  it.each([undefined, null, "unknown", 2, ["paris"], { world: "paris" }])("rejects %s", (world) => {
    expect(validateAiSearch({ world }).world).toBeUndefined();
    const html = renderToString(<WorldSlider initialWorld={validateAiSearch({ world }).world} />);
    expect(html).toContain('src="/worlds/sofia-real.webp"');
    expect(
      new DOMParser().parseFromString(html, "text/html").querySelector('[aria-pressed="true"]')
        ?.textContent,
    ).toBe("София");
  });
});

it("keeps section sizing scoped and provides glass plus a solid fallback", () => {
  const css = readFileSync("src/styles.css", "utf8").split("/* Stage 9e")[1]!;
  expect(css).toContain("--section-eyebrow-size: 12px");
  expect(css).toContain("margin-top: calc(-1 * var(--site-header-h))");
  expect(css).toContain("clamp(13px,");
  expect(css).not.toMatch(/\.home-hero-eyebrow|\.ai-card/);
  expect(css).toContain("background-color: rgb(12 23 41 / 0.62)");
  expect(css).toContain("-webkit-backdrop-filter: blur(14px) saturate(1.12)");
  expect(css).toContain("@supports not (backdrop-filter: blur(1px))");
});
