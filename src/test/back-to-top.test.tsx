import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackToTop } from "@/components/back-to-top";
import { messages } from "@/i18n/messages";

const state = vi.hoisted(() => ({ locale: "en" as "bg" | "en" }));
vi.mock("@/i18n", () => ({ useT: () => ({ t: messages[state.locale] }) }));

afterEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  state.locale = "en";
  vi.restoreAllMocks();
});

describe("BackToTop", () => {
  it("appears after scrolling and returns to the top", async () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<BackToTop />);
    // Rendered from the start (same markup as the server), but hidden and out of reach.
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();
    const hidden = document.querySelector<HTMLButtonElement>(".back-to-top")!;
    expect(hidden).toHaveAttribute("aria-hidden", "true");
    expect(hidden).toHaveAttribute("tabindex", "-1");
    expect(hidden).not.toHaveAttribute("data-visible");

    Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
    fireEvent.scroll(window);
    fireEvent.click(await screen.findByRole("button", { name: "Back to top" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it.each(["bg", "en"] as const)(
    "uses the localized accessible name and tooltip in %s",
    async (locale) => {
      state.locale = locale;
      Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
      render(<BackToTop />);
      const label = messages[locale].common.backToTop;
      const button = await screen.findByRole("button", { name: label });
      expect(button).toHaveAttribute("title", label);
      expect(button).toHaveClass("interaction-icon", "back-to-top");
    },
  );

  it("shares the site hover tokens instead of a translucent icon tint", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");
    expect(css).toContain("--btn-hover-bg: #c9a46b;");
    expect(css).toContain("--btn-hover-fg: var(--interaction-ink-on-gold);");
    expect(css).toContain(
      ".interaction-icon:hover { border-color: var(--btn-hover-border); background-color: var(--btn-hover-bg); background-image: none; color: var(--btn-hover-fg); }",
    );
  });
});
