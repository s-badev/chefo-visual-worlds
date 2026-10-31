import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { getAlbum, getAlbumPhotos } from "@/content/albums";
import { photos } from "@/content/photos";
import { filterGalleryPhotos, getAllGalleryPhotos } from "@/content/photo-gallery";
import { PortraitSwitch } from "@/components/portrait";
import { AboutView } from "@/views/about";
import { HomeView } from "@/views/home";
import { AlbumView, PhotographyView, PhotoDetailView } from "@/views/photography";

let activeLocale: "bg" | "en" = "bg";
let currentSearch: Record<string, unknown> = {};

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
    useSearch: () => currentSearch,
    useNavigate:
      () =>
      ({ search }: { search: (previous: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch);
      },
  };
});

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return {
    ...actual,
    useT: () => ({ locale: activeLocale, t: messages[activeLocale] }),
  };
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

afterEach(() => {
  cleanup();
  activeLocale = "bg";
  currentSearch = {};
});

describe("Photography album overview", () => {
  it.each([
    [
      "bg",
      [
        "София",
        "Слънчев бряг",
        "Свети Влас",
        "Несебър",
        "Бургас",
        "Пловдив",
        "Рила",
        "Тунис",
        "Париж",
        "Лион",
        "Истанбул",
        "Одрин",
        "Бодрум",
      ],
    ],
    [
      "en",
      [
        "Sofia",
        "Sunny Beach",
        "Sveti Vlas",
        "Nessebar",
        "Burgas",
        "Plovdiv",
        "Rila",
        "Tunisia",
        "Paris",
        "Lyon",
        "Istanbul",
        "Edirne",
        "Bodrum",
      ],
    ],
  ] as const)("renders thirteen unique %s destination cards", (locale, names) => {
    activeLocale = locale;
    const { container } = render(<PhotographyView />);
    const index = container.querySelector(".photography-editorial-destination-list")!;
    const links = Array.from(index.querySelectorAll('a[href^="/photography/albums/"]'));

    expect(links).toHaveLength(13);
    expect(new Set(links.map((link) => link.getAttribute("href"))).size).toBe(13);
    expect(links.every((link) => link.querySelector("img") !== null)).toBe(true);
    expect(links.every((link) => !link.textContent?.match(/^\s*\d{2}\b/))).toBe(true);
    expect(
      links
        .find((link) => link.getAttribute("href") === "/photography/albums/bodrum")
        ?.querySelector("img")
        ?.getAttribute("src"),
    ).toBe("/photos/bodrum/bodrum-013.webp");
    expect(
      links
        .find((link) => link.getAttribute("href") === "/photography/albums/istanbul")
        ?.querySelector("img")
        ?.getAttribute("src"),
    ).toBe("/photos/istanbul/istanbul-024-maidens-tower.webp");
    expect(
      links
        .find((link) => link.getAttribute("href") === "/photography/albums/paris")
        ?.querySelector("img")
        ?.getAttribute("src"),
    ).toBe("/photos/paris/paris-052.webp");
    expect(
      links
        .find((link) => link.getAttribute("href") === "/photography/albums/lyon")
        ?.querySelector("img")
        ?.getAttribute("src"),
    ).toBe("/photos/lyon/lyon-001.webp");
    expect(
      links
        .find((link) => link.getAttribute("href") === "/photography/albums/edirne")
        ?.querySelector("img")
        ?.getAttribute("src"),
    ).toBe("/photos/edirne/edirne-006.webp");
    for (const name of names)
      expect(within(index as HTMLElement).getByText(name)).toBeInTheDocument();
    expect(screen.queryByText(messages[locale].photos.albumEmpty)).not.toBeInTheDocument();
    expect(screen.queryByText(messages[locale].photos.theme)).not.toBeInTheDocument();
    expect(screen.queryByText(messages[locale].photos.place)).not.toBeInTheDocument();
  });

  it.each([
    [
      "bg",
      "Колаж от мои снимки от София, Париж, Слънчев бряг, Бодрум и Тунис, обединени в една панорама.",
      "София · Париж · Слънчев бряг · Бодрум · Тунис",
    ],
    [
      "en",
      "Collage of my photos from Sofia, Paris, Sunny Beach, Bodrum and Tunisia, merged into one panorama.",
      "Sofia · Paris · Sunny Beach · Bodrum · Tunisia",
    ],
  ] as const)(
    "opens on the owner's collage cover with its own %s alt and caption",
    (locale, alt, caption) => {
      activeLocale = locale;
      const { container } = render(<PhotographyView />);
      const figure = container.querySelector<HTMLElement>("[data-photo-opening]")!;
      const cover = figure.querySelector<HTMLImageElement>("img")!;
      expect(cover).toHaveAttribute("src", "/covers/photography-journey-cover-2000.webp");
      expect(cover).toHaveAttribute(
        "srcset",
        "/covers/photography-journey-cover-1200.webp 1200w, /covers/photography-journey-cover-2000.webp 2000w",
      );
      expect(cover).toHaveAttribute("sizes", "100vw");
      expect(cover).toHaveAttribute("width", "2000");
      expect(cover).toHaveAttribute("height", "673");
      expect(cover).toHaveAttribute("alt", alt);
      expect(cover).toHaveAttribute("fetchpriority", "high");
      expect(cover).not.toHaveAttribute("loading", "lazy");
      // Not an album photograph: no link, button or lightbox on the cover.
      expect(figure.closest("a, button")).toBeNull();
      expect(figure.querySelector("a, button")).toBeNull();
      const captionText = container.querySelector(".photography-editorial-lead span")!.textContent!;
      expect(captionText.replace(/\u00a0/g, " ")).toBe(caption);
      // Lines may only break after a separator: never inside a place name, before a dot or
      // between the last two places (no lone word on a wrapped last line).
      expect(captionText).not.toMatch(/[^\u00a0]·|\S \S+ \S/);
      expect(captionText).toMatch(/\u00a0·\u00a0[^ ]+$/);
      // The Paris photograph that used to open the page is no longer used here.
      expect(container.querySelector('img[src*="paris-005"]')).toBeNull();
    },
  );

  it("ships the collage cover as two budgeted WebP files at its own ratio, without the PNG", () => {
    const covers = path.resolve(__dirname, "../../public/covers");
    expect(readdirSync(covers).sort()).toEqual([
      "photography-journey-cover-1200.webp",
      "photography-journey-cover-2000.webp",
    ]);
    const size = (file: string) => statSync(path.join(covers, file)).size;
    expect(size("photography-journey-cover-2000.webp")).toBeLessThanOrEqual(260 * 1024);
    expect(size("photography-journey-cover-1200.webp")).toBeLessThanOrEqual(140 * 1024);
    const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");
    const rule = css.match(/\.photography-editorial-opening-photo \{([^}]*)\}/)?.[1] ?? "";
    // Full width at the collage's own ratio: the sides (Eiffel Tower, pier) are never cropped.
    expect(rule).toContain("width: 100%");
    expect(rule).toContain("aspect-ratio: 2000 / 673");
    expect(rule).not.toMatch(/(^|[ ;])(height|min-height):/);
  });

  it("preserves the album preview without extra featured sections", () => {
    activeLocale = "en";
    const { container } = render(<PhotographyView />);

    const index = container.querySelector(".photography-editorial-destination-list")!;
    fireEvent.mouseEnter(
      within(index as HTMLElement)
        .getByText("Istanbul")
        .closest("li")!,
    );
    expect(container.querySelector(".photography-editorial-preview-frame img")).toHaveAttribute(
      "src",
      "/photos/istanbul/istanbul-024-maidens-tower.webp",
    );
    fireEvent.focusIn(
      within(index as HTMLElement)
        .getByText("Sofia")
        .closest("a")!,
    );
    expect(container.querySelector(".photography-editorial-preview-frame img")).toHaveAttribute(
      "src",
      "/photos/sofia/sofia-001.webp",
    );
    expect(container.querySelector(".photography-editorial-opening-photo")).not.toHaveClass(
      "photo-frame-print",
    );
    expect(container.querySelector(".photography-editorial-preview-frame")).toHaveClass(
      "photo-frame-print",
      "photo-frame-print--thin",
    );
    expect(
      container.querySelectorAll(".photography-editorial-thumb.photo-frame-keyline"),
    ).toHaveLength(13);
    expect(container.querySelector(".photography-editorial-reportage")).toBeNull();
    expect(container.querySelector(".photography-editorial-panorama")).toBeNull();
  });

  it("scopes frames to eligible Photography surfaces and keeps shared defaults unframed", () => {
    currentSearch = { view: "photos" };
    const allPhotos = render(<PhotographyView />);
    expect(allPhotos.container.querySelectorAll(".photo-frame-keyline").length).toBeGreaterThan(0);
    expect(allPhotos.container.querySelector("[role=dialog] .photo-frame-keyline")).toBeNull();
    cleanup();

    const detail = render(<PhotoDetailView photo={photos[0]!} />);
    expect(detail.container.querySelector(".photo-frame-print--detail")).toBeInTheDocument();
    expect(detail.container.querySelectorAll(".photo-frame-keyline")).toHaveLength(3);
    cleanup();

    const album = render(<AlbumView album={getAlbum("rila")!} />);
    expect(album.container.querySelector(".photo-frame-print, .photo-frame-keyline")).toBeNull();
    cleanup();

    const sharedDefault = render(<PortraitSwitch compact aiImage="/ai.png" />);
    expect(sharedDefault.container.querySelector(".photo-frame-print")).toBeNull();
    cleanup();

    const sharedOptIn = render(<PortraitSwitch aiImage="/ai.png" frame="matted" />);
    expect(sharedOptIn.container.querySelector(".photo-frame-print--portrait")).toBeInTheDocument();
  });

  it("opts About into the portrait frame while Home remains unframed", () => {
    const about = render(<AboutView />);
    expect(about.container.querySelectorAll(".photo-frame-print--portrait")).toHaveLength(1);
    cleanup();

    const home = render(<HomeView />);
    expect(home.container.querySelector(".photo-frame-print, .photo-frame-keyline")).toBeNull();
  });

  it("keeps both compact portrait versions in one cover-fitted ratio frame", () => {
    activeLocale = "bg";
    render(<PortraitSwitch compact aiImage="/ai.png" />);
    const real = screen.getByRole("img", { name: messages.bg.portrait.realAlt });
    const frame = real.parentElement!;
    expect(frame).toHaveClass("aspect-(--about-portrait-ratio)");
    expect(real).toHaveClass("object-cover", "object-center");

    fireEvent.click(screen.getByRole("button", { name: messages.bg.portrait.ai }));
    const ai = screen.getByRole("img", { name: messages.bg.portrait.aiAlt });
    expect(ai.parentElement).toBe(frame);
    expect(ai).toHaveClass("object-cover", "object-top");
    expect(ai.className).not.toMatch(/scale-|translate-/);
  });

  it.each(["bg", "en"] as const)("removes the About creation pipeline in %s", (locale) => {
    activeLocale = locale;
    render(<AboutView />);
    expect(
      screen.getByRole("heading", { level: 1, name: messages[locale].about.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(messages[locale].about.p1)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: messages[locale].about.howTitle })).toBeNull();
    for (const step of messages[locale].about.steps) {
      expect(screen.queryByText(step.title)).toBeNull();
    }
    expect(
      screen.getByRole("group", { name: messages[locale].portrait.group }),
    ).toBeInTheDocument();
  });

  it.each(["bg", "en"] as const)("shows the localized Lyon album in %s", (locale) => {
    activeLocale = locale;
    const { container } = render(<AlbumView album={getAlbum("lyon")!} />);
    expect(
      screen.getByRole("heading", { level: 1, name: locale === "bg" ? "Лион" : "Lyon" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        locale === "bg"
          ? "Градски пейзажи, архитектура и моменти от Лион, Франция."
          : "Cityscapes, architecture, and moments from Lyon, France.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(messages[locale].photos.albumEmpty)).not.toBeInTheDocument();
    expect(container.querySelectorAll(".unified-album-grid img")).toHaveLength(
      getAlbumPhotos(getAlbum("lyon")!, locale).length,
    );
    expect(container.querySelectorAll(".unified-album-highlight")).toHaveLength(4);
  });

  it.each(["bg", "en"] as const)("shows the localized Edirne album in %s", (locale) => {
    activeLocale = locale;
    const { container } = render(<AlbumView album={getAlbum("edirne")!} />);
    expect(
      screen.getByRole("heading", { level: 1, name: locale === "bg" ? "Одрин" : "Edirne" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        locale === "bg"
          ? "Архитектура, градски улици и моменти от Одрин, Турция."
          : "Architecture, city streets, and moments from Edirne, Turkey.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(messages[locale].photos.albumEmpty)).not.toBeInTheDocument();
    expect(container.querySelectorAll(".unified-album-grid img")).toHaveLength(
      getAlbumPhotos(getAlbum("edirne")!, locale).length,
    );
    expect(container.querySelectorAll(".unified-album-highlight")).toHaveLength(4);
  });

  it("switches to real photos and combines theme with album location", () => {
    const view = render(<PhotographyView />);
    fireEvent.click(screen.getByRole("button", { name: "Всички снимки" }));
    view.rerender(<PhotographyView />);
    expect(screen.getByText("426 кадъра")).toBeInTheDocument();
    expect(view.container.querySelectorAll('a[href^="/photography/albums/"]')).toHaveLength(0);

    fireEvent.click(
      within(screen.getByRole("group", { name: "Тема" })).getByRole("button", {
        name: "Архитектура",
      }),
    );
    view.rerender(<PhotographyView />);
    fireEvent.click(
      within(screen.getByRole("group", { name: "Място" })).getByRole("button", { name: "София" }),
    );
    view.rerender(<PhotographyView />);

    expect(
      screen.getByText(
        messages.bg.photos.count(
          filterGalleryPhotos(getAllGalleryPhotos("bg"), {
            theme: "architecture",
            location: "sofia",
          }).length,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Отвори „Синият час на Невски“/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Отвори „Трамвай 12/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Отвори „Синият час на Невски“/ }));
    expect(screen.getByRole("dialog", { name: "Синият час на Невски" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Следваща снимка" }));
    expect(screen.getByRole("dialog", { name: "Фонтан пред осветена сграда" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Затвори" }));

    fireEvent.click(
      within(screen.getByRole("group", { name: "Тема" })).getByRole("button", {
        name: "Море",
      }),
    );
    view.rerender(<PhotographyView />);
    expect(screen.getByText("0 кадъра")).toBeInTheDocument();
    expect(screen.getByText(messages.bg.photos.empty)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Изчисти филтрите" }));
    view.rerender(<PhotographyView />);
    expect(screen.getByText("426 кадъра")).toBeInTheDocument();
  });
});
