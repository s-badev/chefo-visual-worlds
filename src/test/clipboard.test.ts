import { describe, expect, it } from "vitest";
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
