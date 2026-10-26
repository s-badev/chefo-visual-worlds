import fs from "node:fs/promises";
import path from "node:path";

const baselineCommit = "42a73449db2d59f5d876d62c202e9464c1b7260f";
const forbidden = ["Денем", "По здрач", "Нощем", "Витрини", "Водата", "Отгоре", "Отблизо"];
const publishedTitle = "Залез над Босфора";
const targets = new Set([...forbidden, publishedTitle]);
const sourceOnly = process.argv.includes("--source-only");
const root = path.resolve(
  process.argv.find((arg) => arg.startsWith("--root="))?.slice(7) ?? process.cwd(),
);
const reportPath = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const groups = [
  { name: "source", dir: "src", extensions: [".ts", ".tsx", ".js", ".jsx"] },
  { name: "client", dir: ".output/public", extensions: [".js", ".mjs", ".json"] },
  { name: "server", dir: ".output/server", extensions: [".js", ".mjs", ".json"] },
].filter((group) => !sourceOnly || group.name === "source");
const literal = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`/gs;
const jsxText = />\s*([^<>]+?)\s*</g;
const decode = (raw) =>
  raw.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (_, a, b, c) =>
    String.fromCodePoint(Number.parseInt(a || b || c, 16)),
  );

async function walk(directory, extensions) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file, extensions)));
    else if (extensions.some((extension) => entry.name.endsWith(extension))) files.push(file);
  }
  return files;
}

const matches = Object.fromEntries([...targets].map((value) => [value, []]));
const scannedFiles = {};
for (const group of groups) {
  const files = await walk(path.join(root, group.dir), group.extensions);
  if (files.length === 0) throw new Error(`Required ${group.name} files missing in ${group.dir}`);
  scannedFiles[group.name] = files.length;
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    literal.lastIndex = 0;
    for (const found of content.matchAll(literal)) {
      const value = decode(found[1] ?? found[2] ?? found[3]);
      if (!targets.has(value)) continue;
      matches[value].push({
        group: group.name,
        file: path.relative(root, file).replaceAll("\\", "/"),
        line: content.slice(0, found.index).split("\n").length,
        context: content
          .slice(Math.max(0, found.index - 50), found.index + found[0].length + 50)
          .replaceAll("\n", " "),
      });
    }
    if (group.name === "source" && file.endsWith(".tsx")) {
      for (const found of content.matchAll(jsxText)) {
        const value = found[1].trim();
        if (!forbidden.includes(value)) continue;
        matches[value].push({
          group: group.name,
          file: path.relative(root, file).replaceAll("\\", "/"),
          line: content.slice(0, found.index).split("\n").length,
          context: found[0],
        });
      }
    }
  }
}

const forbiddenNew = forbidden.flatMap((value) =>
  matches[value].map((match) => ({ value, ...match })),
);
const titleSource = matches[publishedTitle].filter((match) => match.group === "source");
const publishedTitlePreserved =
  titleSource.length === 1 && titleSource[0].file === "src/content/four-new-album-photos.ts";
const pass = forbiddenNew.length === 0 && publishedTitlePreserved;
const report = {
  status: pass ? "PASS" : "FAIL",
  baselineCommit,
  baseline: Object.fromEntries(
    forbidden.map((value) => [value, { source: 0, client: 0, server: 0 }]),
  ),
  method: `Case-sensitive complete JS string-literal and plain JSX text-node matching; decodes Unicode and hex escapes; scans ${sourceOnly ? "source" : "source, built client and built server"}.`,
  scannedFiles,
  matches,
  forbiddenNew,
  publishedTitlePreserved,
};
if (reportPath) await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      status: report.status,
      scannedFiles,
      counts: Object.fromEntries([...targets].map((value) => [value, matches[value].length])),
      publishedTitlePreserved,
    },
    null,
    2,
  ),
);
if (!pass) process.exitCode = 1;
