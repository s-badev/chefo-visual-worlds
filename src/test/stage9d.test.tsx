// Stage 9d (owner decisions after the mock): the AI index has one continuous blurred backdrop
// from the world slider into the first hall (or the All works grid), and the footer shares the
// header row's container so both start and end on the same edges.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

/** Every rule body for an exact selector list, in source order. */
function rules(selector: string): string[] {
  const out: string[] = [];
  const needle = `${selector} {`;
  let i = css.indexOf(needle);
  while (i !== -1) {
    const before = css[i - 1];
    if (i === 0 || before === " " || before === "}") {
      out.push(css.slice(i + needle.length, css.indexOf("}", i)).trim());
    }
    i = css.indexOf(needle, i + 1);
  }
  return out;
}

describe("AI index: one continuous backdrop", () => {
  it("lets the slider's ambient run on behind the intro, clipped to its own box", () => {
    const backdrop = rules(".world-slider-backdrop");
    expect(backdrop).toHaveLength(1);
    expect(backdrop[0]).toContain("inset: 0 0 calc(-1 * var(--ai-merge-out)); overflow: hidden;");
    for (const body of rules(".world-slider-section"))
      expect(body).not.toContain("overflow: hidden");
    // No flat navy band: the wash is no longer solid navy at the slider's bottom edge.
    expect(css).toContain("rgb(12 23 41 / 0.42) calc(100% - var(--ai-merge-out))");
    expect(css).toMatch(/--ai-merge-out: 560px;/);
    expect(css).toMatch(/--ai-merge-in: 420px;/);
  });

  it("fades the first hall's scene in above the hall, under the intro", () => {
    expect(css).toContain(".ai-intro { position: relative; z-index: 1; }");
    expect(css).toContain(".ai-hall:first-of-type { overflow: clip visible; }");
    const fade = rules(".ai-hall:first-of-type .ai-hall-bg");
    expect(fade).toHaveLength(1);
    expect(fade[0]).toContain("top: calc(-1 * var(--ai-merge-in));");
    expect(fade[0]).toContain("mask-image: linear-gradient( to bottom, transparent 0,");
    expect(fade[0]).toContain("#000 var(--ai-merge-in),");
  });

  it("veils the intro where the scene is brightest and meets the hall's own scrim at its top", () => {
    const veil = rules(".ai-hall:first-of-type::before");
    expect(veil).toHaveLength(1);
    expect(veil[0]).toContain("top: calc(-1 * var(--ai-merge-in));");
    // Starts transparent (no edge at its top), ends at the hall scrim (no step at the hall's top).
    expect(veil[0]).toContain("rgb(12 23 41 / 0) 0,");
    expect(veil[0]).toContain("rgb(12 23 41 / 0.34) var(--ai-merge-in), rgb(12 23 41 / 0.34) 100%");
    expect(rules(".ai-hall::before")[0]).toContain("background: rgb(12 23 41 / 0.34);");
  });

  it("closes All works with a navy veil anchored to the grid's top, over an opaque full-bleed base", () => {
    expect(css).toContain(".ai-index { overflow-x: clip; }");
    expect(css).toContain(".ai-works { position: relative; z-index: 0; }");
    const veil = rules(".ai-works::before");
    expect(veil.join(" ")).toContain("bottom: 100%; height: var(--ai-merge-in);");
    expect(veil.join(" ")).toContain("#0c1729 100%");
    expect(rules(".ai-works::after").join(" ")).toContain(
      "z-index: -1; top: 0; bottom: 0; background-color: var(--ai-navy-0);",
    );
  });

  it("keeps the blur static: no transition or animation on the merged layers", () => {
    for (const sel of [
      ".world-slider-backdrop",
      ".ai-hall:first-of-type .ai-hall-bg",
      ".ai-hall:first-of-type::before",
      ".ai-works::before",
    ])
      for (const body of rules(sel)) expect(body).not.toMatch(/transition|animation/);
  });
});

describe("footer container = header container", () => {
  it("uses the header row's full width and --home-gutter inset", () => {
    expect(css).toContain(".home-header-row { width: 100%; padding-inline: var(--home-gutter); }");
    const grid = rules(".site-footer-grid");
    expect(grid[0]).toBe(
      "display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 28px 40px; width: 100%; padding-inline: var(--home-gutter);",
    );
    // No later rule narrows it again (the old 1240px column and its 16/40px gutters are gone);
    // only the phone layout's single column remains.
    for (const body of grid.slice(1)) expect(body).toBe("grid-template-columns: minmax(0, 1fr);");
    expect(css).not.toMatch(/\.site-footer-grid \{[^}]*(min\(1240px|padding-inline: (16|40)px)/);
  });
});
