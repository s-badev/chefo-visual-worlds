import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Decide without Git, network access, output or other side effects. */
export function decideDevAction({ skip, primary, branch, behind }) {
  if (skip || !primary) return "skip";
  if (branch !== "main") return "block";
  return behind > 0 ? "pull" : "serve";
}

function banner(branch, reason = "") {
  const current = branch || "detached HEAD";
  console.error(
    `\x1b[31m\nCHEFO DEV GUARD\n` +
      `Вие сте на клон ${current}. Сайтът НЕ е потвърден като актуалния main.\n` +
      `Използвайте „Chefo — отвори сайта“ или преминете на main.\n` +
      `You are on branch ${current}; the site is NOT verified as the latest main.\n` +
      `Run the "Chefo — отвори сайта" shortcut or switch to main.\n` +
      `${reason}\x1b[0m`,
  );
}

export function ensureLatest() {
  if (process.env.CI || process.env.CHEFO_SKIP_GUARD === "1") return 0;
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  let branch = "";
  try {
    const [gitDir, commonDir] = git(
      "rev-parse",
      "--path-format=absolute",
      "--git-dir",
      "--git-common-dir",
    ).split(/\r?\n/);
    const primary = path.resolve(gitDir).toLowerCase() === path.resolve(commonDir).toLowerCase();
    if (decideDevAction({ primary, skip: false, branch, behind: 0 }) === "skip") return 0;
    try {
      git("fetch", "origin");
    } catch {
      console.warn(
        "CHEFO: fetch unavailable (offline/timeout); using local refs. / Няма връзка; проверявам локалните refs.",
      );
    }
    branch = git("branch", "--show-current");
    if (decideDevAction({ primary, skip: false, branch, behind: 0 }) === "block") {
      banner(branch);
      return 1;
    }
    const behind = Number(git("rev-list", "--count", "HEAD..origin/main"));
    if (decideDevAction({ primary, skip: false, branch, behind }) === "pull") {
      try {
        git("pull", "--ff-only");
      } catch {
        banner(branch, "Fast-forward failed; no reset or rebase was attempted.");
        return 1;
      }
    }
    console.log(`CHEFO: serving main @ ${git("rev-parse", "--short=12", "HEAD")}`);
    return 0;
  } catch {
    banner(branch, "Git state could not be verified. / Git състоянието не може да се провери.");
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = ensureLatest();
}
