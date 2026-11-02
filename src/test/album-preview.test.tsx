// Photography albums list + live preview: pure stack logic and the component's gating.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotographyEditorial } from "@/components/photography-editorial";
import { getAlbums } from "@/content/albums";
import { messages } from "@/i18n/messages";
import {
  ALBUM_PREVIEW,
  previewSource,
  pushLayer,
  settleLayers,
  warmSlugs,
  wipeDirection,
  type PreviewLayer,
} from "@/lib/album-preview";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: "bg", t: messages.bg }) };
});
vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    slug,
    children,
    className,
    "aria-current": current,
  }: {
    slug?: string;
    children: ReactNode;
    className?: string;
    "aria-current"?: "true";
  }) => (
    <a href={`/photography/albums/${slug}`} className={className} aria-current={current}>
      {children}
    </a>
  ),
}));

const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

const media = ({ fine, reduced = false }: { fine: boolean; reduced?: boolean }) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches:
          query === ALBUM_PREVIEW.query
            ? fine
            : query.includes("prefers-reduced-motion: reduce")
              ? reduced
              : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("album preview stack", () => {
  it("keeps every timing, size and the layer cap in one place", () => {
    expect(ALBUM_PREVIEW).toMatchObject({
      query: "(min-width: 1024px) and (hover: hover) and (pointer: fine)",
      headerRem: 4,
      stickyGapRem: 1.5,
      wipeMs: 750,
      ease: "cubic-bezier(.2,.7,.2,1)",
      zoomFrom: 1.07,
      zoomMs: 1400,
      removeAfterMs: 800,
      maxLayers: 3,
      warmAround: 2,
      rowSlidePx: 10,
      arrowSlidePx: 5,
    });
  });

  it("wipes from below when moving down the list and from above when moving up", () => {
    expect(wipeDirection(0, 3)).toBe("down");
    expect(wipeDirection(5, 1)).toBe("up");
    expect(wipeDirection(2, 2)).toBeNull();
    expect(css).toContain(
      "@keyframes album-preview-wipe-down { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }",
    );
    expect(css).toContain(
      "@keyframes album-preview-wipe-up { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }",
    );
    expect(css).toContain(
      "@keyframes album-preview-settle { from { transform: scale(var(--preview-zoom-from)); } to { transform: scale(1); } }",
    );
  });

  it("always ends on the last request, recycles an album still in the stack, and caps the stack", () => {
    let stack: PreviewLayer[] = [{ key: 0, slug: "a", dir: null }];
    stack = pushLayer(stack, "a", null, 1);
    expect(stack).toEqual([{ key: 0, slug: "a", dir: null }]);
    let key = 1;
    for (const slug of ["b", "c", "d", "e", "f"]) stack = pushLayer(stack, slug, "down", key++);
    expect(stack.map((l) => l.slug)).toEqual(["d", "e", "f"]);
    expect(stack).toHaveLength(ALBUM_PREVIEW.maxLayers);
    // Back to an album still in the stack: it moves to the top with a fresh wipe, no duplicate.
    stack = pushLayer(stack, "d", "up", key++);
    expect(stack.map((l) => l.slug)).toEqual(["e", "f", "d"]);
    expect(stack.at(-1)).toEqual({ key: key - 1, slug: "d", dir: "up" });
    expect(settleLayers(stack)).toEqual([stack.at(-1)]);
  });

  it("warms only the neighbours of the current row", () => {
    const slugs = ["a", "b", "c", "d", "e", "f"];
    expect(warmSlugs(slugs, 0)).toEqual(["b", "c"]);
    expect(warmSlugs(slugs, 3)).toEqual(["e", "c", "f", "b"]);
    expect(warmSlugs(slugs, 5)).toEqual(["e", "d"]);
  });

  it("falls back to the first photo, then to a typographic panel", () => {
    expect(previewSource("cover", "first")).toEqual({ kind: "photo", photo: "cover" });
    expect(previewSource(undefined, "first")).toEqual({ kind: "photo", photo: "first" });
    expect(previewSource(undefined, undefined)).toEqual({ kind: "type" });
  });
});

describe("album preview on the Photography page", () => {
  const albums = getAlbums();
  const layers = (c: HTMLElement) =>
    Array.from(c.querySelectorAll(".photography-editorial-preview-layer"));
  const row = (c: HTMLElement, i: number) =>
    c.querySelectorAll<HTMLLIElement>(".photography-editorial-destination-list li")[i]!;

  it("renders the first album, decorative and inert, with no current row before the preview is live", () => {
    media({ fine: false });
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    const figure = container.querySelector("figure.photography-editorial-preview")!;
    expect(figure).toHaveAttribute("aria-hidden", "true");
    expect(figure).toHaveAttribute("inert");
    expect(layers(container)).toHaveLength(1);
    expect(layers(container)[0]!.querySelector("img")).toHaveAttribute("decoding", "async");
    expect(
      within(figure as HTMLElement).getByText(messages.bg.photos.count(albums[0]!.photos.length)),
    ).toBeTruthy();
    expect(container.querySelector('[aria-current="true"]')).toBeNull();
  });

  it("changes nothing on touch or narrow windows: hover and focus leave the preview alone", () => {
    media({ fine: false });
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    fireEvent.mouseEnter(row(container, 4));
    fireEvent.focusIn(row(container, 6).querySelector("a")!);
    expect(layers(container)).toHaveLength(1);
    expect(container.querySelector('[aria-current="true"]')).toBeNull();
    expect(css).toContain(
      "@media (min-width: 1024px) and (hover: hover) and (pointer: fine) { .photography-editorial-index-grid {",
    );
  });

  it("makes the hovered row current, wipes in its cover, and settles to one layer", () => {
    vi.useFakeTimers();
    media({ fine: true });
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    expect(container.querySelector('[aria-current="true"]')).toHaveAttribute(
      "href",
      `/photography/albums/${albums[0]!.slug}`,
    );
    fireEvent.mouseEnter(row(container, 3));
    const stack = layers(container);
    expect(stack).toHaveLength(2);
    expect(stack[1]).toHaveAttribute("data-dir", "down");
    expect(container.querySelector('[aria-current="true"]')).toHaveAttribute(
      "href",
      `/photography/albums/${albums[3]!.slug}`,
    );
    fireEvent.mouseEnter(row(container, 1));
    expect(layers(container).at(-1)).toHaveAttribute("data-dir", "up");
    // Leaving the list keeps the last album.
    fireEvent.mouseLeave(container.querySelector(".photography-editorial-destination-list")!);
    act(() => vi.advanceTimersByTime(ALBUM_PREVIEW.removeAfterMs + 10));
    expect(layers(container)).toHaveLength(1);
    expect(layers(container)[0]!.querySelector("img")!.getAttribute("src")).toContain(
      albums[1]!.slug,
    );
    expect(container.querySelector('[aria-current="true"]')).toHaveAttribute(
      "href",
      `/photography/albums/${albums[1]!.slug}`,
    );
  });

  it("keeps a rapid sweep bounded and ends on the last row", () => {
    vi.useFakeTimers();
    media({ fine: true });
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    for (let i = 1; i < albums.length; i++) {
      fireEvent.mouseEnter(row(container, i));
      expect(layers(container).length).toBeLessThanOrEqual(ALBUM_PREVIEW.maxLayers);
    }
    const last = albums.at(-1)!.slug;
    expect(layers(container).at(-1)!.querySelector("img")!.getAttribute("src")).toContain(last);
    act(() => vi.advanceTimersByTime(ALBUM_PREVIEW.removeAfterMs + 10));
    expect(layers(container)).toHaveLength(1);
  });

  it("warms nothing at page load, then only the current row's neighbours once the list is used", () => {
    vi.useFakeTimers();
    media({ fine: true });
    const requested: string[] = [];
    vi.stubGlobal(
      "Image",
      class {
        decoding = "";
        set src(value: string) {
          requested.push(value);
        }
      },
    );
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    act(() => vi.advanceTimersByTime(ALBUM_PREVIEW.idleTimeoutMs * 3));
    expect(requested).toEqual([]);
    fireEvent.mouseEnter(row(container, 4));
    act(() => vi.advanceTimersByTime(ALBUM_PREVIEW.idleTimeoutMs + 10));
    const near = warmSlugs(
      albums.map((a) => a.slug),
      4,
    );
    expect(requested).toHaveLength(near.length);
    near.forEach((slug, i) => expect(requested[i]).toContain(`/${slug}/`));
    vi.unstubAllGlobals();
  });

  it("swaps at once under reduced motion", () => {
    media({ fine: true, reduced: true });
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    fireEvent.mouseEnter(row(container, 5));
    expect(layers(container)).toHaveLength(1);
    expect(layers(container)[0]).not.toHaveAttribute("data-dir");
    expect(css).toContain(
      '@media (prefers-reduced-motion: no-preference) { .photography-editorial-preview-layer[data-dir="down"] {',
    );
  });
});
