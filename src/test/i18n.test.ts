import { describe, expect, it } from "vitest";
import { localeFromPath, switchLocaleHref, toBgPath } from "@/i18n";
import { aiWorks, localizeAiWork } from "@/content/ai-works";
import { photos, localizePhoto } from "@/content/photos";

describe("i18n", () => {
  it("Bulgarian is default, English lives under /en", () => {
    expect(localeFromPath("/photography")).toBe("bg");
    expect(localeFromPath("/en/photography")).toBe("en");
    expect(localeFromPath("/english")).toBe("bg");
  });
  it("switching keeps page, item and filters", () => {
    expect(switchLocaleHref("/ai-worlds/renesansov-portret", "?tool=Grok", "en")).toBe("/en/ai-worlds/renesansov-portret?tool=Grok");
    expect(switchLocaleHref("/en/photography", "?category=Море", "bg")).toBe("/photography?category=Море");
    expect(switchLocaleHref("/", "", "en")).toBe("/en");
    expect(toBgPath("/en")).toBe("/");
  });
  it("English keeps the original prompt", () => {
    const w = aiWorks[0]!;
    expect(localizeAiWork(w, "en").prompt).toBe(w.prompt);
    expect(localizeAiWork(w, "en").title).not.toBe(w.title);
  });
  it("missing English falls back to Bulgarian", () => {
    const p = { ...photos[0]!, en: undefined };
    expect(localizePhoto(p, "en").title).toBe(photos[0]!.title);
  });
});
