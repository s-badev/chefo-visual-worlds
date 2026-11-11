/** Existing Playwright only. Run npm run check:section-navigation -- --base-url=http://localhost:8080
 * --playwright-module=C:/w/audit-shots/node_modules/playwright-core/index.mjs
 * --report-dir=C:/outside/repo/evidence
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const option = (name) =>
  process.argv.find((arg) => arg.startsWith("--" + name + "="))?.slice(name.length + 3);
const { chromium } = await import(
  option("playwright-module") ? pathToFileURL(option("playwright-module")).href : "playwright"
);
const base = option("base-url") ?? "http://localhost:8080";
const out = option("report-dir");
if (out) mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: option("browser-path") ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const records = [];
const routes = [
  "/photography",
  "/photography/albums/sofia",
  "/ai-worlds",
  "/ai-worlds/collections/historical-eras-rulers",
  "/ai-worlds/captain-against-the-storm",
];
try {
  for (const width of option("width") ? [Number(option("width"))] : [412, 1440])
    for (const language of option("language") ? [option("language")] : ["bg", "en"])
      for (const reducedMotion of option("motion")
        ? [option("motion")]
        : ["reduce", "no-preference"]) {
        const context = await browser.newContext({
          viewport: { width, height: width === 412 ? 915 : 900 },
          isMobile: width === 412,
          hasTouch: width === 412,
          reducedMotion,
        });
        const page = await context.newPage();
        const prefix = language === "en" ? "/en" : "";
        for (const route of routes) {
          const source = prefix + route;
          await page.goto(base + source, { waitUntil: "networkidle" });
          const slow = route === "/photography/albums/sofia";
          const session = await context.newCDPSession(page);
          if (slow) {
            await session.send("Network.emulateNetworkConditions", {
              offline: false,
              latency: 180,
              downloadThroughput: 180000,
              uploadThroughput: 90000,
            });
            await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          }
          if (width === 412) await page.locator(".site-menu-button").click();
          await page
            .locator((width === 412 ? ".site-menu-link" : ".site-nav-link") + '[href$="#about"]')
            .click();
          await page.waitForURL(/#about$/);
          await page.waitForTimeout(3500);
          await page
            .waitForFunction(
              () => {
                const target = document.getElementById("about");
                if (!target) return false;
                const r = target.getBoundingClientRect();
                const header = document.querySelector("header").getBoundingClientRect();
                const aligned =
                  r.top <= header.bottom + 48 ||
                  scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
                return (
                  aligned &&
                  r.top >= header.bottom - 1 &&
                  r.bottom <= innerHeight &&
                  document.activeElement === target &&
                  !document.querySelector(".site-menu") &&
                  !document.body.hasAttribute("data-scroll-locked")
                );
              },
              null,
              { timeout: 12000 },
            )
            .catch(async (error) => {
              console.error(
                JSON.stringify({
                  route,
                  width,
                  language,
                  reducedMotion,
                  snapshot: await page.evaluate(() => ({
                    url: location.href,
                    top: document.getElementById("about")?.getBoundingClientRect().top,
                    focus: document.activeElement?.id,
                    y: scrollY,
                    height: document.documentElement.scrollHeight,
                    menu: Boolean(document.querySelector(".site-menu")),
                    locked: document.body.getAttribute("data-scroll-locked"),
                  })),
                }),
              );
              throw error;
            });
          const geometry = await page.evaluate(() => ({
            top: document.getElementById("about").getBoundingClientRect().top,
            header: document.querySelector("header").getBoundingClientRect().bottom,
            scrollX,
            scrollY,
            focused: document.activeElement?.id,
          }));
          assert.equal(new URL(page.url()).pathname.replace(/\/$/, "") || "/", prefix || "/");
          records.push({ route, width, language, reducedMotion, slow, ...geometry });
          if (out)
            await page.screenshot({
              path:
                out +
                "/" +
                language +
                "-" +
                width +
                "-" +
                reducedMotion +
                route.replaceAll("/", "-") +
                ".png",
              animations: "disabled",
            });
          await session.send("Network.emulateNetworkConditions", {
            offline: false,
            latency: 0,
            downloadThroughput: -1,
            uploadThroughput: -1,
          });
          await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
          await page.goBack({ waitUntil: "networkidle" });
          assert.equal(new URL(page.url()).pathname, source);
        }
        // Direct first loads and repeat clicks already at Home.
        await page.goto(base + (prefix || "/") + "#about", { waitUntil: "networkidle" });
        await page.waitForFunction(() => document.activeElement?.id === "about");
        const length = await page.evaluate(() => history.length);
        if (width === 412) await page.locator(".site-menu-button").click();
        await page
          .locator((width === 412 ? ".site-menu-link" : ".site-nav-link") + '[href$="#about"]')
          .click();
        await page.waitForTimeout(900);
        assert.equal(await page.evaluate(() => history.length), length);
        await context.close();
      }
} finally {
  await browser.close();
  if (out) writeFileSync(out + "/results.json", JSON.stringify(records, null, 2));
}
console.log(JSON.stringify({ flows: records.length, passed: true }));
