import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");
const stylesPath = join(sourceRoot, "styles.css");

const interactionSelector =
  /:(?:hover|focus|focus-visible|active)\b|\[(?:aria-(?:pressed|selected|current)|data-state)(?:[=~|^$*]|\])/;
const forbiddenColour = /terracotta|primary-hover/i;
const tailwindInteraction =
  /(?:^|\s|["'`])((?:(?:sm|md|lg|xl|2xl|dark|motion-safe|motion-reduce|group-hover|group-focus|peer-hover|peer-focus|hover|focus|focus-visible|active|aria-pressed|aria-selected|aria-current|data-\[[^\]]+\]):)+[^\s"'`{}]*?(?:terracotta|primary-hover)[^\s"'`{}]*)/gi;

type CssRule = {
  selector: string;
  body: string;
};

function findClosingBrace(source: string, openingBrace: number) {
  let depth = 1;

  for (let index = openingBrace + 1; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return index;
  }

  throw new Error(`Unclosed CSS block at character ${openingBrace}`);
}

function collectCssRules(source: string): CssRule[] {
  const rules: CssRule[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const openingBrace = source.indexOf("{", cursor);
    if (openingBrace === -1) break;

    const selector = source.slice(cursor, openingBrace).trim();
    const closingBrace = findClosingBrace(source, openingBrace);
    const body = source.slice(openingBrace + 1, closingBrace);

    if (
      selector.startsWith("@media") ||
      selector.startsWith("@container") ||
      selector.startsWith("@supports") ||
      selector.startsWith("@layer")
    ) {
      rules.push(...collectCssRules(body));
    } else if (!selector.startsWith("@")) {
      rules.push({ selector, body });
    }

    cursor = closingBrace + 1;
  }

  return rules;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) return sourceFiles(path);
    if (/\.(?:ts|tsx)$/.test(entry)) return [path];
    return [];
  });
}

describe("interaction colour language", () => {
  it("does not use terracotta or the retired primary-hover token in CSS interaction states", () => {
    const css = readFileSync(stylesPath, "utf8");
    const offenders = collectCssRules(css)
      .filter(
        ({ selector, body }) => interactionSelector.test(selector) && forbiddenColour.test(body),
      )
      .map(({ selector }) => selector);

    expect(offenders).toEqual([]);
  });

  it("does not use terracotta or the retired primary-hover token in interactive Tailwind variants", () => {
    const offenders = sourceFiles(sourceRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return [...source.matchAll(tailwindInteraction)].map(
        (match) => `${relative(process.cwd(), path)}: ${match[1]}`,
      );
    });

    expect(offenders).toEqual([]);
  });
});
