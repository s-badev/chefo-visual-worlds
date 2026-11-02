// Header nav links and BG/EN: one underline system (active line = hover line, nothing stacks).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(path.resolve(__dirname, file), "utf8");
const css = read("../styles.css").replace(/\s+/g, " ");

describe("header single underline", () => {
  it("draws one 1px ::after line, gold on dark and gold ink on light, shown for the current item", () => {
    expect(css).toContain(
      "header .header-underline { position: relative; text-decoration-line: none; }",
    );
    expect(css).toContain(
      'header .header-underline::after { content: ""; position: absolute; inset-inline: var(--header-underline-inset, 0); bottom: -1px; height: 1px; background-color: var(--gold); transform: scaleX(0); transform-origin: center; transition: transform 200ms var(--motion-ease); pointer-events: none; }',
    );
    expect(css).toContain(
      'header[data-theme="light"] .header-underline::after { background-color: var(--gold-ink); }',
    );
    expect(css).toContain(
      "header .header-underline[aria-current]::after { transform: scaleX(1); }",
    );
  });

  it("repeats the same line on hover for other items only, and removes the global link lines", () => {
    const hover = css.indexOf(
      "@media (hover: hover) and (pointer: fine) { header .interaction-link.header-underline:hover",
    );
    expect(hover).toBeGreaterThan(-1);
    expect(css.slice(hover, hover + 400)).toContain(
      "header .interaction-link.header-underline:hover { text-decoration-line: none; border-bottom-color: transparent; box-shadow: none; } header .header-underline:not([aria-current]):hover::after { transform: scaleX(1); }",
    );
    // Focus keeps its outline (from .interaction-link) but adds no line either.
    expect(css).toContain(
      "header .interaction-link.header-underline:focus-visible { text-decoration-line: none; border-bottom-color: transparent; box-shadow: none; }",
    );
    // The new rules come after the global hover block, and outrank it (header + two classes).
    expect(css.indexOf("header .interaction-link.header-underline:hover")).toBeGreaterThan(
      css.indexOf(".interaction-link:hover {"),
    );
    // No header-underline hover rule outside a hover media query.
    const outside = css.replace(/@media \(hover: hover\)[^{]*\{(?:[^{}]*\{[^}]*\})*[^{}]*\}/g, "");
    expect(outside).not.toMatch(/\.header-underline[^{]*:hover/);
    expect(css).toContain(
      "@media (prefers-reduced-motion: reduce) { header .header-underline::after { transition: none; } }",
    );
  });

  it("keeps the global link hover for everything else", () => {
    expect(css).toContain(
      ".interaction-link:hover { color: var(--interaction-link-hover); text-decoration-line: underline; text-decoration-color: var(--interaction-gold); text-decoration-thickness: 2px; }",
    );
  });

  it("puts the nav links and the BG/EN switch on the shared class, without the old per-item lines", () => {
    const site = read("../components/site.tsx");
    const link = read("../i18n/link.tsx");
    expect(site).toContain(
      'className="header-underline interaction-link eyebrow border-b border-transparent pb-1 transition-colors"',
    );
    expect(site).toContain('activeClassName={dark ? "text-gold" : "text-gold-ink"}');
    expect(site).not.toContain("navUnderline");
    expect(site).not.toContain("after:scale-x-100");
    expect(link).toContain(
      '"header-underline interaction-link rounded-sm px-1.5 py-1 transition-colors [--header-underline-inset:0.375rem]"',
    );
  });
});
