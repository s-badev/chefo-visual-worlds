import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    ...rest
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={slug ? to.replace("$slug", slug) : to} className={className} {...rest}>
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
    "opens on the owner's collage cover with its own %s alt and intro line, without a caption",
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
      // No visible caption: the places are named only in the alt text.
      const text = container.textContent!.replace(/\s+/g, " ");
      expect(text).not.toContain(caption);
      expect(text).not.toContain(caption.split(" · ").slice(0, 2).join(" · "));
      expect(container.querySelector(".photography-cover-caption")).toBeNull();
      expect(container.querySelector("[data-photo-opening] figcaption")).toBeNull();
      // The intro line under the heading, here and on Home, without "light", and alone in its column.
      const leadColumn = container.querySelector(".photography-editorial-lead")!;
      expect([...leadColumn.children].map((child) => child.tagName)).toEqual(["P"]);
      const lead = leadColumn.querySelector("p")!;
      expect(lead).toHaveTextContent(intro);
      expect(lead.textContent).not.toMatch(light);
      expect(messages[locale].home.photoText).toBe(intro);
      // The Paris photograph that used to open the page is no longer used here.
      expect(container.querySelector('img[src*="paris-005"]')).toBeNull();
    },
  );

  it("keeps the original 20rem intro column at every width, with no caption styles left", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ");
    // The heading and intro columns as before the caption grew: one rule, from 900px up.
    expect(css).toContain(
      "@media (min-width: 900px) { .photography-editorial-mast { grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem); align-items: end; column-gap: 4rem; padding-bottom: 4rem; } }",
    );
    expect(css.match(/\.photography-editorial-mast \{ grid-template-columns:/g)).toHaveLength(1);
    expect(css).not.toContain("photography-cover-caption");
    expect(css).not.toMatch(/\.photography-editorial-lead span/);
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
    // The live preview answers only to a wide window with a fine, hovering pointer.
    const media = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("pointer: fine"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const { container } = render(<PhotographyView />);
    // The current preview is the top (last) layer of the stack.
    const top = () =>
      container.querySelector(".photography-editorial-preview-layer:last-child img");

    const index = container.querySelector(".photography-editorial-destination-list")!;
    fireEvent.mouseEnter(
      within(index as HTMLElement)
        .getByText("Istanbul")
        .closest("li")!,
    );
    expect(top()).toHaveAttribute("src", "/photos/istanbul/istanbul-024-maidens-tower.webp");
    fireEvent.focusIn(
      within(index as HTMLElement)
        .getByText("Sofia")
        .closest("a")!,
    );
    media.mockRestore();
    expect(top()).toHaveAttribute("src", "/photos/sofia/sofia-001.webp");
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

  it("starts with an empty passport, stamps on hover/focus in any order without storage, and renders the 4-frame strip without numbers", () => {
    activeLocale = "en";
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const media = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("pointer: fine"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const { container } = render(<PhotographyView />);
    const index = container.querySelector(".photography-editorial-destination-list")!;
    const rowStamps = () => container.querySelectorAll(".photography-editorial-row-stamp svg");
    const passportStamps = () =>
      container.querySelectorAll(".photography-editorial-passport-stamp");
    const counters = () =>
      Array.from(container.querySelectorAll(".photography-editorial-passport-count")).map(
        (el) => el.textContent,
      );

    // Initial render: 0 stamps in list, 0 in passport, counter "0 / 13".
    expect(rowStamps()).toHaveLength(0);
    expect(passportStamps()).toHaveLength(0);
    expect(counters()).toEqual(["0 / 13", "0 / 13"]);

    const sofiaLi = within(index as HTMLElement)
      .getByText("Sofia")
      .closest("li")!;
    const istanbulLi = within(index as HTMLElement)
      .getByText("Istanbul")
      .closest("li")!;
    const rilaLi = within(index as HTMLElement)
      .getByText("Rila")
      .closest("li")!;
    const parisLi = within(index as HTMLElement)
      .getByText("Paris")
      .closest("li")!;

    // Click and touch do not add stamps.
    fireEvent.click(parisLi);
    fireEvent.touchStart(parisLi);
    fireEvent.touchEnd(parisLi);
    expect(rowStamps()).toHaveLength(0);
    expect(passportStamps()).toHaveLength(0);

    // Hovering Sofia -> 1 stamp in row and passport, counter "1 / 13".
    fireEvent.mouseEnter(sofiaLi);
    expect(rowStamps()).toHaveLength(1);
    expect(passportStamps()).toHaveLength(1);
    expect(counters()).toEqual(["1 / 13", "1 / 13"]);

    // Repeated hover on Sofia does not add a second stamp.
    fireEvent.mouseEnter(sofiaLi);
    expect(rowStamps()).toHaveLength(1);
    expect(passportStamps()).toHaveLength(1);

    // Hovering Istanbul and Rila in arbitrary order -> 3 stamps total.
    fireEvent.mouseEnter(istanbulLi);
    fireEvent.mouseEnter(rilaLi);
    expect(rowStamps()).toHaveLength(3);
    expect(passportStamps()).toHaveLength(3);
    expect(counters()).toEqual(["3 / 13", "3 / 13"]);

    // Mini strip has 4 frames and no numbers (01-04 or <em>).
    const strip = container.querySelector(".photography-editorial-strip")!;
    expect(strip).not.toBeNull();
    expect(strip.querySelectorAll("img")).toHaveLength(4);
    expect(strip.querySelector("em")).toBeNull();
    expect(strip.textContent).toBe("");

    // 13 thumbnails remain in DOM.
    expect(container.querySelectorAll(".photography-editorial-thumb")).toHaveLength(13);

    // Zero localStorage / sessionStorage writes.
    expect(setItemSpy).not.toHaveBeenCalled();
    media.mockRestore();
    setItemSpy.mockRestore();
  });

  it("renders the lazy album map only at >=1680px with fine pointer, switches europe/balkans layers, activates the coast lens, and suppresses airplane flight under reduced motion", async () => {
    activeLocale = "bg";

    // Below 1680px (desktop 1024..1679): map does not render.
    const narrowMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("min-width: 1024px") && !query.includes("min-width: 1680px"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const narrow = render(<PhotographyView />);
    expect(narrow.container.querySelector(".photography-editorial-map")).toBeNull();
    narrowMedia.mockRestore();
    cleanup();

    // At >=1680px + fine pointer + reduced-motion: map renders lazily.
    const wideMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches:
            query.includes("pointer: fine") || query.includes("prefers-reduced-motion: reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const { container } = render(<PhotographyView />);
    await waitFor(() => {
      expect(container.querySelector(".photography-editorial-map")).not.toBeNull();
    });

    vi.useFakeTimers();
    const mapZone = () => container.querySelector<HTMLElement>(".photography-editorial-map")!;
    const index = container.querySelector(".photography-editorial-destination-list")!;
    const plane = () => container.querySelector<SVGGElement>(".photography-editorial-map-plane")!;
    const lens = () => container.querySelector<HTMLElement>(".photography-editorial-map-lens")!;

    // Default initial album is Sofia (albums[0]) -> "balkans" layer.
    expect(mapZone()).toHaveAttribute("data-layer", "balkans");
    expect(plane().style.display).toBe("none");

    // Hover Paris -> after 350ms dwell, map switches to "europe", no airplane under reduced-motion.
    fireEvent.mouseEnter(
      within(index as HTMLElement)
        .getByText("Париж")
        .closest("li")!,
    );
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mapZone()).toHaveAttribute("data-layer", "europe");
    expect(lens()).not.toHaveAttribute("data-hot");
    expect(plane().style.display).toBe("none");

    // Hover Sunny Beach -> after 350ms dwell, map switches to "balkans" and coast lens is hot.
    fireEvent.mouseEnter(
      within(index as HTMLElement)
        .getByText("Слънчев бряг")
        .closest("li")!,
    );
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mapZone()).toHaveAttribute("data-layer", "balkans");
    expect(mapZone()).toHaveAttribute("data-coast", "true");
    expect(lens()).toHaveAttribute("data-hot", "true");
    expect(
      lens().querySelector('[data-pin-slug="sunny-beach"].photography-editorial-map-pin--active'),
    ).not.toBeNull();
    expect(plane().style.display).toBe("none");

    // Hover Sofia -> after 350ms dwell, stays on "balkans" and clears coast lens hot state.
    fireEvent.mouseEnter(
      within(index as HTMLElement)
        .getByText("София")
        .closest("li")!,
    );
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(mapZone()).toHaveAttribute("data-layer", "balkans");
    expect(lens()).not.toHaveAttribute("data-hot");

    vi.useRealTimers();
    wideMedia.mockRestore();
  });

  it("implements the mobile two-tap selection model with route strip, open link, and polite live announcement", () => {
    activeLocale = "bg";
    const mobileMedia = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches:
            query.includes("max-width: 767px") || query.includes("prefers-reduced-motion: reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );

    const { container } = render(<PhotographyView />);
    const index = container.querySelector(".photography-editorial-destination-list")!;
    const parisLink = within(index as HTMLElement)
      .getByText("Париж")
      .closest("a")!;
    const onBubbleClick = vi.fn((event: MouseEvent) => event.preventDefault());
    parisLink.addEventListener("click", onBubbleClick);
    const mobileOpen = () =>
      container.querySelector<HTMLAnchorElement>(".photography-editorial-mobile-open")!;
    const liveRegion = () => container.querySelector<HTMLElement>("[data-mobile-live]")!;
    const counters = () =>
      Array.from(container.querySelectorAll(".photography-editorial-passport-count")).map(
        (el) => el.textContent,
      );

    expect(container.querySelector(".photography-editorial-route")).not.toBeNull();
    expect(mobileOpen()).toHaveAttribute("href", "/photography/albums/sofia");
    expect(counters()).toEqual(["0 / 13", "0 / 13"]);

    // First tap on Paris: prevents navigation in capture phase, stamps Paris (1 / 13), updates mobile open link & live text.
    const firstTapAllowed = fireEvent.click(parisLink);
    expect(firstTapAllowed).toBe(false);
    expect(onBubbleClick).not.toHaveBeenCalled();
    expect(parisLink).toHaveAttribute("data-mobile-selected", "true");
    expect(counters()).toEqual(["1 / 13", "1 / 13"]);
    expect(mobileOpen()).toHaveAttribute("href", "/photography/albums/paris");
    expect(liveRegion()).toHaveTextContent("Избран: Париж. Натисни отново, за да отвориш.");

    // Second tap on Paris: reaches the link bubble listener and navigates.
    fireEvent.click(parisLink);
    expect(onBubbleClick).toHaveBeenCalledTimes(1);

    mobileMedia.mockRestore();
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
    // The AI portrait lies in the same frame, inside the iris layer over the real one.
    expect(ai.closest("[data-portrait-frame]")).toBe(frame);
    expect(ai.parentElement).toHaveClass("portrait-iris");
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
    // The closed AI portrait layer carries its "AI" badge (hidden, clipped); it is not a step.
    for (const step of messages[locale].about.steps) {
      expect(
        screen.queryByText(step.title, { ignore: "script, style, .portrait-iris *" }),
      ).toBeNull();
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
