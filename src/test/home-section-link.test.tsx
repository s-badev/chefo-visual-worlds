import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { LocaleLink } from "@/i18n/link";

let locale = "bg";
vi.mock("@/i18n", async (original) => ({
  ...(await original<typeof import("@/i18n")>()),
  useLocale: () => locale,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, hash, children }: { to: string; hash?: string; children: ReactNode }) => (
    <a href={to + (hash ? "#" + hash : "")}>{children}</a>
  ),
}));
afterEach(cleanup);
describe("shared Home section links", () => {
  it.each([
    ["bg", "/"],
    ["bg", "/photography/albums/sofia"],
    ["en", "/en"],
    ["en", "/en/ai-worlds/captain-against-the-storm"],
  ])("targets the localized Home About anchor in %s from %s", (language, origin) => {
    window.history.replaceState({}, "", origin);
    locale = language;
    render(<LocaleLink to="/about">About</LocaleLink>);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      language === "en" ? "/en#about" : "/#about",
    );
  });
  it.each(["bg", "en"])("keeps page and existing artwork hashes in %s", (language) => {
    locale = language;
    render(
      <LocaleLink to="/ai-worlds" hash="artwork">
        AI
      </LocaleLink>,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      (language === "en" ? "/en" : "") + "/ai-worlds#artwork",
    );
  });
});
