import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const guardPath = pathToFileURL(path.resolve("scripts/ensure-latest.mjs")).href;
const { decideDevAction } = await import(guardPath);

const primary = { primary: true, skip: false, branch: "main", behind: 0 };

describe("primary-checkout dev guard decisions", () => {
  it("blocks an old feature branch even when its commits are locally available", () => {
    expect(decideDevAction({ ...primary, branch: "feature/albums-map-mobile" })).toBe("block");
  });

  it("requires a fast-forward when main is behind origin/main", () => {
    expect(decideDevAction({ ...primary, behind: 3 })).toBe("pull");
  });

  it("serves an up-to-date main", () => {
    expect(decideDevAction(primary)).toBe("serve");
  });

  it("blocks detached HEAD rather than guessing a branch", () => {
    expect(decideDevAction({ ...primary, branch: "" })).toBe("block");
  });

  it("silently skips linked agent/live worktrees on any branch", () => {
    expect(decideDevAction({ ...primary, primary: false, branch: "feature/test", behind: 3 })).toBe(
      "skip",
    );
  });

  it("lets CI or the explicit skip flag bypass the guard", () => {
    expect(decideDevAction({ ...primary, skip: true, branch: "feature/test" })).toBe("skip");
  });
});
