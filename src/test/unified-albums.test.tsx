import { createHash } from "node:crypto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAlbum, getAlbumPhotos, getAlbums } from "@/content/albums";
import { validateAlbumSearch } from "@/content/album-view-search";
import { editorial, getPilotEditorialAlbum } from "@/content/editorial";
import {
  createMosaicPlan,
  mosaicBatchEnds,
  mosaicBreakpoints,
  mosaicPixels,
} from "@/content/album-mosaic";
import { ALBUM_BATCH_SIZE } from "@/components/unified-album";
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
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      className,
      "aria-current": current,
    }: {
      to: string;
      params?: { slug: string };
      children: ReactNode;
      className?: string;
      "aria-current"?: "page";
    }) => (
      <a
        href={params ? to.replace("$slug", params.slug) : to}
        className={className}
        aria-current={current}
      >
        {children}
      </a>
    ),
  };
});
afterEach(() => {
  cleanup();
  locale = "bg";
});

const pilotSlugs = ["sunny-beach", "sofia", "sveti-vlas", "rila"];
const legacySlugs = ["nessebar", "plovdiv", "tunisia", "lyon", "edirne", "bodrum"];
const canonicalHashes: Record<string, string> = {
  sofia: "4577f4086abe28dcc1eafe33feb1c9fc7c05804e11526da89b5005027b251daa",
  "sunny-beach": "14dbb180ebd3ba6402a8b2e7a562225d28a34eeb069243bc4017362d49cda216",
  "sveti-vlas": "3ae17640d687880e1d79bb60ea700951dd26ac136411cf8562d5bc9b590ddeab",
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

it("configures exactly four pilot albums with published cover-first, unique highlights", () => {
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
  expect(ALBUM_BATCH_SIZE).toBe(12);
  expect(mosaicBatchEnds(38)).toEqual([12, 24, 38]);
});

it.each(pilotSlugs)("plans %s in canonical, complete, prefix-stable rows", (slug) => {
  const photos = getAlbumPhotos(getAlbum(slug)!, "bg");
  const plan = createMosaicPlan(photos);
  expect(createMosaicPlan(photos)).toEqual(plan);
  expect(plan.batchEnds[0]).toBe(Math.min(ALBUM_BATCH_SIZE, photos.length));
  expect(plan.batchEnds.at(-1)).toBe(photos.length);
  for (const mode of Object.keys(mosaicBreakpoints) as (keyof typeof mosaicBreakpoints)[]) {
    const config = mosaicBreakpoints[mode];
    const rows = plan.rows[mode];
    expect(rows[0]?.start).toBe(0);
    expect(rows.at(-1)?.end).toBe(photos.length);
    expect(plan.cells[mode]).toHaveLength(photos.length);
    expect(plan.revealHeights[mode]).toHaveLength(plan.batchEnds.length);
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
    if (mode === "mobile" || mode === "desktop") {
      expect(rows.some((row) => row.blocks.some((block) => block.end - block.start === 2))).toBe(
        true,
      );
    }
    for (const end of plan.batchEnds) {
      expect(rows.some((row) => row.end === end)).toBe(true);
    }
  }
});

it.each(legacySlugs)("keeps %s on the standard album view, even with view=all", (slug) => {
  const { container } = render(<AlbumView album={getAlbum(slug)!} view="all" />);
  expect(container.querySelector(".unified-album")).toBeNull();
  expect(container.querySelector(".editorial-album")).toBeNull();
  expect(container.querySelector(".unified-album-view-nav")).toBeNull();
});

it.each(["paris", "istanbul"])("keeps %s on its Phase 2C editorial view", (slug) => {
  const { container } = render(<AlbumView album={getAlbum(slug)!} view="all" />);
  expect(container.querySelector(".editorial-album")).toBeInTheDocument();
  expect(container.querySelector(".unified-album-view-nav")).toBeNull();
});

it.each(pilotSlugs)("renders %s as concise Highlights and canonical batched gallery", (slug) => {
  const album = getAlbum(slug)!;
  const selection = getPilotEditorialAlbum(slug)!;
  const { container, rerender } = render(<AlbumView album={album} />);
  expect(container.querySelector("[data-opening-photo-slug]")).toHaveAttribute(
    "data-opening-photo-slug",
    album.coverPhotoSlug,
  );
  expect(
    [...container.querySelectorAll("[data-highlight-photo-slug]")].map((item) =>
      item.getAttribute("data-highlight-photo-slug"),
    ),
  ).toEqual(selection.highlights.slice(1).map((item) => item.photoSlug));
  expect(container.querySelector(".unified-album-grid")).toBeNull();
  expect(container.querySelectorAll(".unified-album-highlights figcaption")).toHaveLength(
    selection.highlights.length - 1,
  );
  expect(container.querySelectorAll(".unified-album-view-nav a")).toHaveLength(2);
  expect(container.querySelector(".unified-album-view-nav a[aria-current=page]")?.textContent).toBe(
    messages.bg.photos.highlights,
  );
  rerender(<AlbumView album={album} view="all" />);
  const canonical = getAlbumPhotos(album, "bg").map((photo) => photo.slug);
  const buttons = () => [
    ...container.querySelectorAll<HTMLButtonElement>(".unified-album-grid button"),
  ];
  expect(buttons().map((button) => button.dataset["albumPhotoSlug"])).toEqual(
    canonical.slice(0, 12),
  );
  expect(container.querySelector(".unified-album-view-nav a[aria-current=page]")?.textContent).toBe(
    messages.bg.photos.fullGallery,
  );
  while (container.querySelector(".unified-album-show-more")) {
    const more = container.querySelector<HTMLButtonElement>(".unified-album-show-more")!;
    const before = buttons().length;
    more.focus();
    fireEvent.click(more);
    const after = buttons().length;
    expect(after).toBe(
      createMosaicPlan(getAlbumPhotos(album, "bg")).batchEnds.find((end) => end > before),
    );
    expect(after - before).toBeLessThanOrEqual(ALBUM_BATCH_SIZE + 2);
    if (after < canonical.length) expect(document.activeElement).toBe(more);
    else if (before < canonical.length) expect(document.activeElement).toBe(buttons()[before]);
    expect(container.querySelector("output")?.textContent).toBe(
      messages.bg.photos.shownCount(after, canonical.length),
    );
  }
  expect(buttons().map((button) => button.dataset["albumPhotoSlug"])).toEqual(canonical);
  // Owner-approved Mosaic-C: no caption bar, while every trigger retains a published name.
  expect(container.querySelectorAll(".unified-album-grid figcaption")).toHaveLength(0);
  expect(container.querySelectorAll(".unified-album-grid button[aria-label]")).toHaveLength(
    canonical.length,
  );
  expect(
    buttons().every(
      (button, index) =>
        button.getAttribute("aria-label") ===
        messages.bg.common.openFullscreen(getAlbumPhotos(album, "bg")[index]!.title),
    ),
  ).toBe(true);
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
  it("uses the full canonical album and returns focus to the exact duplicate trigger", async () => {
    locale = language;
    const album = getAlbum("sveti-vlas")!;
    const items = getAlbumPhotos(album, locale);
    const { container } = render(<AlbumView album={album} view="all" />);
    const trigger = container.querySelector<HTMLButtonElement>(
      ".unified-album-grid button[data-full-index='0']",
    )!;
    const cover = container.querySelector<HTMLButtonElement>("[data-opening-photo-slug]")!;
    expect(trigger).not.toBe(cover);
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole("dialog");
    expect(screen.getByRole("dialog")).toHaveTextContent(items[0]!.title);
    if (items[0]!.caption) expect(screen.getByRole("dialog")).toHaveTextContent(items[0]!.caption);
    expect(screen.getByText(new RegExp(`1 / ${items.length}$`))).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(new RegExp(`2 / ${items.length}$`))).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });
});
