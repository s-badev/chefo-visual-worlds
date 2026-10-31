import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
      "Колаж от мои снимки от София, Париж, Бургас, Слънчев бряг, Бодрум и Тунис, обединени в една панорама.",
      "София · Париж · Бургас · Слънчев бряг · Бодрум · Тунис",
      "Места и моменти, които съм избрал да запазя.",
      /светлин/i,
    ],
    [
      "en",
      "Collage of my photos from Sofia, Paris, Burgas, Sunny Beach, Bodrum and Tunisia, merged into one panorama.",
      "Sofia · Paris · Burgas · Sunny Beach · Bodrum · Tunisia",
      "Places and moments I chose to keep.",
      /\blight\b/i,
    ],
  ] as const)(
    "opens on the owner's collage cover with its own %s alt, caption and intro line",
    (locale, alt, caption, intro, light) => {
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
      expect(cover.alt).toContain(locale === "bg" ? "Бургас" : "Burgas");
      expect(cover).toHaveAttribute("fetchpriority", "high");
      expect(cover).not.toHaveAttribute("loading", "lazy");
      // Not an album photograph: no link, button or lightbox on the cover.
      expect(figure.closest("a, button")).toBeNull();
      expect(figure.querySelector("a, button")).toBeNull();
      // One element per place, so a line can only break between places; CSS draws the dots.
      const places = [
        ...container.querySelectorAll(".photography-cover-caption > span > span"),
      ].map((place) => place.textContent);
      expect(places.join(" · ")).toBe(caption);
      expect(places).toContain(locale === "bg" ? "Бургас" : "Burgas");
      expect(places.every((place) => place && !place.includes("·"))).toBe(true);
      // The intro line under the heading, here and on Home, without "light".
      const lead = container.querySelector(".photography-editorial-lead p")!;
      expect(lead).toHaveTextContent(intro);
      expect(lead.textContent).not.toMatch(light);
      expect(messages[locale].home.photoText).toBe(intro);
      // The Paris photograph that used to open the page is no longer used here.
      expect(container.querySelector('img[src*="paris-005"]')).toBeNull();
    },
  );

  it("keeps the caption on one line from 768px and wraps it only between places on phones", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ");
    const rule = (selector: string) =>
      css.match(
        new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`),
      )?.[1] ?? "";
    // Each place is unbreakable and opens with a dot as wide as " · "; the list is pulled left by
    // that width and clipped, so no line starts or ends on a dot.
    expect(rule(".photography-cover-caption > span > span")).toContain("white-space: nowrap");
    const dot = rule(".photography-cover-caption > span > span::before");
    expect(dot).toContain('content: "·"');
    expect(dot).toContain("width: 0.63em");
    const list = rule(".photography-cover-caption > span");
    expect(list).toContain("margin-left: -0.63em");
    expect(list).toContain("text-wrap: balance");
    expect(rule(".photography-cover-caption")).toContain("overflow: hidden");
    // Room for one line: a wider lead column up to 1535px, then the caption runs into the margin.
    expect(css).toContain(
      "@media (min-width: 900px) and (max-width: 1535px) { .photography-editorial-mast { grid-template-columns: minmax(0, 1fr) minmax(16rem, 25rem); } }",
    );
    expect(css).toContain(
      "@media (min-width: 1536px) { .photography-cover-caption { width: max-content; } }",
    );
  });

  it("ships the collage cover as budgeted WebP files and never its master file", () => {
    const covers = path.resolve(__dirname, "../../public/covers");
    const cover = (file: string) => path.join(covers, file);
    expect(existsSync(cover("photography-journey-cover-2000.webp"))).toBe(true);
    expect(existsSync(cover("photography-journey-cover-1200.webp"))).toBe(true);
    expect(statSync(cover("photography-journey-cover-2000.webp")).size).toBeLessThanOrEqual(
      260 * 1024,
    );
    expect(statSync(cover("photography-journey-cover-1200.webp")).size).toBeLessThanOrEqual(
      140 * 1024,
    );
    // Other covers may live here; the master (or any raster original) of this one may not.
    expect(existsSync(cover("photography-journey-cover.png"))).toBe(false);
    expect(
      readdirSync(covers).filter((file) =>
        /^photography-journey-cover\.(png|jpe?g|tiff?|bmp|psd)$/i.test(file),
      ),
    ).toEqual([]);
    // The postbuild guard rejects such originals in the production build output.
    const guard = readFileSync(
      path.resolve(__dirname, "../../scripts/verify-editorial-strings.mjs"),
      "utf8",
    );
    expect(guard).toContain(
      "const coverMaster = /^photography-journey-cover.*\\.(png|jpe?g|tiff?|bmp|psd)$/i;",
    );
    expect(guard).toContain("coverMastersInOutput.length === 0");
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
