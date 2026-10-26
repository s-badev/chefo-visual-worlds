import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAlbum, getAlbumPhotos } from "@/content/albums";
import { messages } from "@/i18n/messages";
import { AlbumView } from "@/views/photography";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: "bg", t: messages.bg }) };
});

vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    slug,
    children,
    ...rest
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
  }) => (
    <a href={slug ? to.replace("$slug", slug) : to} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe.each([
  { albumSlug: "paris", photoSlug: "paris-048" },
  { albumSlug: "istanbul", photoSlug: "istanbul-017" },
] as const)("%s exact Lightbox focus", ({ albumSlug, photoSlug }) => {
  it.each(["curated", "gallery"] as const)(
    "returns to the original %s DOM button after navigation and Escape",
    async (kind) => {
      const album = getAlbum(albumSlug)!;
      const photos = getAlbumPhotos(album, "bg");
      const photoIndex = photos.findIndex((photo) => photo.slug === photoSlug);
      const { container } = render(<AlbumView album={album} />);
      const curated = container.querySelector<HTMLButtonElement>(
        `button[data-curated-photo-slug="${photoSlug}"]`,
      )!;
      const gallery = container.querySelector<HTMLButtonElement>(
        `button[data-album-photo-slug="${photoSlug}"]`,
      )!;
      const originalTriggerElement = kind === "curated" ? curated : gallery;
      const otherTriggerElement = kind === "curated" ? gallery : curated;

      expect(curated).not.toBe(gallery);
      expect(curated.isConnected && gallery.isConnected).toBe(true);
      expect(originalTriggerElement.dataset["fullIndex"]).toBe(String(photoIndex));

      originalTriggerElement.focus();
      fireEvent.click(originalTriggerElement);
      await screen.findByRole("dialog");
      expect(
        screen.getByText(new RegExp(`${photoIndex + 1} / ${photos.length}$`)),
      ).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "ArrowRight" });
      expect(
        screen.getByText(
          new RegExp(`${((photoIndex + 1) % photos.length) + 1} / ${photos.length}$`),
        ),
      ).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

      expect(document.activeElement).toBe(originalTriggerElement);
      expect(document.activeElement).not.toBe(otherTriggerElement);
    },
  );
});
