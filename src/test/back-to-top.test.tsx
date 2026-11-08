import { readFileSync } from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackToTop } from "@/components/back-to-top";
import { messages } from "@/i18n/messages";
import { BACK_TO_TOP, endFinish } from "@/lib/back-to-top";

const state = vi.hoisted(() => ({ locale: "en" as "bg" | "en" }));
vi.mock("@/i18n", () => ({ useT: () => ({ t: messages[state.locale] }) }));

afterEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: 0,
  });
  state.locale = "en";
  vi.restoreAllMocks();
});

describe("BackToTop", () => {
  it("derives the calm end segment from the shared constants", () => {
    expect(BACK_TO_TOP).toMatchObject({ endFrom: 0.965, endSpan: 0.03 });
    expect(endFinish(0.9)).toBe(0);
    expect(endFinish(0.98)).toBeCloseTo(0.5, 8);
    expect(endFinish(1)).toBe(1);
    expect(endFinish(1.2)).toBe(1);
  });

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

  it.each(["bg", "en"] as const)(
    "switches to the localized %s end label and pulses once per arrival",
    async (locale) => {
      state.locale = locale;
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
      Object.defineProperty(document.documentElement, "scrollHeight", {
        configurable: true,
        value: 2000,
      });
      Object.defineProperty(window, "scrollY", { configurable: true, value: 1000 });
      const add = vi.spyOn(DOMTokenList.prototype, "add");
      render(<BackToTop />);

      const endLabel = messages[locale].common.backToTopEnd;
      const button = await screen.findByRole("button", { name: endLabel });
      expect(button).toHaveAttribute("title", endLabel);
      expect(button).toHaveAttribute("data-end");
      expect(button.style.getPropertyValue("--f")).toBe("1.000");
      expect(button).toHaveClass("back-to-top-pulse");

      fireEvent.scroll(window);
      fireEvent.scroll(window);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(add.mock.calls.filter(([name]) => name === "back-to-top-pulse")).toHaveLength(1);

      fireEvent.animationEnd(button, { animationName: "back-to-top-end-pulse" });
      expect(button).not.toHaveClass("back-to-top-pulse");
      Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
      fireEvent.scroll(window);
      await waitFor(() => expect(button).not.toHaveAttribute("data-end"));
      expect(button).toHaveAccessibleName(messages[locale].common.backToTop);

      Object.defineProperty(window, "scrollY", { configurable: true, value: 1000 });
      fireEvent.scroll(window);
      await waitFor(() => expect(button).toHaveAttribute("data-end"));
      expect(add.mock.calls.filter(([name]) => name === "back-to-top-pulse")).toHaveLength(2);
    },
  );

  it("keeps the end colours but skips the pulse under reduced motion", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1000 });
    render(<BackToTop />);

    const button = await screen.findByRole("button", { name: messages.en.common.backToTopEnd });
    expect(button).toHaveAttribute("data-end");
    expect(button).not.toHaveClass("back-to-top-pulse");
  });

  it("shares the site hover tokens instead of a translucent icon tint", () => {
    const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");
    expect(css).toContain("--btn-hover-bg: #c9a46b;");
    expect(css).toContain("--btn-hover-fg: var(--interaction-ink-on-gold);");
    expect(css).toContain(
      ".interaction-icon:hover { border-color: var(--btn-hover-border); background-color: var(--btn-hover-bg); background-image: none; color: var(--btn-hover-fg); }",
    );
    expect(css).toContain(".back-to-top[data-end] .back-to-top-progress");
    expect(css).toContain("@keyframes back-to-top-end-pulse");
    expect(css).toContain(".back-to-top-pulse { animation: none;");
  });
});
