// Stage 9b: the header, the language switch and the footer as in the approved mock (.hd, .nav,
// .lang, .ft). Replaces the old one-underline contract (header-underline.test.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter, SiteHeader } from "@/components/site";
import { messages } from "@/i18n/messages";
import { LanguageSwitcher } from "@/i18n/link";

let pathname = "/photography";
let locale: "bg" | "en" = "bg";

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname, searchStr: "" } }),
  useRouter: () => ({ navigate: () => {} }),
  Link: ({
    to,
    children,
    className,
    activeProps,
    ...rest
  }: {
    to: string;
    children: ReactNode;
    className?: string;
    activeProps?: { className?: string };
  }) => {
    const active = to === pathname || (to !== "/" && pathname.startsWith(to));
    return (
      <a
        href={to}
        className={[className, active ? activeProps?.className : ""].filter(Boolean).join(" ")}
        aria-current={active ? "page" : undefined}
        {...rest}
      >
        {children}
      </a>
    );
  },
}));

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return {
    ...actual,
    useLocale: () => locale,
    useT: () => ({ locale, t: messages[locale] }),
  };
});

afterEach(() => {
  cleanup();
  pathname = "/photography";
  locale = "bg";
});

document.elementsFromPoint = () => [];
const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

describe.each(["bg", "en"] as const)("header (%s)", (lang) => {
  it("names three sections, marks the current one and rolls each label without reading it twice", () => {
    locale = lang;
    pathname = lang === "en" ? "/en/photography" : "/photography";
    const t = messages[lang];
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: t.nav.main });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual(
      [t.nav.photography, t.nav.ai, t.nav.about].map((label) => label + label),
    );
    // Each label is set twice for the roll; the copy is hidden, so the name is said once.
    expect(links.map((a) => a.querySelectorAll('[aria-hidden="true"]').length)).toEqual([1, 1, 1]);
    expect(within(nav).getByRole("link", { name: t.nav.photography })).toHaveClass("is-current");
    expect(within(nav).getByRole("link", { name: t.nav.ai })).not.toHaveClass("is-current");
    expect(nav.querySelector(".site-nav-ind")).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector(".header-underline")).toBeNull();
  });
});

describe.each(["bg", "en"] as const)("language switch (%s)", (lang) => {
  it("reads BG | EN with a hidden rule, the current language marked and tagged", () => {
    locale = lang;
    render(<LanguageSwitcher label={messages[lang].nav.language} />);
    const group = screen.getByRole("group", { name: messages[lang].nav.language });
    const [bg, en] = within(group).getAllByRole("link");
    expect(bg).toHaveTextContent("BG");
    expect(en).toHaveTextContent("EN");
    expect(bg).toHaveAttribute("lang", "bg");
    expect(en).toHaveAttribute("lang", "en");
    expect(lang === "bg" ? bg : en).toHaveAttribute("aria-current", "true");
    expect(lang === "bg" ? en : bg).not.toHaveAttribute("aria-current");
    const rule = group.querySelector(".lang-switch-rule")!;
    expect(rule).toHaveAttribute("aria-hidden", "true");
    expect(rule.textContent).toBe("");
    expect(group.textContent).toBe("BGEN");
  });
});

describe.each(["bg", "en"] as const)("footer (%s)", (lang) => {
  it("has the logo, the tagline, the three sections and the copyright line", () => {
    locale = lang;
    const t = messages[lang];
    render(<SiteFooter />);
    const footer = document.querySelector("footer")!;
    expect(within(footer).getByRole("link", { name: t.nav.home })).toHaveClass("brand-lockup");
    expect(within(footer).getByText(t.footer.tagline)).toHaveClass("site-footer-tag");
    const nav = within(footer).getByRole("navigation", { name: t.footer.nav });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual([t.nav.photography, t.nav.ai, t.nav.about]);
    expect(footer.querySelector(".site-footer-base")).toHaveTextContent(
      new RegExp(`© \\d{4} Chefo Visual Worlds\\. ${t.footer.rights}`),
    );
    expect(footer.querySelector(".site-footer-base")).toHaveTextContent(t.footer.motto);
  });
});

describe("header and footer paint (the mock's values)", () => {
  it("is 72px (64px below 900px), frosted, with the gold pill and the gold logo halo", () => {
    expect(css).toContain(":root { --site-header-h: 72px; }");
    expect(css).toContain("@media (max-width: 899px) { :root { --site-header-h: 64px; } }");
    expect(css).toContain(
      'header[data-theme="light"]:not([data-transparent]) { background-color: rgb(246 240 228 / 0.9);',
    );
    expect(css).toContain("box-shadow: inset 0 0 0 1px rgb(201 164 107 / 0.85);");
    expect(css).toContain(".lang-switch-rule { width: 1px; height: 14px;");
    expect(css).toMatch(
      /\.site-footer-grid \{ display: grid; grid-template-columns: minmax\(0, 1fr\) auto;/,
    );
    // No transform in a pressed state anywhere.
    for (const r of css.match(/[^{}]*:active[^{]*\{[^}]*\}/g) ?? [])
      expect(r).not.toMatch(/scale|translate|rotate/);
  });
});

describe("All photos filters keep their rows when Manrope swaps in (CLS)", () => {
  it("uses fallbacks widened to Manrope's measured width", () => {
    const block = css.replace(/\r\n/g, "\n");
    expect(block).toMatch(
      /"Manrope Chip Fallback";\s*src: local\("Segoe UI"\)[^}]*size-adjust: 106\.2%;/,
    );
    expect(block).toMatch(
      /"Manrope Chip Fallback Arial";\s*src: local\("Arial"\)[^}]*size-adjust: 104\.4%;/,
    );
    expect(block).toMatch(
      /\.photo-filters,\s*\.photo-filters button \{\s*font-family: "Manrope", "Manrope Chip Fallback"/,
    );
  });
});
