import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { PhotographyView } from "@/views/photography";

let activeLocale: "bg" | "en" = "bg";
let currentSearch: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
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
        "Истанбул",
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
        "Istanbul",
        "Bodrum",
      ],
    ],
  ] as const)("renders ten unique %s destination cards", (locale, names) => {
    activeLocale = locale;
    const { container } = render(<PhotographyView />);
    const links = Array.from(container.querySelectorAll('a[href^="/photography/albums/"]'));

    expect(links).toHaveLength(10);
    expect(new Set(links.map((link) => link.getAttribute("href"))).size).toBe(10);
    for (const name of names) expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getAllByText(messages[locale].photos.albumEmpty)).toHaveLength(6);
    expect(screen.queryByText(messages[locale].photos.theme)).not.toBeInTheDocument();
    expect(screen.queryByText(messages[locale].photos.place)).not.toBeInTheDocument();
  });

  it("switches to real photos and combines theme with album location", () => {
    const view = render(<PhotographyView />);
    fireEvent.click(screen.getByRole("button", { name: "Всички снимки" }));
    view.rerender(<PhotographyView />);
    expect(screen.getByText("8 кадъра")).toBeInTheDocument();
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

    expect(screen.getByText("1 кадър")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Отвори „Синият час на Невски“/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Отвори „Трамвай 12/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Отвори „Синият час на Невски“/ }));
    expect(screen.getByRole("dialog", { name: "Синият час на Невски" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Затвори" }));

    fireEvent.click(
      within(screen.getByRole("group", { name: "Тема" })).getByRole("button", {
        name: "Природа",
      }),
    );
    view.rerender(<PhotographyView />);
    expect(screen.getByText("0 кадъра")).toBeInTheDocument();
    expect(screen.getByText(messages.bg.photos.empty)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Изчисти филтрите" }));
    view.rerender(<PhotographyView />);
    expect(screen.getByText("8 кадъра")).toBeInTheDocument();
  });
});
