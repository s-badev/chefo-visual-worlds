import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/site";
import { Surface } from "@/components/surface";
import { messages } from "@/i18n/messages";

let pathname = "/photography";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname, searchStr: "" } }),
}));

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: "bg", t: messages.bg }) };
});

vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
  LanguageSwitcher: ({ label }: { label: string }) => <div role="group" aria-label={label} />,
}));

afterEach(() => {
  cleanup();
  pathname = "/photography";
});

document.elementsFromPoint = () => [];

describe("mobile navigation", () => {
  it("opens as a labelled dialog, closes with Escape and returns focus", async () => {
    render(<SiteHeader />);
    const trigger = screen.getByRole("button", { name: messages.bg.nav.open });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: messages.bg.nav.mobile });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const nav = within(dialog).getByRole("navigation", { name: messages.bg.nav.mobile });
    // As in the mock, the menu starts with Home; the section counts are not part of the names.
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.querySelector("small")?.getAttribute("aria-hidden")),
    ).toEqual(["true", "true", "true", "true"]);
    for (const name of [
      messages.bg.nav.homeShort,
      messages.bg.nav.photography,
      messages.bg.nav.ai,
      messages.bg.nav.about,
    ])
      expect(within(nav).getByRole("link", { name })).toBeInTheDocument();
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when a destination is chosen", async () => {
    render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: messages.bg.nav.open }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("link", { name: messages.bg.nav.ai }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes when the route changes underneath it", async () => {
    const { rerender } = render(<SiteHeader />);
    fireEvent.click(screen.getByRole("button", { name: messages.bg.nav.open }));
    await screen.findByRole("dialog");
    pathname = "/about";
    rerender(<SiteHeader />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Surface", () => {
  it("marks the header theme and scopes dark tokens", () => {
    render(
      <>
        <Surface tone="dark" seam aria-label="dark" />
        <Surface tone="light" as="div" aria-label="light" />
      </>,
    );
    const dark = screen.getByLabelText("dark");
    expect(dark.tagName).toBe("SECTION");
    expect(dark).toHaveAttribute("data-header-theme", "dark");
    expect(dark.classList).toContain("surface-dark");
    expect(dark.classList).toContain("seam-top");
    const light = screen.getByLabelText("light");
    expect(light.tagName).toBe("DIV");
    expect(light).toHaveAttribute("data-header-theme", "light");
    expect(light.classList).not.toContain("surface-dark");
  });
});
