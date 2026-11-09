import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortraitSwitch } from "@/components/portrait";
import { siteConfig } from "@/content/site-config";
import { messages } from "@/i18n/messages";

let locale: "bg" | "en" = "bg";

vi.mock("@/i18n", async (original) => ({
  ...(await original<typeof import("@/i18n")>()),
  useT: () => ({ locale, t: messages[locale] }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  locale = "bg";
});

describe("stage 9h file-aligned About portrait", () => {
  it("uses the new WebP and neutral values without a portrait transform", () => {
    expect(siteConfig.portrait.ai).toContain("about-ai.webp");
    expect(siteConfig.portrait.real).toContain("about-real-close.webp");
    const css = readFileSync("src/styles.css", "utf8");
    const neutral = css.split("/* Stage 9h")[1]!;
    expect(neutral).toContain("--about-ai-scale: 1;");
    expect(neutral).toContain("--about-ai-x: 0%;");
    expect(neutral).toContain("--about-ai-y: 0%;");
    expect(css).not.toMatch(/transform:\s*translate\(var\(--about-ai-x\)/);
    expect(readFileSync("src/assets/about-ai.webp").toString("ascii", 8, 12)).toBe("WEBP");
  });

  it.each(["bg", "en"] as const)("keeps both toggle states and neutral alt text in %s", (lang) => {
    locale = lang;
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<PortraitSwitch />);
    const real = container.querySelector("[data-portrait-frame] > img")!;
    const layer = container.querySelector(".portrait-iris")!;
    const ai = layer.querySelector("img")!;
    const realButton = screen.getByRole("button", { name: messages[lang].portrait.real });
    const aiButton = screen.getByRole("button", { name: messages[lang].portrait.ai });
    expect(real).toHaveAttribute("src", siteConfig.portrait.real);
    expect(ai).toHaveAttribute("src", siteConfig.portrait.ai);
    expect(real).toHaveAttribute("alt", messages[lang].portrait.realAlt);
    expect(ai).toHaveAttribute("alt", messages[lang].portrait.aiAlt);
    expect(ai.getAttribute("alt")).not.toMatch(/king|crown|цар|корон/i);
    expect(realButton).toHaveAttribute("aria-pressed", "true");
    expect(layer).toHaveAttribute("aria-hidden", "true");
    fireEvent.click(aiButton);
    expect(aiButton).toHaveAttribute("aria-pressed", "true");
    expect(real).toHaveAttribute("aria-hidden", "true");
    expect(layer).not.toHaveAttribute("aria-hidden");
    expect(container.querySelector(".portrait-iris-ring")).toBeNull();
    fireEvent.click(realButton);
    expect(realButton).toHaveAttribute("aria-pressed", "true");
    expect(real).not.toHaveAttribute("aria-hidden");
    expect(layer).toHaveAttribute("aria-hidden", "true");
  });
});
