import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAlbum, getAlbumPhotos, getAlbums } from "@/content/albums";
import { getEditorialAlbum } from "@/content/editorial";
import { messages } from "@/i18n/messages";
import { AlbumView } from "@/views/photography";

let locale: "bg" | "en" = "bg";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale, t: messages[locale] }) };
});

vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    slug,
    children,
    className,
    ...rest
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href={slug ? to.replace("$slug", slug) : to} className={className} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      "aria-current": current,
    }: {
      to: string;
      params?: { slug: string };
      children: ReactNode;
      "aria-current"?: "page";
    }) => (
      <a href={params ? to.replace("$slug", params.slug) : to} aria-current={current}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/components/site", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/site")>();
  return {
    ...actual,
    Lightbox: ({ items, index }: { items: { slug: string }[]; index: number | null }) => (
      <div
        data-testid="album-lightbox"
        data-index={index ?? "closed"}
        data-slugs={items.map((item) => item.slug).join(",")}
      />
    ),
  };
});

afterEach(() => {
  cleanup();
  locale = "bg";
});

describe.each(["paris", "istanbul"] as const)("%s editorial album", (slug) => {
  it.each(["bg", "en"] as const)(
    "keeps the exact %s canonical full-gallery sequence",
    (language) => {
      locale = language;
      const album = getAlbum(slug)!;
      const canonical = getAlbumPhotos(album, locale);
      const { container } = render(<AlbumView album={album} />);
      const gallery = container.querySelector(".editorial-album-all-grid")!;
      const triggers = [
        ...gallery.querySelectorAll<HTMLButtonElement>("button[data-album-photo-slug]"),
      ];
      const slugs = triggers.map((button) => button.dataset["albumPhotoSlug"]);

      expect(slugs).toEqual(canonical.map((photo) => photo.slug));
      expect(slugs).toHaveLength(slug === "paris" ? 57 : 40);
      expect(new Set(slugs).size).toBe(canonical.length);
      expect(slugs[0]).toBe(canonical[0]!.slug);
      expect(slugs.at(-1)).toBe(canonical.at(-1)!.slug);
      expect(triggers.map((button) => button.dataset["fullIndex"])).toEqual(
        canonical.map((_, index) => String(index)),
      );
      expect(triggers.map((button) => button.querySelector("img")?.getAttribute("src"))).toEqual(
        canonical.map((photo) => photo.image),
      );
      expect(container.querySelector("[data-testid=album-lightbox]")).toHaveAttribute(
        "data-slugs",
        canonical.map((photo) => photo.slug).join(","),
      );
      expect(
        within(container.querySelector(".editorial-album-all") as HTMLElement).getByText(
          messages[locale].photos.count(canonical.length),
        ),
      ).toBeInTheDocument();
    },
  );

  it.each(["bg", "en"] as const)(
    "uses matching %s photographic cards for both adjacent albums",
    (language) => {
      locale = language;
      const expected =
        slug === "paris"
          ? {
              previous: "tunisia",
              previousCover: "/photos/tunisia/tunisia-cover-card.webp",
              next: "lyon",
              nextCover: "/photos/lyon/lyon-cover-card.webp",
            }
          : {
              previous: "lyon",
              previousCover: "/photos/lyon/lyon-cover-card.webp",
              next: "edirne",
              nextCover: "/photos/edirne/edirne-cover-card.webp",
            };
      const previousAlbum = getAlbum(expected.previous)!;
      const nextAlbum = getAlbum(expected.next)!;
      const { container } = render(<AlbumView album={getAlbum(slug)!} />);
      const navigation = container.querySelector(".editorial-album-navigation")!;
      const previous = navigation.querySelector<HTMLAnchorElement>(".next-album-card--previous")!;
      const next = navigation.querySelector<HTMLAnchorElement>(".next-album-card--next")!;

      expect(previous).toHaveAttribute("href", `/photography/albums/${expected.previous}`);
      expect(previous).toHaveAccessibleName(
        `${messages[language].photos.previousAlbum}: ${
          previousAlbum.title[language] ?? previousAlbum.title.bg
        }`,
      );
      expect(previous.querySelector(".next-album-card-cover")).toHaveAttribute(
        "src",
        expected.previousCover,
      );
      expect(next).toHaveAttribute("href", `/photography/albums/${expected.next}`);
      expect(next).toHaveAccessibleName(
        `${messages[language].photos.nextAlbum}: ${
          nextAlbum.title[language] ?? nextAlbum.title.bg
        }`,
      );
      expect(next.querySelector(".next-album-card-cover")).toHaveAttribute(
        "src",
        expected.nextCover,
      );
      expect(navigation.querySelectorAll(".next-album-card")).toHaveLength(2);
      expect(
        navigation.querySelectorAll(`a[href='/photography/albums/${expected.next}']`),
      ).toHaveLength(1);
      expect(container.querySelector(".editorial-album-jump")).toHaveAttribute(
        "href",
        "#editorial-album-all",
      );
    },
  );

  it("opens curated and full-gallery images at their authoritative indices", () => {
    const album = getAlbum(slug)!;
    const canonical = getAlbumPhotos(album, locale);
    const selected = getEditorialAlbum(slug)!;
    const { container } = render(<AlbumView album={album} />);
    const curated = [
      ...container.querySelectorAll<HTMLButtonElement>("button[data-curated-photo-slug]"),
    ];
    expect(curated.map((button) => button.dataset["curatedPhotoSlug"])).toEqual(
      selected.chapters.flatMap((chapter) => chapter.images.map((image) => image.photoSlug)),
    );
    for (const button of curated) {
      const index = canonical.findIndex(
        (photo) => photo.slug === button.dataset["curatedPhotoSlug"],
      );
      expect(index).toBeGreaterThanOrEqual(0);
      expect(button.dataset["fullIndex"]).toBe(String(index));
    }
    const curatedTrigger = curated[2]!;
    fireEvent.click(curatedTrigger);
    expect(container.querySelector("[data-testid=album-lightbox]")).toHaveAttribute(
      "data-index",
      curatedTrigger.dataset["fullIndex"],
    );
    const galleryTrigger = container.querySelector<HTMLButtonElement>(
      ".editorial-album-all-grid button[data-full-index='1']",
    )!;
    fireEvent.click(galleryTrigger);
    expect(container.querySelector("[data-testid=album-lightbox]")).toHaveAttribute(
      "data-index",
      "1",
    );
    expect(container.querySelectorAll(".editorial-album h1")).toHaveLength(1);
    expect(
      [...container.querySelectorAll(".editorial-album h2")].map((heading) => heading.textContent),
    ).toEqual([messages.bg.photos.allPhotos]);
    const galleryItems = [
      ...container.querySelectorAll<HTMLElement>(".editorial-album-all-grid > li"),
    ];
    expect(galleryItems.map((item) => item.style.getPropertyValue("--gallery-ratio"))).toEqual(
      canonical.map((photo) => String(photo.width / photo.height)),
    );
  });
});

it("lays out Paris chapters as justified rows with the cover paris-052", () => {
  const album = getAlbum("paris")!;
  const { container } = render(<AlbumView album={album} />);
  const rows = [...container.querySelectorAll(".editorial-album-spread.is-justified")].map(
    (spread) =>
      [...spread.querySelectorAll(":scope > .editorial-album-row")].map((row) =>
        [...row.querySelectorAll<HTMLButtonElement>("button[data-curated-photo-slug]")].map(
          (button) => button.dataset["curatedPhotoSlug"],
        ),
      ),
  );
  expect(rows).toEqual([
    [
      ["paris-048", "paris-043"],
      ["paris-013", "paris-009"],
    ],
    [["paris-055"], ["paris-039", "paris-056"]],
    [["paris-040", "paris-031", "paris-035"]],
    [["paris-045", "paris-047", "paris-044"]],
  ]);
  // Same frame ratios (and therefore crops) as the previous grid layout.
  const figures = [...container.querySelectorAll<HTMLElement>(".editorial-album-row > figure")];
  expect(figures.map((figure) => figure.style.getPropertyValue("--album-ratio"))).toEqual([
    "3 / 2",
    "3 / 4",
    "3 / 2",
    "3 / 2",
    "auto",
    "9 / 16",
    "4 / 3",
    "9 / 16",
    "3 / 2",
    "9 / 16",
    "3 / 4",
    "4 / 3",
    "3 / 4",
  ]);
  expect(figures[1]!.style.getPropertyValue("--album-grow")).toBe("0.75");
  for (const chapter of getEditorialAlbum("paris")!.chapters) {
    expect(chapter.rows!.reduce((sum, count) => sum + count, 0)).toBe(chapter.images.length);
  }
  const cover = container.querySelector("[data-opening-photo-slug]")!;
  expect(cover.tagName).toBe("IMG");
  expect(cover).toHaveAttribute("data-opening-photo-slug", "paris-052");
  expect(cover).toHaveAttribute("src", "/photos/paris/paris-052.webp");
  expect(container.querySelector(".editorial-album-cover button")).toBeNull();
  expect(container.querySelector(".editorial-album-cover .editorial-album-zoom-cue")).toBeNull();
});

it("lays out Istanbul chapters as justified rows without staggered offsets", () => {
  const { container } = render(<AlbumView album={getAlbum("istanbul")!} />);
  const rows = [...container.querySelectorAll(".editorial-album-spread.is-justified")].map(
    (spread) =>
      [...spread.querySelectorAll(":scope > .editorial-album-row")].map((row) =>
        [...row.querySelectorAll<HTMLButtonElement>("button[data-curated-photo-slug]")].map(
          (button) => button.dataset["curatedPhotoSlug"],
        ),
      ),
  );
  expect(rows).toEqual([
    [["istanbul-017"], ["istanbul-009", "istanbul-029"]],
    [["istanbul-012", "istanbul-013"]],
    [
      ["istanbul-032", "istanbul-025"],
      ["istanbul-040", "istanbul-037", "istanbul-031"],
    ],
    [["istanbul-038"], ["istanbul-030", "istanbul-035"]],
  ]);
  const figures = [...container.querySelectorAll<HTMLElement>(".editorial-album-row > figure")];
  expect(figures.every((figure) => !figure.style.getPropertyValue("--album-offset"))).toBe(true);
  // The two-portrait row carries its ratio sum so CSS can cap its height; wide rows stay uncapped.
  const rowStyles = [...container.querySelectorAll<HTMLElement>(".editorial-album-row")].map(
    (row) => [row.style.getPropertyValue("--row-ratio"), row.style.getPropertyValue("--row-count")],
  );
  expect(rowStyles.at(-1)).toEqual(["1.5", "2"]);
  expect(rowStyles.at(-2)).toEqual(["", ""]);
});

it("moves Nessebar to the shared unified album presentation", () => {
  const { container } = render(<AlbumView album={getAlbum("nessebar")!} />);
  expect(container.querySelector(".editorial-album")).toBeNull();
  expect(container.querySelector(".unified-album")).toBeInTheDocument();
  expect(container.querySelector("[data-opening-photo-slug]")).toHaveAttribute(
    "data-opening-photo-slug",
    getAlbum("nessebar")!.coverPhotoSlug,
  );
});

// jsdom has no layout engine, so the equal-height rule is asserted on its two inputs: the CSS
// (width proportional to the frame ratio, nothing clamping it) and the ratios themselves (the
// albums test checks every Paris width/height against the real WebP file).
describe("Editorial all-photos grid", () => {
  const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const itemRules = [...css.matchAll(/\.editorial-album-all-grid li \{([^}]*)\}/g)].map((m) =>
    m[1]!.replace(/\s+/g, " ").trim(),
  );
  const RATIO_TIMES = /^calc\(var\(--gallery-ratio\) \* ([\d.]+)(rem)?\)$/;

  it("sizes every item in proportion to its frame ratio with no minimum width", () => {
    expect(itemRules.length).toBeGreaterThan(0);
    const all = itemRules.join(" ");
    expect(all).not.toMatch(/(max-width|max-height|min-height)\s*:/);
    for (const body of itemRules) {
      for (const [, property, value] of body.matchAll(
        /(min-width|flex(?:-grow|-basis)?):\s*([^;]+)/g,
      )) {
        if (property === "min-width") expect(value!.trim()).toBe("0");
        else if (property === "flex") {
          const [grow, shrink, basis] = value!.trim().split(/ (?![^(]*\))/);
          expect(grow).toMatch(RATIO_TIMES);
          expect(shrink).toBe("1");
          expect(basis).toMatch(RATIO_TIMES);
        } else expect(value!.trim()).toMatch(RATIO_TIMES);
      }
    }
    expect(all).toContain("min-width: 0");
  });

  it("lets a row of one narrow portrait still reach the right edge", () => {
    // Flexbox hands out only part of the free space when the grow factors on a line add up to
    // less than 1, so the scaled grow of the narrowest frame must be at least 1.
    const flex = itemRules.map((body) => body.match(/flex: ([^;]+)/)?.[1]).find(Boolean)!;
    const scale = Number(flex.match(/^calc\(var\(--gallery-ratio\) \* ([\d.]+)\)/)![1]);
    const editorial = getAlbums().filter((album) => getEditorialAlbum(album.slug));
    expect(editorial.map((album) => album.slug).sort()).toEqual(["istanbul", "paris"]);
    for (const album of editorial) {
      const narrowest = Math.min(
        ...getAlbumPhotos(album, "bg").map((photo) => photo.width / photo.height),
      );
      expect(narrowest * scale, album.slug).toBeGreaterThanOrEqual(1);
    }
  });
});
