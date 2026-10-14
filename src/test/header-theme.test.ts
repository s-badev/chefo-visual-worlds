import { describe, expect, it } from "vitest";
import { getInitialHeaderTheme } from "@/components/header-theme";

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
