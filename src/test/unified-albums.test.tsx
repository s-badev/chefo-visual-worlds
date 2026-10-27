import { createHash } from "node:crypto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { albumText, getAlbum, getAlbumPhotos, getAlbums } from "@/content/albums";
import { validateAlbumSearch } from "@/content/album-view-search";
import { editorial, getPilotEditorialAlbum } from "@/content/editorial";
import {
  createMosaicPlan,
  mosaicBreakpoints,
  mosaicPixels,
} from "@/content/album-mosaic";
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
    ...props
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={slug ? to.replace("$slug", slug) : to} {...props}>
      {children}
    </a>
  ),
}));
beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
});
afterEach(() => {
  cleanup();
  locale = "bg";
  vi.unstubAllGlobals();
});

const originalPilotSlugs = ["sunny-beach", "sofia", "sveti-vlas", "rila"] as const;
const waveASlugs = ["lyon", "bodrum", "nessebar"] as const;
const waveBSlugs = ["tunisia", "edirne", "plovdiv"] as const;
const pilotSlugs = [...originalPilotSlugs, ...waveASlugs, ...waveBSlugs] as const;
const canonicalHashes: Record<string, string> = {
  sofia: "4577f4086abe28dcc1eafe33feb1c9fc7c05804e11526da89b5005027b251daa",
  "sunny-beach": "14dbb180ebd3ba6402a8b2e7a562225d28a34eeb069243bc4017362d49cda216",
  "sveti-vlas": "3c3ec2efd6d13b61247a22398cdf06e9d0ea92145dff603b980e95fc10d988fc",
  nessebar: "a100ad56f4cd426d54be73f277e30c41901e1877e0252b88da40a8a5c13d0064",
  plovdiv: "6ff19d36b14e1b2ce93d75aa5184a5b991a17bf7f3ea0830d464fea5a8e300f1",
  rila: "6cddefe3229cc75ca985a1264d5f7b28d2c64c855bd358690020e5567be2a786",
  tunisia: "5799a4c190f47f568303c40bdfb274e75bb95f9f0c2a2f62018de56a091beb4d",
  paris: "8011e72ebe3894a4cb9e462a34210ed1ecea77db62ae98549f54f2a7c87454aa",
  lyon: "86da04bedc772ec84739a3d73ac06c78e79c5e9da3b173a9fdb7477ef85a99c7",
  istanbul: "784f42088e71ad61a41d7a550a7e6899888cbba888ede5c4b81a7650561b02a0",
  edirne: "2d509dffb51cc13bd00535291a07012e7bbcc7837b657870393868bc18e65a73",
  bodrum: "3d496ed5d38d6a628516e19c1799098cc1d7d6561a69f8bc34466905e2eff35a",
};

it("preserves all twelve committed canonical photo sequences", () => {
  expect(getAlbums()).toHaveLength(12);
  for (const album of getAlbums()) {
    const slugs = getAlbumPhotos(album, "bg").map((photo) => photo.slug);
    expect(createHash("sha256").update(JSON.stringify(slugs)).digest("hex")).toBe(
      canonicalHashes[album.slug],
    );
  }
});

it("configures exactly ten unified albums with published cover-first, unique highlights", () => {
  expect(editorial.pilotAlbums.map((album) => album.albumSlug)).toEqual(pilotSlugs);
  for (const slug of pilotSlugs) {
    const album = getAlbum(slug)!;
    const selection = getPilotEditorialAlbum(slug)!;
    const all = new Set(getAlbumPhotos(album, "bg").map((photo) => photo.slug));
    const slugs = selection.highlights.map((item) => item.photoSlug);
    expect(slugs[0]).toBe(album.coverPhotoSlug);
    expect(slugs.length).toBeLessThanOrEqual(slug === "sveti-vlas" ? 5 : 8);
    expect(slugs.length).toBeGreaterThanOrEqual(4);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((item) => all.has(item))).toBe(true);
  }
});

it.each(pilotSlugs)("plans %s in canonical, complete, deterministic rows", (slug) => {
  const photos = getAlbumPhotos(getAlbum(slug)!, "bg");
  const plan = createMosaicPlan(photos);
  expect(createMosaicPlan(photos)).toEqual(plan);
  for (const mode of Object.keys(mosaicBreakpoints) as (keyof typeof mosaicBreakpoints)[]) {
    const config = mosaicBreakpoints[mode];
    const rows = plan.rows[mode];
    expect(rows[0]?.start).toBe(0);
    expect(rows.at(-1)?.end).toBe(photos.length);
    expect(plan.cells[mode]).toHaveLength(photos.length);
    expect(mosaicPixels(plan.height[mode], config.width)).toBeGreaterThan(0);
    const narrowest = Math.min(
      ...plan.cells[mode].map((cell) => mosaicPixels(cell.width, config.width)),
    );
    expect(narrowest, `${slug} ${mode} minimum tile width`).toBeGreaterThanOrEqual(
      config.minTile - 0.5,
    );
    const order: number[] = [];
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      if (index) expect(row.start).toBe(rows[index - 1]!.end);
      expect(mosaicPixels(row.height, config.width)).toBeGreaterThan(0);
      expect(row.blocks.length).toBeLessThanOrEqual(config.maxBlocks);
      expect(row.blocks[0]?.start).toBe(row.start);
      expect(row.blocks.at(-1)?.end).toBe(row.end);
      if (row.panorama) {
        expect(row.end - row.start).toBe(1);
        expect(photos[row.start]!.width / photos[row.start]!.height).toBeGreaterThan(2);
      }
      const blockBottoms = row.blocks.map((block) => {
        const last = plan.cells[mode][block.end - 1]!;
        return mosaicPixels(last.y, config.width) + mosaicPixels(last.height, config.width);
      });
      expect(Math.max(...blockBottoms) - Math.min(...blockBottoms)).toBeLessThan(0.00001);
      for (const block of row.blocks) {
        expect(block.end - block.start).toBeLessThanOrEqual(2);
        for (let photoIndex = block.start; photoIndex < block.end; photoIndex++) {
          order.push(photoIndex);
          const cell = plan.cells[mode][photoIndex]!;
          expect(cell.row).toBe(index);
          const width = mosaicPixels(cell.width, config.width);
          const height = mosaicPixels(cell.height, config.width);
          expect(width).toBeGreaterThan(0);
          expect(height).toBeGreaterThan(0);
          expect(width / height).toBeCloseTo(
            photos[photoIndex]!.width / photos[photoIndex]!.height,
            5,
          );
        }
      }
      if (!row.partial) {
        const total =
          row.blocks.reduce((sum, block) => sum + mosaicPixels(block.width, config.width), 0) +
          (row.blocks.length - 1) * config.gap;
        expect(total).toBeCloseTo(config.width, 5);
      } else expect(row.end).toBe(photos.length);
    }
    expect(order).toEqual(photos.map((_, index) => index));
  }
});

const expectedStacks = {
  "sunny-beach": { mobile: 6, smallTablet: 6, mediumTablet: 5, tablet: 3, desktop: 6 },
  sofia: { mobile: 5, smallTablet: 6, mediumTablet: 5, tablet: 4, desktop: 7 },
  "sveti-vlas": { mobile: 1, smallTablet: 1, mediumTablet: 1, tablet: 1, desktop: 2 },
  rila: { mobile: 5, smallTablet: 5, mediumTablet: 4, tablet: 5, desktop: 6 },
  lyon: { mobile: 3, smallTablet: 3, mediumTablet: 2, tablet: 2, desktop: 4 },
  bodrum: { mobile: 3, smallTablet: 4, mediumTablet: 2, tablet: 2, desktop: 4 },
  nessebar: { mobile: 6, smallTablet: 7, mediumTablet: 4, tablet: 1, desktop: 6 },
  tunisia: { mobile: 3, smallTablet: 2, mediumTablet: 1, tablet: 1, desktop: 2 },
  edirne: { mobile: 1, smallTablet: 1, mediumTablet: 1, tablet: 0, desktop: 0 },
  plovdiv: { mobile: 1, smallTablet: 1, mediumTablet: 1, tablet: 1, desktop: 0 },
} as const;

it.each(pilotSlugs)("keeps the explicit per-breakpoint stack contract for %s", (slug) => {
  const plan = createMosaicPlan(getAlbumPhotos(getAlbum(slug)!, "bg"));
  for (const mode of Object.keys(mosaicBreakpoints) as (keyof typeof mosaicBreakpoints)[]) {
    const count = plan.rows[mode].reduce(
      (sum, row) => sum + row.blocks.filter((block) => block.end - block.start === 2).length,
      0,
    );
    expect(count, `${slug} ${mode} stack count`).toBe(expectedStacks[slug][mode]);
  }
});

it.each([...waveASlugs, ...waveBSlugs] as const)(
  "moves %s to the shared unified album view",
  (slug) => {
    const { container } = render(<AlbumView album={getAlbum(slug)!} view="all" />);
    expect(container.querySelector(".unified-album")).toBeInTheDocument();
    expect(container.querySelector(".editorial-album")).toBeNull();
    expect(container.querySelector(".unified-album-view-nav")).toBeNull();
    expect(container.querySelector(".unified-album-highlights")).toBeInTheDocument();
    expect(container.querySelector(".unified-album-grid")).toBeInTheDocument();
  },
);

it.each(["paris", "istanbul"])("keeps %s on its Phase 2C editorial view", (slug) => {
  const { container } = render(<AlbumView album={getAlbum(slug)!} view="all" />);
  expect(container.querySelector(".editorial-album")).toBeInTheDocument();
  expect(container.querySelector(".unified-album-view-nav")).toBeNull();
});

it("keeps the owner-approved five Edirne highlights exact", () => {
  expect(getPilotEditorialAlbum("edirne")?.highlights.map((item) => item.photoSlug)).toEqual([
    "edirne-006",
    "edirne-011",
    "edirne-005",
    "edirne-021",
    "edirne-015",
  ]);
});

it("applies an optional cover position only to Plovdiv", () => {
  expect(getPilotEditorialAlbum("plovdiv")?.coverObjectPosition).toBe("50% 25%");
  for (const slug of pilotSlugs.filter((item) => item !== "plovdiv")) {
    expect(getPilotEditorialAlbum(slug)?.coverObjectPosition).toBeUndefined();
  }
  const plovdiv = render(<AlbumView album={getAlbum("plovdiv")!} />);
  expect(plovdiv.container.querySelector(".unified-album-cover img")).toHaveStyle({
    objectPosition: "50% 25%",
  });
  cleanup();
  const lyon = render(<AlbumView album={getAlbum("lyon")!} />);
  expect(lyon.container.querySelector(".unified-album-cover img")).not.toHaveAttribute("style");
});

it.each(pilotSlugs)("renders %s Highlights followed by its complete canonical gallery", (slug) => {
  const album = getAlbum(slug)!;
  const selection = getPilotEditorialAlbum(slug)!;
  const { container } = render(<AlbumView album={album} />);
  expect(container.querySelector("[data-opening-photo-slug]")).toHaveAttribute(
    "data-opening-photo-slug",
    album.coverPhotoSlug,
  );
  expect(
    [...container.querySelectorAll("[data-highlight-photo-slug]")].map((item) =>
      item.getAttribute("data-highlight-photo-slug"),
    ),
  ).toEqual(selection.highlights.slice(1).map((item) => item.photoSlug));
  expect(container.querySelectorAll(".unified-album-highlights figcaption")).toHaveLength(
    selection.highlights.length - 1,
  );
  expect(container.querySelector(".unified-album-view-nav")).toBeNull();
  expect(container.querySelector(".unified-album-gallery-action")).toBeNull();
  expect(container.querySelector(".unified-album-show-more")).toBeNull();
  expect(container.querySelector(".unified-album-progress")).toBeNull();
  const canonical = getAlbumPhotos(album, "bg").map((photo) => photo.slug);
  const buttons = [
    ...container.querySelectorAll<HTMLButtonElement>(".unified-album-grid button"),
  ];
  expect(buttons.map((button) => button.dataset["albumPhotoSlug"])).toEqual(canonical);
  expect(container.querySelector("#unified-gallery-title")).toHaveTextContent(
    messages.bg.photos.allPhotos,
  );
  expect(container.querySelector(".unified-album-section-head p")).toHaveTextContent(
    messages.bg.photos.count(canonical.length),
  );
  // Owner-approved Mosaic-C: no caption bar, while every trigger retains a published name.
  expect(container.querySelectorAll(".unified-album-grid figcaption")).toHaveLength(0);
  expect(container.querySelectorAll(".unified-album-grid button[aria-label]")).toHaveLength(
    canonical.length,
  );
  expect(
    buttons.every(
      (button, index) =>
        button.getAttribute("aria-label") ===
        messages.bg.common.openFullscreen(getAlbumPhotos(album, "bg")[index]!.title),
    ),
  ).toBe(true);
});

it("keeps the legacy view=all URL and scrolls to All Photos after mount", () => {
  let queued: FrameRequestCallback | undefined;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queued = callback;
      return 7;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const scrollTo = vi.mocked(window.scrollTo);
  const { container, unmount } = render(<AlbumView album={getAlbum("sofia")!} view="all" />);
  const target = container.querySelector<HTMLElement>("#all-photos")!;
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
    top: 840,
    bottom: 940,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 840,
    toJSON: () => ({}),
  });
  queued?.(0);
  expect(scrollTo).toHaveBeenCalledWith({ top: 760, behavior: "smooth" });
  unmount();
  expect(window.cancelAnimationFrame).toHaveBeenCalledWith(7);
});

it("starts at the top for plain URLs and uses instant legacy scrolling with reduced motion", () => {
  let queued: FrameRequestCallback | undefined;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      queued = callback;
      return 8;
    }),
  );
  const scrollTo = vi.mocked(window.scrollTo);
  const plain = render(<AlbumView album={getAlbum("sofia")!} />);
  expect(queued).toBeUndefined();
  expect(scrollTo).not.toHaveBeenCalled();
  plain.unmount();

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
  const legacy = render(<AlbumView album={getAlbum("sofia")!} view="all" />);
  const target = legacy.container.querySelector<HTMLElement>("#all-photos")!;
  vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
    top: 340,
    bottom: 440,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: 340,
    toJSON: () => ({}),
  });
  queued?.(0);
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 260, behavior: "instant" });
});

const nextAlbums = {
  "sunny-beach": "sveti-vlas",
  sofia: "sunny-beach",
  "sveti-vlas": "nessebar",
  rila: "tunisia",
  lyon: "istanbul",
  bodrum: "sofia",
  nessebar: "plovdiv",
  tunisia: "paris",
  edirne: "bodrum",
  plovdiv: "rila",
} as const;

it.each(pilotSlugs)("uses the real next-album cover and accessible whole-card link for %s", (slug) => {
  const nextSlug = nextAlbums[slug];
  const nextAlbum = getAlbum(nextSlug)!;
  const { container } = render(<AlbumView album={getAlbum(slug)!} />);
  const card = container.querySelector<HTMLAnchorElement>(".next-album-card")!;
  expect(card).toHaveAttribute("href", `/photography/albums/${nextSlug}`);
  expect(card).toHaveAccessibleName(
    `${messages.bg.photos.nextAlbum}: ${albumText(nextAlbum.title, "bg")}`,
  );
  const cover = card.querySelector<HTMLImageElement>(".next-album-card-cover")!;
  expect(cover).toHaveAttribute("src", expect.stringContaining(`${nextSlug}-cover-card.webp`));
  expect(cover).toHaveAttribute("alt", "");
  expect(cover).toHaveAttribute("aria-hidden", "true");
  expect(card.querySelector(".next-album-card-arrow")).toHaveAttribute("aria-hidden", "true");
});

it("gives Sveti Vlas portraits room in two proportional Highlights pairs", () => {
  const album = getAlbum("sveti-vlas")!;
  const selection = getPilotEditorialAlbum(album.slug)!;
  const { container } = render(<AlbumView album={album} />);
  const figures = [...container.querySelectorAll<HTMLElement>(".unified-album-highlight")];
  expect(
    figures.map((figure) => figure.querySelector("button")?.dataset["highlightPhotoSlug"]),
  ).toEqual(selection.highlights.slice(1).map((item) => item.photoSlug));
  const desktopShare = figures.map((figure) =>
    Number(
      figure.style.getPropertyValue("--highlight-desktop-basis").match(/calc\(([\d.]+)%/)?.[1],
    ),
  );
  expect(desktopShare[0]).toBeGreaterThan(70);
  expect(desktopShare[1]).toBeGreaterThan(20);
  expect(desktopShare[2]).toBeGreaterThan(70);
  expect(desktopShare[3]).toBeGreaterThan(20);
  expect(desktopShare[0]! + desktopShare[1]!).toBeCloseTo(100, 4);
  expect(desktopShare[2]! + desktopShare[3]!).toBeCloseTo(100, 4);
});

it("validates album URL view state without losing other string search values", () => {
  expect(validateAlbumSearch({ view: "all", campaign: "owner" })).toEqual({
    view: "all",
    campaign: "owner",
  });
  expect(validateAlbumSearch({ view: "invalid", campaign: "owner" })).toEqual({
    view: undefined,
    campaign: "owner",
  });
  expect(validateAlbumSearch({ campaign: 7 }).view).toBeUndefined();
});

describe.each(["bg", "en"] as const)("%s pilot Lightbox", (language) => {
  it("navigates from first, middle and last photos and restores the exact trigger", async () => {
    locale = language;
    const album = getAlbum("sveti-vlas")!;
    const items = getAlbumPhotos(album, locale);
    const { container } = render(<AlbumView album={album} view="all" />);
    const cover = container.querySelector<HTMLButtonElement>("[data-opening-photo-slug]")!;
    for (const index of [0, Math.floor(items.length / 2), items.length - 1]) {
      const trigger = container.querySelector<HTMLButtonElement>(
        `.unified-album-grid button[data-full-index='${index}']`,
      )!;
      expect(trigger).not.toBe(cover);
      trigger.focus();
      fireEvent.click(trigger);
      await screen.findByRole("dialog");
      expect(screen.getByRole("dialog")).toHaveTextContent(items[index]!.title);
      if (items[index]!.caption)
        expect(screen.getByRole("dialog")).toHaveTextContent(items[index]!.caption);
      expect(screen.getByText(new RegExp(`${index + 1} / ${items.length}$`))).toBeInTheDocument();
      const direction = index === items.length - 1 ? "ArrowLeft" : "ArrowRight";
      const adjacent = index === items.length - 1 ? index - 1 : index + 1;
      fireEvent.keyDown(window, { key: direction });
      expect(screen.getByText(new RegExp(`${adjacent + 1} / ${items.length}$`))).toBeInTheDocument();
      fireEvent.keyDown(window, { key: direction === "ArrowLeft" ? "ArrowRight" : "ArrowLeft" });
      expect(screen.getByText(new RegExp(`${index + 1} / ${items.length}$`))).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(document.activeElement).toBe(trigger);
    }
  });
});
