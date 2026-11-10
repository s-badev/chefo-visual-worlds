/** Real Chromium layout guard (jsdom cannot measure layout). No new project dependency.
 * Requires an existing Playwright/Playwright Core installation and a Chromium browser.
 * npm run check:mobile-layout -- --base-url=http://127.0.0.1:4195
 *   --playwright-module=C:/path/to/playwright-core/index.mjs --browser-path=C:/path/to/chrome.exe
 * Optional: --widths=360,375,390,412,430 --report=C:/outside/repo/mobile-layout.json
 * A nonzero exit reports route/state/geometry; this command never starts or stops the app server.
 */
import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const option = (name) =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const base = option("base-url") ?? "http://localhost:8080";
const widths = (option("widths") ?? "320,360,375,390,412,430").split(",").map(Number);
const modulePath = option("playwright-module") ?? process.env.PLAYWRIGHT_MODULE_PATH;
const browserPath = option("browser-path") ?? process.env.CHROME_PATH;
let playwright;
try {
  playwright = modulePath
    ? await import(pathToFileURL(path.resolve(modulePath)).href)
    : await import("playwright");
} catch (error) {
  if (modulePath) throw error;
  try {
    playwright = await import("playwright-core");
  } catch {
    throw new Error(
      "Provide --playwright-module=<existing playwright-core/index.mjs>; no packages are installed by this guard.",
    );
  }
}
const windowsChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const executablePath = browserPath ?? (existsSync(windowsChrome) ? windowsChrome : undefined);
const browser = await playwright.chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const paths = [
  "/",
  "/ai-worlds",
  "/ai-worlds/collections/historical-eras-rulers",
  "/ai-worlds/captain-against-the-storm",
  "/photography",
  "/photography/albums/sofia",
  "/about",
];
const routes = paths.flatMap((route) => [route, route === "/" ? "/en" : `/en${route}`]);
const observations = [];
const loadingObservations = [];
const failures = [];

async function measure(page, route, width, state) {
  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const box = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, width: r.width, height: r.height };
    };
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      innerWidth,
      visualWidth: visualViewport?.width,
      scrollX,
      button: box(".site-menu-button"),
      close: box(".site-menu-close"),
      brand: box("header .brand-lockup img"),
      text: [
        ...document.querySelectorAll(
          "header .brand-lockup-text,.home-hero-title,.home-hero-title em,.home-hero-eyebrow",
        ),
      ].map((e) => ({ className: e.className, left: e.getBoundingClientRect().left })),
    };
  });
  const record = { route, width, state, ...geometry };
  observations.push(record);
  const fail = (message) => failures.push({ ...record, message });
  if (geometry.scrollWidth > geometry.clientWidth) fail("Document scrollWidth exceeds clientWidth");
  if (geometry.scrollX !== 0) fail("Horizontal pan moved the page");
  if (geometry.text.some((t) => t.left < 0) || geometry.brand?.left < 0)
    fail("Header/Hero text or avatar clipped on the left");
  const button = geometry.close ?? geometry.button;
  if (
    !button ||
    button.right > geometry.clientWidth - 8 ||
    button.left < 8 ||
    button.width < 44 ||
    button.height < 44
  )
    fail("Menu target must be 44px and inside both viewport gutters");
  if (
    geometry.close &&
    geometry.button &&
    ["left", "top"].some((key) => Math.abs(geometry.close[key] - geometry.button[key]) > 0.5)
  )
    fail("Open and closed menu controls jump");
  return geometry;
}

async function pan(page, session, width) {
  await page.evaluate(() => scrollTo({ left: 100000, top: scrollY, behavior: "instant" }));
  const right = await page.evaluate(() => scrollX);
  await page.evaluate(() => scrollTo({ left: -100000, top: scrollY, behavior: "instant" }));
  const left = await page.evaluate(() => scrollX);
  await page.evaluate(() => scrollTo({ left: 0, top: scrollY, behavior: "instant" }));
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: width * 0.7, y: 210 }],
  });
  for (let i = 1; i <= 5; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: width * (0.7 - i * 0.08), y: 210 }],
    });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return { right, left, touch: await page.evaluate(() => scrollX) };
}

try {
  for (const width of widths) {
    assert(Number.isInteger(width) && width >= 320, "Invalid CSS viewport width");
    // Explicit viewport + touch; no named-device/deviceScaleFactor overrides.
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__mobileLayoutEarly = [];
      let frames = 0;
      const sample = () => {
        const root = document.documentElement;
        if (root)
          window.__mobileLayoutEarly.push({
            time: performance.now(),
            readyState: document.readyState,
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
          });
        if (++frames < 120) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const session = await context.newCDPSession(page);
    for (const route of routes) {
      const response = await page.goto(new URL(route, base).href, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, `HTTP ${route}`);
      await page.evaluate(() => document.fonts.ready);
      const early = await page.evaluate(() => window.__mobileLayoutEarly ?? []);
      loadingObservations.push({
        route,
        width,
        samples: early.length,
        readyStates: [...new Set(early.map((sample) => sample.readyState))],
        maxExcess: Math.max(0, ...early.map((sample) => sample.scrollWidth - sample.clientWidth)),
      });
      for (const sample of early) {
        if (sample.clientWidth > 0 && sample.scrollWidth > sample.clientWidth)
          failures.push({
            route,
            width,
            state: "loading",
            ...sample,
            message: "Document scrollWidth exceeds clientWidth during load",
          });
      }
      await measure(page, route, width, "initial");
      const result = await pan(page, session, width);
      if (Object.values(result).some((x) => x !== 0))
        failures.push({
          route,
          width,
          state: "pan",
          ...result,
          message: "Horizontal pan moved document",
        });
      await page.locator(".site-menu-button").tap();
      await measure(page, route, width, "menu");
      await page.keyboard.press("Escape");
      await page.waitForSelector(".site-menu", { state: "detached" });
      await measure(page, route, width, "after-menu");
      await page.evaluate(() => scrollTo({ top: 1400, left: 0, behavior: "instant" }));
      await page.waitForTimeout(80);
      await measure(page, route, width, "scrolled");
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const report = {
  base,
  widths,
  browserVersion: browser.version(),
  observations,
  loadingObservations,
  failures,
};
if (option("report")) writeFileSync(option("report"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    { pages: observations.length / 4, states: observations.length, failures },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
