/**
 * Visual E2E for mobile 390×844 and PC 1440×900.
 * Fails if lesson bands overlap, chips overflow, or layout mode is wrong.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    const require = createRequire("/tmp/node_modules/playwright/package.json");
    return require("playwright").chromium;
  }
}

const OUT = process.env.E2E_OUT || "/tmp/nanogpt-e2e";
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_URL || "http://127.0.0.1:4182/";

const JUMPS = [
  ["Level1", 0, 0, "l1-first"],
  ["Level1", 4, 2, "l1-last"],
  ["Level2", 0, 2, "l2-first"],
  ["Level2", 2, 2, "l2-shift"],
  ["Level2", 5, 0, "l2-desk"],
  ["Level2", 7, 4, "l2-last"],
];

const chromium = await loadChromium();
const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader"],
});

async function ready(page) {
  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => typeof window.__nanoGPTJump === "function", { timeout: 45000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(800);
}

async function runViewport(label, pageOpts) {
  const page = await browser.newPage(pageOpts);
  await ready(page);
  const reports = [];
  for (const [key, beat, phase, name] of JUMPS) {
    await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
    await page.waitForTimeout(1400);
    await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 10000 });
    const result = await page.evaluate(() => window.__nanoGPTAssertLayout());
    await page.screenshot({ path: `${OUT}/${label}-${name}.png` });
    reports.push({ name, ...result });
    if (result.overlaps?.length || result.overflows?.length || !result.ok) {
      console.error(`FAIL ${label} ${name}`, result);
    } else {
      console.log(`ok ${label} ${name}`);
    }
  }

  await page.click("#book-toggle");
  await page.waitForTimeout(300);
  const bookOpen = await page.evaluate(() => ({
    open: window.__nanoGPTBookOpen?.(),
    titles: document.querySelectorAll("#tutor-book .tutor-block").length,
  }));
  await page.screenshot({ path: `${OUT}/${label}-book.png` });
  await page.click("#lesson-book-close");
  await page.waitForTimeout(200);
  await page.click("#notes-toggle");
  await page.waitForTimeout(300);
  const notesOpen = await page.evaluate(() => !document.getElementById("notes-overlay")?.hidden);
  await page.screenshot({ path: `${OUT}/${label}-glossary.png` });
  await page.click("#notes-close");
  await page.close();
  return { reports, bookOpen, notesOpen };
}

const mobile = await runViewport("mobile", {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  isMobile: true,
  hasTouch: true,
});

const pc = await runViewport("pc", {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

await browser.close();

const summary = { mobile, pc };
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));

const failed = [...mobile.reports, ...pc.reports].filter((r) => !r.ok);
const overlays = mobile.bookOpen.titles >= 5 && pc.bookOpen.titles >= 5 && mobile.notesOpen && pc.notesOpen;
if (failed.length || !overlays) {
  console.error("E2E_FAIL", failed.map((r) => r.name));
  process.exit(1);
}
console.log("E2E_OK");
