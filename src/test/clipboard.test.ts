import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "@/lib/clipboard";

describe("copyText", () => {
  it("returns ok and writes the full prompt", async () => {
    let written = "";
    const r = await copyText("full prompt", { writeText: async (t) => { written = t; } });
    expect(r).toBe("ok");
    expect(written).toBe("full prompt");
  });
  it("returns error when the clipboard rejects", async () => {
    const r = await copyText("x", { writeText: async () => { throw new Error("denied"); } });
    expect(r).toBe("error");
  });
  it("returns empty when there is no prompt", async () => {
    expect(await copyText("", { writeText: async () => {} })).toBe("empty");
  });
});

describe("copyText without the Clipboard API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("copies the full text with a temporary selection and restores focus and the prior selection", async () => {
    vi.stubGlobal("navigator", {});
    const button = document.createElement("button");
    const paragraph = document.createElement("p");
    paragraph.textContent = "keep this selection";
    document.body.append(button, paragraph);
    button.focus();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    document.getSelection()!.addRange(range);
    const original = Object.getOwnPropertyDescriptor(document, "execCommand");
    const full = "A full prompt\nwith all of its lines and characters.";
    const execCommand = vi.fn(() => {
      expect(document.querySelector("textarea")?.value).toBe(full);
      return true;
    });
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    try {
      expect(await copyText(full)).toBe("ok");
      expect(execCommand).toHaveBeenCalledExactlyOnceWith("copy");
      expect(document.querySelector("textarea")).toBeNull();
      expect(document.activeElement).toBe(button);
      expect(document.getSelection()!.toString()).toBe("keep this selection");
    } finally {
      if (original) Object.defineProperty(document, "execCommand", original);
      else Reflect.deleteProperty(document, "execCommand");
    }
  });

  it.each(["unsupported", "denied", "throws"])(
    "handles unavailable fallback (%s)",
    async (mode) => {
      vi.stubGlobal("navigator", {});
      const original = Object.getOwnPropertyDescriptor(document, "execCommand");
      const execute = () => {
        if (mode === "throws") throw new Error("denied");
        return false;
      };
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: mode === "unsupported" ? undefined : execute,
      });
      try {
        expect(await copyText("full prompt")).toBe("error");
        expect(document.querySelector("textarea")).toBeNull();
      } finally {
        if (original) Object.defineProperty(document, "execCommand", original);
        else Reflect.deleteProperty(document, "execCommand");
      }
    },
  );

  it("is safe without browser globals during SSR", async () => {
    vi.stubGlobal("navigator", undefined);
    vi.stubGlobal("document", undefined);
    expect(await copyText("full prompt")).toBe("error");
    vi.unstubAllGlobals();
  });
});
