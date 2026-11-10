import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const script = path.resolve("scripts/verify-editorial-strings.mjs");
// Assemble fixture copy at runtime so this source file does not duplicate guarded literals.
const publishedTitle = ["Залез", "над", "Босфора"].join(" ");
const forbiddenTitle = ["Де", "нем"].join("");
const fixtures: string[] = [];
const outputs = {
  nitro: { client: ".output/public", server: ".output/server", root: ".output" },
  vercel: {
    client: ".vercel/output/static",
    server: ".vercel/output/functions",
    root: ".vercel/output",
  },
  distClient: { client: "dist/client", server: "dist/server", root: "dist" },
  dist: { client: "dist", server: "dist/server", root: "dist" },
} as const;
type Target = keyof typeof outputs;

async function fixture(targets: Target[] = []) {
  const root = await mkdtemp(path.join(os.tmpdir(), "chefo-editorial-"));
  fixtures.push(root);
  await mkdir(path.join(root, "src/content"), { recursive: true });
  await writeFile(
    path.join(root, "src/content/four-new-album-photos.ts"),
    `export const title = ${JSON.stringify(publishedTitle)};`,
  );
  for (const target of targets) {
    const output = outputs[target];
    for (const group of ["client", "server"] as const) {
      await mkdir(path.join(root, output[group]), { recursive: true });
      await writeFile(path.join(root, output[group], "index.js"), "export const ok = true;");
    }
  }
  return root;
}

function run(root: string, vercel = false, sourceOnly = false) {
  const env = { ...process.env };
  delete env.VERCEL;
  if (vercel) env.VERCEL = "1";
  return spawnSync(
    process.execPath,
    [script, `--root=${root}`, ...(sourceOnly ? ["--source-only"] : [])],
    { encoding: "utf8", env },
  );
}

function expectOutput(result: ReturnType<typeof run>, target: Target) {
  expect(result.status, result.stderr).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.status).toBe("PASS");
  expect(report.scannedDirectories).toEqual({
    source: "src",
    client: outputs[target].client,
    server: outputs[target].server,
  });
  expect(report.scannedFiles.client).toBeGreaterThan(0);
  expect(report.scannedFiles.server).toBeGreaterThan(0);
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((root) => rm(root, { recursive: true })));
});

describe("editorial guard build-directory resolution", () => {
  it.each(["nitro", "vercel", "distClient", "dist"] as const)(
    "resolves a checkout containing only the %s output",
    async (target) => {
      expectOutput(run(await fixture([target])), target);
    },
  );

  it.each([false, true])("prefers the current target when VERCEL=%s", async (vercel) => {
    expectOutput(run(await fixture(["nitro", "vercel"]), vercel), vercel ? "vercel" : "nitro");
  });

  it("fails clearly when no static output exists", async () => {
    const result = run(await fixture());
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Built static directory not found. Checked:");
    for (const { client } of Object.values(outputs)) expect(result.stderr).toContain(client);
  });

  it("ignores a file where the preferred output directory should be", async () => {
    const root = await fixture(["nitro"]);
    await mkdir(path.join(root, ".vercel/output"), { recursive: true });
    await writeFile(path.join(root, outputs.vercel.client), "not a directory");
    expectOutput(run(root, true), "nitro");
  });

  it("keeps the source-only pretest independent of build output", async () => {
    const result = run(await fixture(), true, true);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).scannedDirectories).toEqual({ source: "src" });
  });
});

describe.each(["nitro", "vercel"] as const)("%s output preserves editorial failures", (target) => {
  it.each(["client", "server"] as const)("rejects forbidden strings in %s", async (group) => {
    const root = await fixture([target]);
    await writeFile(
      path.join(root, outputs[target][group], "index.js"),
      `export const title = ${JSON.stringify(forbiddenTitle)};`,
    );
    const result = run(root, target === "vercel");
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).counts[forbiddenTitle]).toBe(1);
  });

  it("rejects a missing published source title", async () => {
    const root = await fixture([target]);
    await writeFile(
      path.join(root, "src/content/four-new-album-photos.ts"),
      "export const title = ''; ",
    );
    const result = run(root, target === "vercel");
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).publishedTitlePreserved).toBe(false);
  });

  it("rejects a missing server output instead of silently skipping it", async () => {
    const root = await fixture([target]);
    await rm(path.join(root, outputs[target].server), { recursive: true });
    expect(run(root, target === "vercel").status).not.toBe(0);
  });

  it("rejects an empty client output", async () => {
    const root = await fixture([target]);
    await rm(path.join(root, outputs[target].client, "index.js"));
    const result = run(root, target === "vercel");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Required client files missing");
  });

  it("rejects cover masters anywhere inside the selected artifact root", async () => {
    const root = await fixture([target]);
    const master = path.join(outputs[target].root, "photography-journey-cover-master.png");
    await writeFile(path.join(root, master), "fixture");
    const result = run(root, target === "vercel");
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).coverMastersInOutput).toEqual([master.replaceAll("\\", "/")]);
  });
});
