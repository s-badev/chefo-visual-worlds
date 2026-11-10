// Stage 9c: the open parity issues of stage 9b, matched to mock v12 — the Photography switch and
// All photos (O2), the album page top (O3) and the artwork page labels and type (O4).
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { getAlbum } from "@/content/albums";
import { getAiWork } from "@/content/ai-works";
import { filterGalleryPhotos, getAllGalleryPhotos } from "@/content/photo-gallery";
import { AlbumView, PhotographyView } from "@/views/photography";
import { AiDetailView } from "@/views/ai-worlds";
import { SiteHeader } from "@/components/site";
import { ALBUM_HERO_STAMP_INK } from "@/components/album-hero";
import { Route as BgPhotographyRoute } from "@/routes/photography.index";
import { Route as EnPhotographyRoute } from "@/routes/en.photography.index";

let activeLocale: "bg" | "en" = "bg";
let currentSearch: Record<string, unknown> = {};
let activePath = "/photography";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
    useSearch: () => currentSearch,
    useNavigate:
      () =>
      ({ search }: { search: (previous: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch);
      },
    useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
      select({ location: { pathname: activePath, searchStr: "" }, matches: [] }),
  };
});

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: activeLocale, t: messages[activeLocale] }) };
});

vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    slug,
    search,
    children,
    className,
    "aria-current": current,
    "aria-label": label,
  }: {
    to: string;
    slug?: string;
    search?: Record<string, string>;
    children: ReactNode;
    className?: string;
    "aria-current"?: "page";
    "aria-label"?: string;
  }) => {
    const query = search ? `?${new URLSearchParams(search).toString()}` : "";
    return (
      <a
        href={`${activeLocale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}${query}`}
        className={className}
        aria-current={current}
        aria-label={label}
      >
        {children}
      </a>
    );
  },
  LanguageSwitcher: ({ label }: { label: string }) => <div role="group" aria-label={label} />,
}));

const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  activeLocale = "bg";
  currentSearch = {};
  activePath = "/photography";
});

describe.each(["bg", "en"] as const)("O2 · Photography switch and All photos (%s)", (locale) => {
  const m = messages[locale].photos;
  const prefix = locale === "en" ? "/en" : "";

  it("puts the Albums / All photos switch under the shared intro, the current view marked", () => {
    activeLocale = locale;
    const view = render(<PhotographyView />);
    const nav = () => screen.getByRole("navigation", { name: m.view });
    const links = () => within(nav()).getAllByRole("link");
    expect(links().map((a) => a.textContent)).toEqual([m.albums, m.allPhotos]);
    expect(links().map((a) => a.getAttribute("href"))).toEqual([
      `${prefix}/photography`,
      `${prefix}/photography?view=photos`,
    ]);
    expect(links()[0]).toHaveAttribute("aria-current", "page");
    expect(links()[1]).not.toHaveAttribute("aria-current");
    expect(nav()).toHaveClass("photo-seg");
    expect(nav().parentElement).toHaveClass("photo-viewbar");
    // One heading for the page, the cover and the intro above the switch.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(view.container.querySelector("[data-photo-opening] img")).not.toBeNull();
    // The old text link to All photos is gone (the switch replaces it).
    expect(view.container.querySelector(".photography-editorial-all-photos")).toBeNull();

    currentSearch = { view: "photos" };
    view.rerender(<PhotographyView />);
    expect(links()[1]).toHaveAttribute("aria-current", "page");
    expect(links()[0]).not.toHaveAttribute("aria-current");
  });

  it("shows the theme chips on the switch row and a masonry of album-named tiles", () => {
    activeLocale = locale;
    currentSearch = { view: "photos" };
    const { container } = render(<PhotographyView />);
    const chips = screen.getByRole("group", { name: m.theme });
    expect(chips.parentElement).toHaveClass("photo-viewbar");
    expect(within(chips).getAllByRole("button")[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("group", { name: m.place })).toBeNull();

    const gallery = filterGalleryPhotos(getAllGalleryPhotos(locale), {});
    const tiles = [...container.querySelectorAll<HTMLButtonElement>(".photo-mas > .photo-tile")];
    expect(tiles).toHaveLength(gallery.length);
    const first = tiles[0]!;
    expect(first.tagName).toBe("BUTTON");
    expect(first).toHaveAttribute(
      "aria-label",
      messages[locale].common.openFullscreen(gallery[0]!.photo.title),
    );
    expect(first.querySelector("img")).toHaveAttribute("alt", "");
    const album = getAlbum(gallery[0]!.albumSlug!)!;
    expect(first.querySelector(".photo-tile-label")).toHaveTextContent(
      locale === "en" ? (album.title.en ?? album.title.bg) : album.title.bg,
    );
    expect(first.querySelector(".photo-tile-label")).toHaveAttribute("aria-hidden", "true");
    // The count is announced, not shown.
    expect(screen.getByRole("status")).toHaveClass("sr-only");
    expect(screen.getByRole("status")).toHaveTextContent(m.count(gallery.length));
  });
});

describe("O2 · old place links", () => {
  it.each([
    [BgPhotographyRoute, "/photography/albums/$slug"],
    [EnPhotographyRoute, "/en/photography/albums/$slug"],
  ] as const)("redirects ?location= to that album", (route, to) => {
    const beforeLoad = route.options.beforeLoad as (ctx: { search: object }) => void;
    let thrown: unknown;
    try {
      beforeLoad({ search: { view: "photos", location: "sofia" } });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({ options: { to, params: { slug: "sofia" } } });
    expect(() => beforeLoad({ search: { view: "photos" } })).not.toThrow();
  });
});

describe("O2 · styles as the mock", () => {
  it("draws the switch as a pill with a navy current view and the tiles in 4 / 2 columns", () => {
    expect(css).toContain(
      '.photo-seg-link[aria-current="page"] { background-color: var(--navy); color: #f4eee2; }',
    );
    expect(css).toContain(".photo-mas { columns: 4 260px; column-gap: 14px; }");
    expect(css).toContain(
      "@media (max-width: 767px) { .photo-mas { columns: 2; column-gap: 8px; }",
    );
    expect(css).toContain(
      "@media (pointer: coarse) { .photo-seg-link, .photo-chip { min-height: 44px; } }",
    );
  });
});

class SentinelObserver {
  static last: SentinelObserver | null = null;
  target: Element | null = null;
  constructor(private readonly callback: IntersectionObserverCallback) {
    SentinelObserver.last = this;
  }
  observe(target: Element) {
    this.target = target;
  }
  disconnect() {}
  fire(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

describe.each(["bg", "en"] as const)("O3 · album page top (%s)", (locale) => {
  const m = messages[locale].photos;
  it.each(["sofia", "paris", "plovdiv", "istanbul"])(
    "%s: one H1 on the cover, the way back, the count and the stamp",
    (slug) => {
      activeLocale = locale;
      const album = getAlbum(slug)!;
      const { container } = render(<AlbumView album={album} />);
      const hero = container.querySelector<HTMLElement>(".album-hero")!;
      expect(hero).toHaveAttribute("data-header-theme", "dark");
      expect(hero.querySelector("[data-header-sentinel]")).toHaveAttribute("aria-hidden", "true");
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      const title = locale === "en" ? (album.title.en ?? album.title.bg) : album.title.bg;
      expect(within(hero).getByRole("heading", { level: 1 })).toHaveTextContent(title);
      expect(within(hero).getByRole("link", { name: m.backToAlbums })).toHaveAttribute(
        "href",
        `${locale === "en" ? "/en" : ""}/photography`,
      );
      expect(hero.querySelector(".album-hero-meta")).toHaveTextContent(
        m.count(album.photos.length),
      );
      // The cover is the photograph behind the copy, not a control.
      const cover = hero.querySelector(".album-hero-media img")!;
      expect(cover).toHaveAttribute("data-opening-photo-slug", album.coverPhotoSlug);
      expect(cover.closest("a, button")).toBeNull();
      // The passport stamp: decorative, in the light ink, with the album's landmark.
      const stamp = hero.querySelector(".album-hero-stamp")!;
      expect(stamp).toHaveAttribute("aria-hidden", "true");
      expect(stamp.querySelector("svg")).toHaveAttribute("width", "120");
      expect(stamp.innerHTML).toContain(ALBUM_HERO_STAMP_INK);
      // "Highlights" follows the top, as in the mock.
      expect(container.querySelector(".album-highlights-label")).toHaveTextContent(m.highlights);
      // The eyebrow and the jump link of the old top are gone.
      expect(hero.querySelector(".eyebrow")).toBeNull();
    },
  );
});

describe("O3 · the header over an album cover", () => {
  it.each(["/photography/albums/sofia", "/en/photography/albums/paris"])(
    "is transparent over the cover of %s and solid once the sentinel leaves",
    (pathname) => {
      vi.stubGlobal("IntersectionObserver", SentinelObserver);
      document.elementsFromPoint = () => [];
      activePath = pathname;
      activeLocale = pathname.startsWith("/en") ? "en" : "bg";
      const slug = pathname.split("/").pop()!;
      const { container } = render(
        <>
          <SiteHeader />
          <AlbumView album={getAlbum(slug)!} />
        </>,
      );
      const header = container.querySelector("header")!;
      expect(SentinelObserver.last!.target).toBe(
        container.querySelector(".album-hero [data-header-sentinel]"),
      );
      expect(header).toHaveAttribute("data-transparent");
      act(() => SentinelObserver.last!.fire(false));
      expect(header).not.toHaveAttribute("data-transparent");
    },
  );

  it("keeps the album top on the mock's values", () => {
    expect(css).toContain(
      "min-height: min(78svh, 760px); margin-top: calc(-1 * var(--site-header-h));",
    );
    expect(css).toContain(
      "background: linear-gradient( 0deg, rgb(12 23 41 / 0.88), rgb(12 23 41 / 0.2) 52%, rgb(12 23 41 / 0.35) );",
    );
    expect(css).toContain("font: 500 clamp(56px, 9vw, 128px) / 0.92 var(--font-serif);");
    expect(css).toContain("transform: rotate(-9deg);");
  });
});

describe.each(["bg", "en"] as const)("O4 · artwork page labels (%s)", (locale) => {
  const m = messages[locale].ai;
  it("shows a short prompt label without a note, keeps the sans description and grid link", () => {
    activeLocale = locale;
    activePath = `${locale === "en" ? "/en" : ""}/ai-worlds/guardian-of-the-time-portal`;
    const raw = getAiWork("guardian-of-the-time-portal")!;
    expect(raw.promptKind).toBe("illustrative");
    const { container } = render(<AiDetailView work={raw} />);
    const prompt = screen.getByRole("region", { name: m.promptLabel });
    const label = within(prompt).getByText(m.promptLabel);
    expect(label).toHaveClass("section-eyebrow", "eyebrow", "uppercase");
    expect(label.tagName).toBe("P");
    expect(prompt).toHaveAttribute("aria-labelledby", label.id);
    expect(prompt).not.toHaveAttribute("aria-label");
    expect(within(prompt).queryByRole("heading")).toBeNull();
    expect(container.querySelector(".ai-prompt-note")).toBeNull();
    expect(container.querySelector(".ai-work-desc")).not.toHaveClass("font-serif");
    expect(m.toCollectionGrid).toBe(
      locale === "bg" ? "Към мрежата на колекцията" : "Open the collection grid",
    );
    expect(m.promptLabel).toBe(locale === "bg" ? "Промпт" : "Prompt");
  });
});

describe("O4 · artwork page styles as the mock", () => {
  it("sets the description in Manrope and omits exclusive prompt-label styling", () => {
    expect(css).toContain(
      ".ai-work-desc { color: var(--ai-on-2); font: 500 16px/1.6 var(--font-sans); }",
    );
    expect(css).not.toContain(".ai-prompt-label");
    expect(css).not.toContain(".ai-prompt-note");
    expect(css).toContain(
      ".ai-work-page .ai-work-detail { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); align-items: stretch; }",
    );
  });
});

describe.each(["bg", "en"] as const)("O4 · switcher and next band wording (%s)", (locale) => {
  const m = messages[locale].ai;
  it("uses the mock's wording for the switcher, the band and the previous card", () => {
    expect([m.switchCollection, m.youAreHere, m.previousWork, m.nextWork]).toEqual(
      locale === "bg"
        ? ["Смени колекция", "Сега тук", "Предишна", "Следваща творба"]
        : ["Switch collection", "You are here", "Previous", "Next artwork"],
    );
  });

  it("names the next collection in full on the band and hides its number on phones", () => {
    activeLocale = locale;
    // The last work of the first collection leads into the next collection.
    const raw = getAiWork("knight-amid-siege-flames")!;
    activePath = `${locale === "en" ? "/en" : ""}/ai-worlds/${raw.slug}`;
    const { container } = render(<AiDetailView work={raw} />);
    const band = container.querySelector(".ai-work-next")!;
    expect(band).toHaveClass("ai-work-next--collection");
    expect(band.querySelector(".ai-work-next-collection")).toHaveTextContent(
      locale === "bg" ? "Професии и роли" : "Professions & Roles",
    );
    expect(band.querySelector("small .ai-work-next-no")).toHaveTextContent("· 02 / 04");
    expect(css).toContain(
      "@media (max-width: 767px) { .ai-work-next { min-height: 230px; } .ai-work-next-no { display: none; }",
    );
  });
});

describe("O4 · no unused prompt-label font fallback", () => {
  it("removes the font face that served only the deleted prompt label", () => {
    expect(css).not.toContain("Cormorant Label Fallback");
  });
});
