import { describe, expect, it } from "vitest";
import {
  getInitialHeaderTheme,
  isHeaderScrolled,
  resolveHeaderTheme,
} from "@/components/header-theme";

describe("resolveHeaderTheme", () => {
  const setup = () => {
    document.body.innerHTML = `
      <header id="h"><a id="nav">nav</a></header>
      <section data-header-theme="light" id="cream"><div><p id="card">card</p></div></section>
      <section data-header-theme="dark" id="navy"><p id="art">art</p></section>
      <div id="plain"></div>`;
    const $ = (id: string) => document.getElementById(id)!;
    return { $, header: $("h") };
  };

  it("takes the tone of the nearest marked surface under the header", () => {
    const { $, header } = setup();
    expect(resolveHeaderTheme([$("card"), $("cream")], header)).toBe("light");
    expect(resolveHeaderTheme([$("art"), $("navy")], header)).toBe("dark");
  });

  it("skips the header's own elements", () => {
    const { $, header } = setup();
    expect(resolveHeaderTheme([$("nav"), header, $("art")], header)).toBe("dark");
  });

  it("falls back to the cream tone over unmarked content", () => {
    const { $, header } = setup();
    expect(resolveHeaderTheme([$("plain"), document.body], header)).toBe("light");
    expect(resolveHeaderTheme([], header)).toBe("light");
  });
});

describe("isHeaderScrolled", () => {
  it("turns translucent only past 24px", () => {
    expect(isHeaderScrolled(0)).toBe(false);
    expect(isHeaderScrolled(24)).toBe(false);
    expect(isHeaderScrolled(25)).toBe(true);
  });
});

describe("getInitialHeaderTheme", () => {
  const cases = [
    ["/", "dark"],
    ["/photography", "light"],
    ["/photography/albums/paris", "light"],
    ["/photography/plovdiv-staria-grad", "light"],
    ["/photography/edirne", "light"],
    ["/ai-worlds", "dark"],
    ["/ai-worlds/collections/professions-roles", "dark"],
    ["/ai-worlds/chefo-srednovekoven-ritsar", "dark"],
    ["/ai-worlds/chefo-v-sauditska-arabiya", "dark"],
    ["/about", "light"],
    ["/photography/albums/not-a-real-album", "light"],
    ["/photography/not-a-real-photo", "light"],
    ["/ai-worlds/collections/not-a-real-collection", "dark"],
    ["/ai-worlds/not-a-real-artwork", "light"],
    ["/missing", "light"],
  ] as const;

  it.each(cases)("uses %s → %s", (path, theme) => {
    expect(getInitialHeaderTheme(path)).toBe(theme);
    expect(getInitialHeaderTheme(`/en${path === "/" ? "" : path}`)).toBe(theme);
  });
});
