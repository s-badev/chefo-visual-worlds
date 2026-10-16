import { cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAlbum, getAlbumPhotos } from "@/content/albums";
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
  });
});

it("keeps Nessebar on the existing standard album presentation", () => {
  const { container } = render(<AlbumView album={getAlbum("nessebar")!} />);
  expect(container.querySelector(".editorial-album")).toBeNull();
  expect(container.querySelector(".unified-album")).toBeNull();
  expect(container.querySelector("article figure button img")?.getAttribute("src")).toBe(
    getAlbumPhotos(getAlbum("nessebar")!, "bg")[0]!.image,
  );
});
