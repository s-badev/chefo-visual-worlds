import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { getAlbum } from "@/content/albums";
import { filterGalleryPhotos, getAllGalleryPhotos } from "@/content/photo-gallery";
import { AlbumView, PhotographyView } from "@/views/photography";

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
  ] as const)("renders twelve unique %s destination cards", (locale, names) => {
    activeLocale = locale;
    const { container } = render(<PhotographyView />);
    const index = container.querySelector(".photography-editorial-destination-list")!;
    const links = Array.from(index.querySelectorAll('a[href^="/photography/albums/"]'));

    expect(links).toHaveLength(12);
    expect(new Set(links.map((link) => link.getAttribute("href"))).size).toBe(12);
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
    ).toBe("/photos/paris/paris-054.webp");
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

  it("uses the approved opening and changes the desktop cover preview on hover and focus", () => {
    activeLocale = "en";
    const { container } = render(<PhotographyView />);
    const opening = container.querySelector<HTMLImageElement>("[data-photo-opening] img")!;
    expect(opening.getAttribute("src")).toBe("/photos/paris/paris-005.webp");
    expect(opening).toHaveAttribute("fetchpriority", "high");
    expect(opening).not.toHaveAttribute("loading", "lazy");
    expect(Number(opening.getAttribute("width"))).toBeGreaterThan(0);
    expect(Number(opening.getAttribute("height"))).toBeGreaterThan(0);

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
    expect(container.querySelectorAll(".photography-editorial-reportage-image")).toHaveLength(3);
    expect(container.querySelector(".photography-editorial-panorama-frame img")).toHaveAttribute(
      "src",
      "/photos/rila/rila-008.webp",
    );
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
    expect(container.querySelectorAll('img[src^="/photos/lyon/"]')).toHaveLength(5);
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
    expect(container.querySelectorAll('img[src^="/photos/edirne/"]')).toHaveLength(5);
    expect(container.querySelectorAll(".unified-album-highlight")).toHaveLength(4);
  });

  it("switches to real photos and combines theme with album location", () => {
    const view = render(<PhotographyView />);
    fireEvent.click(screen.getByRole("button", { name: "Всички снимки" }));
    view.rerender(<PhotographyView />);
    expect(screen.getByText("395 кадъра")).toBeInTheDocument();
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
    expect(screen.getByText("395 кадъра")).toBeInTheDocument();
  });
});
