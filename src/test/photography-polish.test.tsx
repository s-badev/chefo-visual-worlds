// Photography polish (redesign stage 3): open-album pill, light strip, rows, theme chips.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { ALBUM_PREVIEW } from "@/lib/album-preview";
import { PhotographyView, validatePhotoSearch } from "@/views/photography";

let activeLocale: "bg" | "en" = "bg";
let currentSearch: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
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
  return { ...actual, useT: () => ({ locale: activeLocale, t: messages[activeLocale] }) };
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
    [key: string]: unknown;
  }) => (
    <a href={slug ? to.replace("$slug", slug) : to} {...rest}>
      {children}
    </a>
  ),
}));

const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");
/** Every block whose selector is exactly `selector`, joined (base rule plus any media variants). */
const rule = (selector: string) => {
  const blocks: string[] = [];
  const needle = ` ${selector} {`;
  for (let at = css.indexOf(needle); at >= 0; at = css.indexOf(needle, at + 1)) {
    // Only rule starts (after "}", "{" or a comment), not descendant selectors.
    if (!["}", "{", "/"].includes(css[at - 1] ?? "")) continue;
    blocks.push(css.slice(at, css.indexOf("}", at) + 1));
  }
  return blocks.join(" ");
};

const desktop = () => {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === ALBUM_PREVIEW.query || query.includes("pointer: fine"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1440);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  activeLocale = "bg";
  currentSearch = {};
});

const listRow = (container: HTMLElement, name: string) =>
  within(container.querySelector<HTMLElement>(".photography-editorial-destination-list")!)
    .getByText(name)
    .closest("li")!;

describe("open-album pill", () => {
  it.each([
    ["bg", "Париж", "Отвори албума", "Отвори албума"],
    ["en", "Paris", "Open album", "Open album"],
  ] as const)("is a real link for the previewed album (%s)", (locale, name, label, visible) => {
    activeLocale = locale;
    desktop();
    const { container } = render(<PhotographyView />);
    fireEvent.mouseEnter(listRow(container, name));
    const pill = container.querySelector<HTMLAnchorElement>(".photography-editorial-preview-open")!;
    // One accessible name, exactly the visible text: the stamp and the arrow are hidden.
    expect(pill).toHaveAccessibleName(label);
    expect(pill).not.toHaveAttribute("aria-label");
    expect(screen.getAllByRole("link", { name: label })).toContain(pill);
    expect(pill).toHaveAttribute("href", "/photography/albums/paris");
    expect(pill).toHaveTextContent(visible);
    // Not inside the decorative, inert preview figure: people can click and focus it.
    expect(pill.closest("[inert]")).toBeNull();
    expect(pill.closest('[aria-hidden="true"]')).toBeNull();
    pill.focus();
    expect(document.activeElement).toBe(pill);
    // It comes after the preview (info) in DOM order and carries the current album's stamp.
    const figure = container.querySelector("figure.photography-editorial-preview")!;
    expect(figure.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pill.querySelector(".photography-editorial-open-stamp svg")).not.toBeNull();
    expect(pill.querySelector(".photography-editorial-open-stamp")!.textContent).toContain("PARIS");
  });

  it("follows the previewed album and keeps the mock's paint contract", () => {
    desktop();
    const { container } = render(<PhotographyView />);
    fireEvent.mouseEnter(listRow(container, "Лион"));
    expect(container.querySelector(".photography-editorial-preview-open")).toHaveAttribute(
      "href",
      "/photography/albums/lyon",
    );
    expect(rule(".photography-editorial-preview-open")).toContain("min-height: 54px");
    expect(rule(".photography-editorial-preview-open")).toContain("padding: 0 22px 0 10px");
    expect(rule(".photography-editorial-preview-open")).toContain("border-radius: 999px");
    expect(rule(".photography-editorial-preview-open::before")).toContain(
      "clip-path: circle(0 at 28px 50%)",
    );
    expect(css).toContain(
      ".photography-editorial .photography-editorial-preview-open:focus-visible { outline: 2px solid var(--gold-ink); outline-offset: 3px; }",
    );
    // Hover paint only for a fine pointer; the strip lift waits for :has() support.
    expect(css).toContain(
      "@media (hover: hover) and (pointer: fine) { .photography-editorial-preview-open:hover {",
    );
    expect(css).toContain("@supports selector(:has(*))");
  });
});

describe("four-photo strip", () => {
  it("has no dark frame: sand placeholder, hairline outline and a soft shadow", () => {
    desktop();
    const { container } = render(<PhotographyView />);
    const items = container.querySelectorAll<HTMLElement>(".photography-editorial-strip-item");
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.style.background).toBe("");
      expect(item.style.boxShadow).toBe("");
    }
    const item = rule(".photography-editorial-strip-item");
    expect(item).not.toContain("#0b1424");
    expect(item).toContain("background: var(--sand)");
    expect(item).toContain("border-radius: 3px");
    expect(item).toContain("box-shadow: 0 10px 18px -14px rgba(22, 33, 58, 0.55)");
    expect(rule(".photography-editorial-strip-item::after")).toContain(
      "box-shadow: inset 0 0 0 1px rgba(22, 33, 58, 0.1)",
    );
  });
});

describe("album rows", () => {
  it("stamps each row once, however often it is visited", () => {
    desktop();
    const { container } = render(<PhotographyView />);
    for (const name of ["Париж", "Лион", "Париж", "Лион", "Париж"]) {
      fireEvent.mouseEnter(listRow(container, name));
    }
    for (const name of ["Париж", "Лион"]) {
      expect(
        listRow(container, name).querySelectorAll(".photography-editorial-row-stamp svg"),
      ).toHaveLength(1);
    }
    expect(container.querySelectorAll(".photography-editorial-row-stamp svg")).toHaveLength(2);
    expect(container.querySelectorAll(".photography-editorial-passport-stamp")).toHaveLength(2);
  });

  it("indents the selected row at once (no map dwell any more), and only that row", () => {
    desktop();
    const { container } = render(<PhotographyView />);
    const selected = () =>
      Array.from(container.querySelectorAll('[data-selected="true"]')).map((el) => el.textContent);
    expect(selected()).toHaveLength(0);
    fireEvent.mouseEnter(listRow(container, "Париж"));
    expect(selected()).toHaveLength(1);
    expect(selected()[0]).toContain("Париж");
    fireEvent.mouseLeave(listRow(container, "Париж"));
    expect(selected()).toHaveLength(0);
    expect(css).toContain(
      '.photography-editorial-row[data-selected="true"] { padding-left: var(--row-slide); }',
    );
    expect(ALBUM_PREVIEW.rowSlidePx).toBe(8);
    expect(ALBUM_PREVIEW.arrowSlidePx).toBe(4);
  });
});

describe("All photos theme chips", () => {
  const themeGroup = () => screen.getByRole("group", { name: messages[activeLocale].photos.theme });

  it.each(["bg", "en"] as const)("shows All plus five subjects, no Travel (%s)", (locale) => {
    activeLocale = locale;
    currentSearch = { view: "photos" };
    render(<PhotographyView />);
    const labels = within(themeGroup())
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(labels).toEqual(
      locale === "bg"
        ? ["Всички", "Море", "Град", "Залези", "Природа", "Архитектура"]
        : ["All", "Sea", "City", "Sunsets", "Nature", "Architecture"],
    );
  });

  it("keeps an old ?theme=travel link working: All is active and every photo shows", () => {
    currentSearch = validatePhotoSearch({ view: "photos", theme: "travel" });
    const { container } = render(<PhotographyView />);
    expect(within(themeGroup()).getByRole("button", { name: "Всички" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(themeGroup()).queryByRole("button", { name: "Пътувания" })).toBeNull();
    expect(container.textContent).toContain("426");
  });
});
