/**
 * Visual E2E for mobile 390×844 and PC 1440×900.
 * Mobile walks ALL beats × ALL 5 tabs. First+last only is NOT enough.
 * Chapter 4 adds 6 training beats: 25 × 5 = 125 mobile, 25 PC.
 * Fails if any Phaser label/bar intersects the CTA.
 * Also fails on local sticker collisions: tile/chip vs caption, chip vs chip,
 * chips under the minimum size, and placeholder tiles stacked on the first chip.
 * Big-band checks alone missed that class (caption on the Second tiles, ellipsis on S).
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

const PHASE_NAMES = ["goal", "why", "example", "myth", "remember"];
const SNAP = /title|L1-b1-p2|L2-b0-p0|L2-b5-p0|L2-b2-p2|L1-b0-p0/;

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
  await page.waitForTimeout(600);
}

async function jumpAndAssert(page, key, beat, phase, name) {
  await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
  await page.waitForTimeout(600);
  const result = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (SNAP.test(name) || result.overlaps?.length || result.overflows?.length || !result.ok) {
    await page.screenshot({ path: `${OUT}/${name}.png` });
  }
  return { name, ...result };
}

function walks(spine, { allPhases }) {
  const jobs = [];
  const pushLevel = (key, count, prefix) => {
    for (let beat = 0; beat < count; beat += 1) {
      const phases = allPhases ? spine.phases : 1;
      for (let phase = 0; phase < phases; phase += 1) {
        const p = allPhases ? phase : 2;
        const tag = PHASE_NAMES[p] || `p${p}`;
        jobs.push([key, beat, p, `${prefix}-b${beat}-p${p}-${tag}`]);
      }
    }
  };
  pushLevel("Level1", spine.l1, "L1");
  pushLevel("Level2", spine.l2, "L2");
  pushLevel("Level3", spine.l3, "L3");
  pushLevel("Level4", spine.l4, "L4");
  return jobs;
}

function readPseudo() {
  const lines = (document.getElementById("pseudo-code")?.textContent || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    open: !document.getElementById("pseudo-overlay")?.hidden,
    does: document.getElementById("pseudo-does")?.textContent || "",
    metaphor: document.getElementById("pseudo-metaphor")?.textContent || "",
    myth: document.getElementById("pseudo-myth")?.textContent || "",
    lines: lines.length,
    text: lines.join("\n"),
  };
}

async function openPseudoShot(page, key, beat, phase, file) {
  await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.click("#pseudo-toggle");
  await page.waitForTimeout(200);
  const tip = await page.evaluate(readPseudo);
  if (file) await page.screenshot({ path: file });
  await page.click("#pseudo-close");
  await page.waitForTimeout(120);
  return tip;
}

async function runViewport(label, pageOpts, { allPhases }) {
  const page = await browser.newPage(pageOpts);
  await ready(page);
  const spine = await page.evaluate(() => window.__nanoGPTSpine);
  if (!spine?.l1 || !spine?.l2 || !spine?.l3 || !spine?.l4 || !spine?.phases) {
    throw new Error("missing __nanoGPTSpine");
  }
  const jobs = walks(spine, { allPhases });
  const reports = [];
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 20000 });
  await page.waitForTimeout(500);
  const titleResult = await page.evaluate(() => window.__nanoGPTAssertLayout());
  await page.screenshot({ path: `${OUT}/${label}-title.png` });
  reports.push({ name: `${label}-title`, ...titleResult });
  if (!titleResult?.ok) console.error(`FAIL ${label} title overlaps=${JSON.stringify(titleResult?.overlaps || [])}`);
  else console.log(`ok ${label} title`);

  for (const [key, beat, phase, name] of jobs) {
    const result = await jumpAndAssert(page, key, beat, phase, `${label}-${name}`);
    reports.push(result);
    const overlap = JSON.stringify(result.overlaps || []);
    if (result.overlaps?.length || result.overflows?.length || !result.ok) {
      console.error(`FAIL ${label} ${name} overlaps=${overlap}`);
    } else {
      console.log(`ok ${label} ${name} overlaps=${overlap}`);
    }
  }

  await page.click("#book-toggle");
  await page.waitForTimeout(250);
  const bookOpen = await page.evaluate(() => ({
    open: window.__nanoGPTBookOpen?.(),
    titles: document.querySelectorAll("#tutor-book .tutor-block").length,
  }));
  await page.screenshot({ path: `${OUT}/${label}-book.png` });
  await page.click("#lesson-book-close");
  await page.waitForTimeout(150);
  await page.click("#notes-toggle");
  await page.waitForTimeout(250);
  const notesOpen = await page.evaluate(() => !document.getElementById("notes-overlay")?.hidden);
  await page.screenshot({ path: `${OUT}/${label}-glossary.png` });
  await page.click("#notes-close");

  const pseudoEncode = await openPseudoShot(page, "Level1", 1, 0, `${OUT}/${label}-pseudo-encode.png`);
  const pseudoShift = await openPseudoShot(page, "Level2", 2, 2, null);
  const pseudoLoss = await openPseudoShot(page, "Level2", 6, 0, null);
  await page.evaluate(() => window.__nanoGPTJump("Level3", 2, 2));
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${label}-attn-mask.png` });
  const attnLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  await page.click("#pseudo-toggle");
  await page.waitForTimeout(200);
  const pseudoMask = await page.evaluate(readPseudo);
  await page.screenshot({ path: `${OUT}/${label}-pseudo-attn.png` });
  await page.click("#pseudo-close");

  await page.evaluate(() => window.__nanoGPTJump("Level4", 1, 2));
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${label}-train-step.png` });
  const trainLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  await page.click("#pseudo-toggle");
  await page.waitForTimeout(200);
  const pseudoTrain = await page.evaluate(readPseudo);
  await page.screenshot({ path: `${OUT}/${label}-pseudo-train.png` });
  await page.click("#pseudo-close");

  const chrome = await page.evaluate(() => {
    const bar = document.getElementById("mobile-chrome");
    const actions = document.getElementById("mobile-actions");
    const br = bar?.getBoundingClientRect();
    const ar = actions?.getBoundingClientRect();
    return {
      chromeRight: br ? br.right : 0,
      actionsRight: ar ? ar.right : 0,
      width: window.innerWidth,
    };
  });

  const muteSlash = await assertMuteSlash(page);
  await page.close();
  return {
    reports,
    bookOpen,
    notesOpen,
    muteSlash,
    walked: jobs.length,
    spine,
    pseudoEncode,
    pseudoShift,
    pseudoLoss,
    pseudoMask,
    pseudoTrain,
    attnLayout,
    trainLayout,
    chrome,
  };
}

function tipOk(tip, needle) {
  return Boolean(
    tip?.open &&
      tip.does &&
      tip.metaphor &&
      tip.myth &&
      tip.lines >= 3 &&
      tip.lines <= 8 &&
      (!needle || tip.text.includes(needle) || tip.does.includes(needle) || tip.metaphor.includes(needle)),
  );
}

async function assertMuteSlash(page) {
  const already = await page.evaluate(() => document.getElementById("mute-toggle")?.classList.contains("is-muted"));
  if (!already) await page.click("#mute-toggle");
  await page.waitForFunction(() => document.getElementById("mute-toggle")?.classList.contains("is-muted"));
  await page.waitForTimeout(200);
  const box = await page.evaluate(() => {
    const btn = document.getElementById("mute-toggle");
    const slash = btn?.querySelector(".mute-toggle__slash");
    const br = btn.getBoundingClientRect();
    const sr = slash.getBoundingClientRect();
    const cx = sr.x + sr.width / 2;
    const cy = sr.y + sr.height / 2;
    return {
      position: getComputedStyle(btn).position,
      centerInside: cx >= br.left && cx <= br.right && cy >= br.top && cy <= br.bottom,
      btn: { x: br.x, y: br.y, w: br.width, h: br.height },
      slash: { x: sr.x, y: sr.y, w: sr.width, h: sr.height },
    };
  });
  if (box.position === "static" || !box.centerInside) {
    throw new Error(`mute slash escaped the button ${JSON.stringify(box)}`);
  }
  await page.click("#mute-toggle");
  return box;
}

const mobile = await runViewport(
  "mobile",
  {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  },
  { allPhases: true },
);

const pc = await runViewport(
  "pc",
  {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  },
  { allPhases: false },
);

await browser.close();

const summary = { mobile, pc };
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));

const failed = [...mobile.reports, ...pc.reports].filter((r) => !r.ok);
const overlays = mobile.bookOpen.titles >= 5 && pc.bookOpen.titles >= 5 && mobile.notesOpen && pc.notesOpen;
const spineOk =
  mobile.spine.l1 === 5 &&
  mobile.spine.l2 === 8 &&
  mobile.spine.l3 === 6 &&
  mobile.spine.l4 === 6 &&
  mobile.spine.phases === 5 &&
  pc.spine.l3 === 6 &&
  pc.spine.l4 === 6;
const walkedAll = mobile.walked === 25 * 5 && pc.walked === 25;
const pseudoOk =
  tipOk(mobile.pseudoEncode, "号码") &&
  tipOk(pc.pseudoEncode, "号码") &&
  tipOk(mobile.pseudoShift, "右") &&
  tipOk(pc.pseudoShift, "右") &&
  tipOk(mobile.pseudoLoss, "罚分") &&
  tipOk(pc.pseudoLoss, "罚分") &&
  tipOk(mobile.pseudoMask, "负无穷") &&
  tipOk(pc.pseudoMask, "负无穷") &&
  tipOk(mobile.pseudoTrain, "AdamW") &&
  tipOk(pc.pseudoTrain, "AdamW");
const attnOk = mobile.attnLayout?.ok && pc.attnLayout?.ok;
const trainOk = mobile.trainLayout?.ok && pc.trainLayout?.ok;
const chromeOk = mobile.chrome.actionsRight <= mobile.chrome.width + 1 && mobile.chrome.chromeRight <= mobile.chrome.width + 1;
if (failed.length || !overlays || !walkedAll || !spineOk || !pseudoOk || !attnOk || !trainOk || !chromeOk) {
  console.error("E2E_FAIL", {
    failed: failed.map((r) => r.name),
    mobileWalked: mobile.walked,
    pcWalked: pc.walked,
    overlays,
    spineOk,
    pseudoOk,
    attnOk,
    trainOk,
    chromeOk,
    mobileChrome: mobile.chrome,
  });
  process.exit(1);
}
console.log(`E2E_OK mobile=${mobile.walked} pc=${pc.walked}`);
