/**
 * Visual E2E for mobile 390×844 and PC 1440×900.
 * Mobile walks ALL pages × ALL 5 sections. First+last only is NOT enough.
 * Intro + 9/9/7/7/7 pages + chapter summaries: 49 × 5 = 245 mobile, 49 PC.
 * Fails if any Phaser label/bar intersects the CTA.
 * Also fails on local sticker collisions: tile/chip vs caption, chip vs chip,
 * chips under the minimum size, and placeholder tiles stacked on the first chip.
 * Big-band checks alone missed that class (caption on the Second tiles, ellipsis on S).
 * Home is extra: 390×844, 1024×522, 1024×640, 1440×900, 1920×1080, zh and ja.
 */
import { chromium, chromeLaunchOptions } from './browser.mjs';
import { mkdirSync, writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { present } from "../src/i18n/locale.js";
import { JA } from "../src/i18n/ja.js";
import { ZH } from "../src/i18n/zh.js";
import { EMBED_JA } from "../src/i18n/embed/ja.js";
import { EMBED_ZH } from "../src/i18n/embed/zh.js";
import { embedPagesFor } from "../src/i18n/embed/skeleton.js";
import { RAG_JA } from "../src/i18n/rag/ja.js";
import { RAG_ZH } from "../src/i18n/rag/zh.js";
import { ragPagesFor } from "../src/i18n/rag/skeleton.js";
import { pagesFor } from "../src/i18n/skeleton.js";

const LEVEL_PAGES = {
  Level1: pagesFor(1),
  Level2: pagesFor(2),
  Level3: pagesFor(3),
  Level4: pagesFor(4),
  Level5: pagesFor(5),
};

const RAG_LEVEL_PAGES = {
  Rag1: ragPagesFor(1),
  Rag2: ragPagesFor(2),
  Rag3: ragPagesFor(3),
  Rag4: ragPagesFor(4),
  Rag5: ragPagesFor(5),
};

const EMBED_LEVEL_PAGES = {
  Embed1: embedPagesFor(1),
  Embed2: embedPagesFor(2),
  Embed3: embedPagesFor(3),
  Embed4: embedPagesFor(4),
  Embed5: embedPagesFor(5),
};

const RAG3_SHOTS = [
  ["r1-p9", "zh", 1440, 900, "ch1-do-zh-1440x900.png"],
  ["r1-p9", "ja", 390, 844, "ch1-do-ja-390x844.png"],
  ["r2-p3", "ja", 390, 844, "ch2-cut-ja-390x844.png"],
  ["r2-p3", "zh", 1440, 900, "ch2-cut-zh-1440x900.png"],
  ["r3-p3", "zh", 1440, 900, "ch3-score-zh-1440x900.png"],
  ["r3-p3", "ja", 390, 844, "ch3-score-ja-390x844.png"],
  ["r4-p6", "zh", 1440, 900, "ch4-fill-zh-1440x900.png"],
  ["r4-p6", "ja", 390, 844, "ch4-fill-ja-390x844.png"],
  ["r5-p4", "zh", 1440, 900, "ch5-threshold-zh-1440x900.png"],
  ["r5-p4", "ja", 390, 844, "ch5-threshold-ja-390x844.png"],
  ["r5-p2", "ja", 1440, 900, "ch5-take-ja-1440x900.png"],
  ["r2-p1", "zh", 1440, 900, "ch2-cards-zh-1440x900.png"],
];

function expectedVo(lang, key, beat) {
  const pack = lang === "ja" ? JA : ZH;
  const id = key === "Title" ? "title" : LEVEL_PAGES[key][beat].id;
  return {
    id,
    prefix: pack.voiceBeat,
    text: present(pack[`${id}.vo`] || "").replace(/\s+/g, " ").trim(),
  };
}

const OUT = process.env.E2E_OUT || "output/legacy";
mkdirSync(OUT, { recursive: true });
// The kid animation home is the site root. No query parameter is needed.
const BASE = process.env.E2E_URL || "http://127.0.0.1:4182/";

const PHASE_NAMES = ["aim", "look", "do", "box", "check"];
const SNAP = /title|L1-b1-p2|L2-b0-p0|L2-b5-p0|L2-b2-p2|L1-b0-p0/;

const launchOptions = chromeLaunchOptions({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader"],
});
const browser = await chromium.launch(launchOptions);

async function ready(page) {
  page.on('pageerror', error => console.error('PAGE_ERROR', error.stack));
  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => typeof window.__nanoGPTJump === "function", { timeout: 45000 });
  await page.evaluate(() => document.fonts?.ready);
  // Boot finishes with a delayed start of Home. A jump issued during that
  // window is replaced by Home, and the speech checks never see Level1.
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Home", { timeout: 45000 });
  await page.waitForTimeout(200);
}

async function assertVo(page, key, beat) {
  const lang = await page.evaluate(() => (document.documentElement.lang || "").toLowerCase().startsWith("ja") ? "ja" : "zh");
  const want = expectedVo(lang, key, beat);
  try {
    await page.waitForFunction((expected) => {
      const line = String(document.getElementById("voice-line")?.textContent || "").replace(/\s+/g, " ").trim();
      const utter = String(window.__nanoGPTUtterance?.text || "").replace(/\s+/g, " ").trim();
      const narr = window.__nanoGPTNarration?.() || {};
      const narrText = String(narr.text || "").replace(/\s+/g, " ").trim();
      const pageId = window.__nanoGPTState?.().pageId || "";
      const body = line.startsWith(expected.prefix) ? line.slice(expected.prefix.length).trim() : "";
      return pageId === expected.id
        && narr.id === expected.id
        && narr.source === "clip"
        && body === expected.text
        && utter === expected.text
        && narrText === expected.text;
    }, want, { timeout: 4000 });
  } catch {
    const got = await page.evaluate(() => ({
      line: document.getElementById("voice-line")?.textContent || "",
      utter: window.__nanoGPTUtterance?.text || "",
      narr: window.__nanoGPTNarration?.() || {},
      pageId: window.__nanoGPTState?.().pageId || "",
      expected: window.__nanoGPTExpectedVo?.() || null,
    }));
    throw new Error(`vo mismatch ${key} b${beat} want=${JSON.stringify(want)} got=${JSON.stringify(got)}`);
  }
}

function expectedRagVo(lang, key, beat) {
  const pack = lang === "ja" ? RAG_JA : RAG_ZH;
  const nano = lang === "ja" ? JA : ZH;
  const id = key === "RagTitle" ? "rtitle" : RAG_LEVEL_PAGES[key][beat].id;
  return {
    id,
    prefix: nano.voiceBeat,
    text: present(pack[`${id}.vo`] || "").replace(/\s+/g, " ").trim(),
  };
}

async function assertRagVo(page, key, beat) {
  const lang = await page.evaluate(() => (document.documentElement.lang || "").toLowerCase().startsWith("ja") ? "ja" : "zh");
  const want = expectedRagVo(lang, key, beat);
  try {
    await page.waitForFunction((expected) => {
      const line = String(document.getElementById("voice-line")?.textContent || "").replace(/\s+/g, " ").trim();
      const narr = window.__nanoGPTNarration?.() || {};
      const narrText = String(narr.text || "").replace(/\s+/g, " ").trim();
      const pageId = window.__nanoGPTState?.().pageId || "";
      const body = line.startsWith(expected.prefix) ? line.slice(expected.prefix.length).trim() : "";
      const source = narr.source === "clip" || narr.source === "speech";
      return pageId === expected.id && narr.id === expected.id && source && body === expected.text && narrText === expected.text;
    }, want, { timeout: 4000 });
  } catch {
    const got = await page.evaluate(() => ({
      line: document.getElementById("voice-line")?.textContent || "",
      narr: window.__nanoGPTNarration?.() || {},
      pageId: window.__nanoGPTState?.().pageId || "",
    }));
    throw new Error(`rag vo mismatch ${key} b${beat} want=${JSON.stringify(want)} got=${JSON.stringify(got)}`);
  }
}

async function waitTutor(page) {
  const wide = await page.evaluate(() => window.innerWidth >= 1024 && window.innerWidth > window.innerHeight);
  if (!wide) return;
  await page.waitForFunction(() => document.getElementById("tutor-canvas")?.dataset.fitted === "1", { timeout: 30000 });
  await page.waitForTimeout(900);
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
}

async function jumpLanded(page, key, beat, phase) {
  await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
  await page.waitForFunction(([k, b, p]) => {
    const state = window.__nanoGPTState?.();
    return state?.scene === k && state.beat === b && state.phase === p && typeof window.__nanoGPTAssertLayout === "function";
  }, [key, beat, phase], { timeout: 15000 }).catch(async error => {
    console.error('JUMP_TIMEOUT', { key, beat, phase, actual: await page.evaluate(()=>({state:window.__nanoGPTState?.(),visibility:document.visibilityState,reader:document.documentElement.dataset.reader,loopRunning:window.__nanoGPTGame?.loop.running})) });
    throw error;
  });
}

async function jumpAndAssert(page, key, beat, phase, name) {
  await jumpLanded(page, key, beat, phase);
  await page.waitForTimeout(450);
  await assertVo(page, key, beat);
  const result = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (name.startsWith("mobile")) {
    const card = await page.evaluate(() => window.__nanoGPTCard || null);
    if (card?.truncated) {
      const shown = card.shown || "";
      if (!shown.includes("点整页") && !shown.includes("ページで全部")) {
        throw new Error(`card truncated without ellipsis ${name}`);
      }
    }
  }
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
  pushLevel("Level5", spine.l5, "L5");
  return jobs;
}

function ragWalks(spine, { allPhases }) {
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
  pushLevel("Rag1", spine.l1, "R1");
  pushLevel("Rag2", spine.l2, "R2");
  pushLevel("Rag3", spine.l3, "R3");
  pushLevel("Rag4", spine.l4, "R4");
  pushLevel("Rag5", spine.l5, "R5");
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
  const pseudoLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!pseudoLayout?.ok) {
    throw new Error(`pseudo layout ${file || key} ${JSON.stringify({ overlaps: pseudoLayout?.overlaps })}`);
  }
  if (file) await page.screenshot({ path: file });
  await page.click("#pseudo-close");
  await page.waitForTimeout(120);
  return tip;
}

async function enterNanoTutorial(page) {
  await page.waitForFunction(() => {
    const scene = window.__nanoGPTState?.().scene;
    return scene === "Home" || scene === "Title" || (typeof scene === "string" && /^Level[1-5]$/.test(scene)) || scene === "End";
  }, { timeout: 20000 });
  const scene = await page.evaluate(() => window.__nanoGPTState?.().scene);
  if (scene !== "Home") return;
  await page.waitForFunction(() => typeof window.__nanoGPTOpenTutorial === "function", { timeout: 20000 });
  await page.evaluate(() => window.__nanoGPTOpenTutorial());
  await page.waitForFunction(
    () => window.__nanoGPTState?.().scene === "Title" && typeof window.__nanoGPTAssertLayout === "function",
    { timeout: 20000 },
  );
  await page.waitForTimeout(250);
}

async function dismissGuide(page, label) {
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 20000 });
  const open = await page.evaluate(() => document.getElementById("guide-overlay")?.hidden === false);
  if (!open) return false;
  await page.screenshot({ path: `${OUT}/${label}-guide.png` });
  await page.click("#guide-close");
  await page.waitForFunction(() => document.getElementById("guide-overlay")?.hidden === true);
  return true;
}

async function assertGuideOnce(page) {
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 20000 });
  await page.waitForTimeout(400);
  const hidden = await page.evaluate(() => document.getElementById("guide-overlay")?.hidden === true);
  if (!hidden) throw new Error("guide showed again after dismiss");
  await page.click("#catalog-toggle");
  await page.waitForSelector("#catalog-overlay:not([hidden])");
  await page.click("#guide-toggle");
  await page.waitForFunction(() => document.getElementById("guide-overlay")?.hidden === false);
  await page.click("#guide-close");
  await page.waitForFunction(() => document.getElementById("guide-overlay")?.hidden === true);
}

async function assertNav(page, label) {
  await page.click("#catalog-toggle");
  await page.waitForSelector("#catalog-overlay:not([hidden])");
  const count = await page.locator("#catalog-list [data-chapter]").count();
  if (count !== 5) throw new Error(`chapter count ${count}`);
  await page.screenshot({ path: `${OUT}/${label}-catalog.png` });
  await page.click("[data-chapter='Level2']");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level2");
  await page.click("#back-toggle");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level1");
  await page.screenshot({ path: `${OUT}/${label}-back.png` });
  await page.evaluate(() => window.__nanoGPTJump("Level2", 1, 2));
  await page.waitForFunction(() => {
    const state = window.__nanoGPTState?.();
    return state?.scene === "Level2" && state.beat === 1 && state.phase === 2;
  });
  await page.click("#back-toggle");
  await page.waitForFunction(() => {
    const state = window.__nanoGPTState?.();
    return state?.scene === "Level2" && state.beat === 1 && state.phase === 1;
  });
  await page.click("#catalog-toggle");
  await page.click("[data-chapter='Level5']");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level5" && window.__nanoGPTState?.().beat === 0);
  await page.click("#back-toggle");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level4");
  await page.evaluate(() => window.__nanoGPTPickChapter("Level1"));
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level1" && window.__nanoGPTState?.().beat === 0);
}

async function assertLang(page, label) {
  await page.click("#lang-toggle");
  await page.waitForFunction(() => document.documentElement.lang === "ja" && localStorage.getItem("nanogpt-lang") === "ja");
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__nanoGPTHome());
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Title" && typeof window.__nanoGPTAssertLayout === "function");
  await page.waitForTimeout(500);
  await assertVo(page, "Title", 0);
  const titleLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!titleLayout?.ok) throw new Error(`ja title ${JSON.stringify(titleLayout?.overlaps || titleLayout)}`);
  await page.evaluate(() => window.__nanoGPTJump("Level1", 0, 0));
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level1" && typeof window.__nanoGPTAssertLayout === "function");
  await page.waitForTimeout(500);
  const beatLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  const voice = await page.evaluate(() => window.__nanoGPTNarration?.() || {});
  const note = await page.evaluate(() => document.getElementById("voice-note")?.textContent || "");
  if (!String(voice.lang || "").startsWith("ja") || !voice.text) throw new Error(`ja voice ${JSON.stringify(voice)}`);
  if (!note.includes("音声")) throw new Error(`voice note ${note}`);
  if (!beatLayout?.ok) {
    throw new Error(`ja beat ${JSON.stringify({ overlaps: beatLayout?.overlaps, overflows: beatLayout?.overflows, locals: beatLayout?.locals })}`);
  }
  await page.screenshot({ path: `${OUT}/${label}-ja-voice.png` });
  await page.evaluate(() => window.__nanoGPTJump("Level1", 1, 0));
  await page.waitForFunction(() => window.__nanoGPTState?.().beat === 1);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${label}-ja-c1-cells.png` });
  await page.click("#pseudo-toggle");
  await page.waitForTimeout(200);
  const pseudo = await page.evaluate(() => document.getElementById("pseudo-does")?.textContent || "");
  const pseudoLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!pseudoLayout?.ok) {
    throw new Error(`ja pseudo layout ${label} ${JSON.stringify({ overlaps: pseudoLayout?.overlaps })}`);
  }
  await page.click("#pseudo-close");
  await page.click("#notes-toggle");
  await page.waitForTimeout(200);
  const jaGlossary = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!jaGlossary?.ok) {
    throw new Error(`ja glossary ${label} ${JSON.stringify({ overlaps: jaGlossary?.overlaps })}`);
  }
  await page.click("#notes-close");
  if (!pseudo.includes("マス")) throw new Error(`ja pseudo ${pseudo}`);
  await page.evaluate(() => window.__nanoGPTJump("Level1", 0, 2));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${label}-ja-c1-intro.png` });
  await page.evaluate(() => window.__nanoGPTJump("Level5", 7, 2));
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level5" && window.__nanoGPTState?.().beat === 7);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${label}-ja-c5-sign.png` });
  if (label === "pc" || label === "pc1024") {
    await waitTutor(page);
    const spine = await page.evaluate(() => window.__nanoGPTSpine);
    const jobs = [
      ...Array.from({ length: spine.l1 }, (_, beat) => ["Level1", beat]),
      ...Array.from({ length: spine.l2 }, (_, beat) => ["Level2", beat]),
      ...Array.from({ length: spine.l3 }, (_, beat) => ["Level3", beat]),
      ...Array.from({ length: spine.l4 }, (_, beat) => ["Level4", beat]),
      ...Array.from({ length: spine.l5 }, (_, beat) => ["Level5", beat]),
    ];
    for (const [key, beat] of jobs) {
      await page.evaluate(([k, b]) => window.__nanoGPTJump(k, b, 2), [key, beat]);
      await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
      await page.waitForTimeout(280);
      const result = await page.evaluate(() => window.__nanoGPTAssertLayout());
      if (!result?.ok) {
        throw new Error(
          `ja ${label} ${key} b${beat} ${JSON.stringify({ overlaps: result?.overlaps, locals: result?.locals, overflows: result?.overflows })}`,
        );
      }
    }
  }
  if (label === "mobile") {
    const spine = await page.evaluate(() => window.__nanoGPTSpine);
    const jobs = [
      ...Array.from({ length: spine.l1 }, (_, beat) => ["Level1", beat]),
      ...Array.from({ length: spine.l2 }, (_, beat) => ["Level2", beat]),
      ...Array.from({ length: spine.l3 }, (_, beat) => ["Level3", beat]),
      ...Array.from({ length: spine.l4 }, (_, beat) => ["Level4", beat]),
      ...Array.from({ length: spine.l5 }, (_, beat) => ["Level5", beat]),
    ];
    for (const [key, beat] of jobs) {
      for (const phase of [0, 2]) {
        await jumpLanded(page, key, beat, phase);
        await page.waitForTimeout(350);
        await assertVo(page, key, beat);
        const result = await page.evaluate(() => window.__nanoGPTAssertLayout());
        if (!result?.ok) {
          throw new Error(
            `ja ${key} b${beat} p${phase} ${JSON.stringify({ overlaps: result?.overlaps, locals: result?.locals, overflows: result?.overflows })}`,
          );
        }
      }
    }
  }
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.lang === "ja", { timeout: 20000 });
  const still = await page.evaluate(() => localStorage.getItem("nanogpt-lang"));
  if (still !== "ja") throw new Error(`lang not persistent ${still}`);
}

async function runViewport(label, pageOpts, { allPhases }) {
  const page = await browser.newPage(pageOpts);
  await ready(page);
  await page.evaluate(() => {
    localStorage.setItem("nanogpt-lang", "zh");
    localStorage.setItem("nanogpt-game-muted", "0");
    localStorage.removeItem("nanogpt-seen-guide");
  });
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => typeof window.__nanoGPTJump === "function", { timeout: 45000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(300);
  await enterNanoTutorial(page);
  const guideShown = await dismissGuide(page, label);
  await waitTutor(page);
  await assertVo(page, "Title", 0);
  const spine = await page.evaluate(() => window.__nanoGPTSpine);
  if (!spine?.l1 || !spine?.l2 || !spine?.l3 || !spine?.l4 || !spine?.l5 || !spine?.phases) {
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
  const bookLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!bookLayout?.ok) {
    throw new Error(`book ${label} ${JSON.stringify({ overlaps: bookLayout?.overlaps, overflows: bookLayout?.overflows })}`);
  }
  await page.click("#lesson-book-close");
  await page.waitForTimeout(150);
  await page.click("#notes-toggle");
  await page.waitForTimeout(250);
  const notesOpen = await page.evaluate(() => !document.getElementById("notes-overlay")?.hidden);
  await page.screenshot({ path: `${OUT}/${label}-glossary.png` });
  const glossary = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!glossary?.ok) {
    throw new Error(`glossary ${label} ${JSON.stringify({ overlaps: glossary?.overlaps, overflows: glossary?.overflows })}`);
  }
  await page.click("#notes-close");

  await page.evaluate(() => window.__nanoGPTJump("Level1", 0, 2));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${label}-zh-c1-intro.png` });
  await page.evaluate(() => window.__nanoGPTJump("Level1", 7, 2));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${label}-zh-c1-encode.png` });
  await page.evaluate(() => window.__nanoGPTJump("Level5", 7, 2));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${label}-zh-c5-sign.png` });
  if (label === "mobile") {
    const shots = [
      ["Level1", 5, 1, "zh-c1-p5"],
      ["Level2", 5, 1, "zh-c2-p5"],
      ["Level3", 3, 1, "zh-c3-p3"],
      ["Level3", 4, 1, "zh-c3-p4"],
      ["Level3", 5, 1, "zh-c3-p5"],
      ["Level4", 3, 1, "zh-c4-p3"],
      ["Level5", 0, 0, "zh-c5-intro"],
    ];
    for (const [key, beat, phase, file] of shots) {
      await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
      await page.waitForTimeout(350);
      await assertVo(page, key, beat);
      await page.screenshot({ path: `${OUT}/${label}-${file}.png` });
    }
  }
  if (label === "pc") {
    await page.evaluate(() => window.__nanoGPTJump("Level3", 3, 1));
    await page.waitForTimeout(350);
    await assertVo(page, "Level3", 3);
    await page.screenshot({ path: `${OUT}/${label}-zh-c3-p3.png` });
  }
  if (label === "mobile") await assertKeyLines(page);

  const pseudoEncode = await openPseudoShot(page, "Level1", 7, 0, `${OUT}/${label}-pseudo-encode.png`);
  const pseudoShift = await openPseudoShot(page, "Level2", 2, 2, null);
  const pseudoLoss = await openPseudoShot(page, "Level2", 7, 0, null);
  await page.evaluate(() => window.__nanoGPTJump("Level3", 2, 2));
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${label}-attn-mask.png` });
  const attnLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  await page.click("#pseudo-toggle");
  await page.waitForTimeout(200);
  const pseudoMask = await page.evaluate(readPseudo);
  const maskLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!maskLayout?.ok) throw new Error(`pseudo mask ${label} ${JSON.stringify(maskLayout?.overlaps)}`);
  await page.screenshot({ path: `${OUT}/${label}-pseudo-attn.png` });
  await page.click("#pseudo-close");

  await page.evaluate(() => window.__nanoGPTJump("Level4", 4, 2));
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${label}-train-step.png` });
  const trainLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  await page.click("#pseudo-toggle");
  await page.waitForTimeout(200);
  const pseudoTrain = await page.evaluate(readPseudo);
  const trainPseudoLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!trainPseudoLayout?.ok) throw new Error(`pseudo train ${label} ${JSON.stringify(trainPseudoLayout?.overlaps)}`);
  await page.screenshot({ path: `${OUT}/${label}-pseudo-train.png` });
  await page.click("#pseudo-close");

  await page.evaluate(() => window.__nanoGPTJump("Level5", 6, 2));
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/${label}-sample-loop.png` });
  const sampleLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  await page.click("#pseudo-toggle");
  await page.waitForTimeout(200);
  const pseudoSample = await page.evaluate(readPseudo);
  const samplePseudoLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!samplePseudoLayout?.ok) throw new Error(`pseudo sample ${label} ${JSON.stringify(samplePseudoLayout?.overlaps)}`);
  await page.screenshot({ path: `${OUT}/${label}-pseudo-sample.png` });
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
  await assertGuideOnce(page);
  await assertNav(page, label);
  await assertLang(page, label);
  await page.close();
  return {
    reports,
    bookOpen,
    notesOpen,
    muteSlash,
    guideShown,
    walked: jobs.length,
    spine,
    pseudoEncode,
    pseudoShift,
    pseudoLoss,
    pseudoMask,
    pseudoTrain,
    pseudoSample,
    attnLayout,
    trainLayout,
    sampleLayout,
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

function speechMockSource(mode) {
  return `(() => {
    const mode = ${JSON.stringify(mode)};
    const ja = { voiceURI: "Google 日本語", name: "Google 日本語", lang: "ja-JP", localService: false, default: false };
    const kyoko = { voiceURI: "Kyoko", name: "Kyoko", lang: "ja-JP", localService: true, default: false };
    const zh = { voiceURI: "Microsoft Huihui", name: "Microsoft Huihui", lang: "zh-CN", localService: true, default: true };
    const voices = mode === "ja" ? [zh, kyoko, ja] : [zh];
    let ready = mode !== "ja";
    const listeners = new Set();
    window.__nanoGPTReleaseVoices = () => {
      ready = true;
      listeners.forEach((fn) => {
        try { fn(); } catch (err) { console.error(err); }
      });
    };
    class FakeUtterance {
      constructor(text) {
        this.text = String(text ?? "");
        this.lang = "";
        this.voice = null;
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
        this.onend = null;
        this.onerror = null;
        this.onstart = null;
      }
    }
    window.SpeechSynthesisUtterance = FakeUtterance;
    const synth = {
      speaking: false,
      pending: false,
      paused: false,
      onvoiceschanged: null,
      getVoices() { return ready ? voices.slice() : []; },
      addEventListener(type, fn) {
        if (type === "voiceschanged" && typeof fn === "function") listeners.add(fn);
      },
      removeEventListener(type, fn) {
        if (type === "voiceschanged") listeners.delete(fn);
      },
      cancel() {
        this.speaking = false;
        this.pending = false;
      },
      resume() { this.paused = false; },
      pause() { this.paused = true; },
      speak(utter) {
        this.speaking = true;
        this.pending = false;
        window.__nanoGPTUtterance = utter;
        setTimeout(() => {
          if (window.__nanoGPTUtterance !== utter) return;
          this.speaking = false;
          if (typeof utter.onend === "function") utter.onend();
        }, 30);
      },
    };
    try {
      Object.defineProperty(window, "speechSynthesis", { configurable: true, get() { return synth; } });
    } catch (err) {
      window.__speechMockError = String(err);
    }
    localStorage.setItem("nanogpt-seen-guide", "1");
    localStorage.setItem("nanogpt-game-muted", "0");
    localStorage.removeItem("nanogpt-lang");
  })();`;
}

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

async function openSpeechPage(browser, { mode, label }) {
  const mobile = label !== "pc";
  const page = await browser.newPage({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile ? MOBILE_UA : undefined,
  });
  // These pages assert the Web Speech fallback. Drop the recorded clips so the loader misses them.
  await page.route("**/audio/vo/**", (route) => route.abort());
  await page.addInitScript(speechMockSource(mode));
  await ready(page);
  const hooked = await page.evaluate((expected) => {
    const count = window.speechSynthesis?.getVoices?.().length;
    return {
      ok: typeof window.__nanoGPTReleaseVoices === "function" && count === expected && !window.__speechMockError,
      count,
      error: window.__speechMockError || "",
    };
  }, mode === "ja" ? 0 : 1);
  if (!hooked?.ok) throw new Error(`speech mock missing (${label}) ${JSON.stringify(hooked)}`);
  const guide = await page.evaluate(() => document.getElementById("guide-overlay")?.hidden === false);
  if (guide) {
    await page.click("#guide-close");
    await page.waitForFunction(() => document.getElementById("guide-overlay")?.hidden === true);
  }
  return page;
}

async function assertJaSpeech(browser) {
  const voiced = await pageWithJaVoice(browser);
  const missing = await pageWithoutJaVoice(browser, "mobile");
  const missingPc = await pageWithoutJaVoice(browser, "pc");
  return { voiced: true, missing: missing && missingPc, voicedSpeak: voiced };
}

async function pageWithJaVoice(browser) {
  const page = await openSpeechPage(browser, { mode: "ja", label: "mobile" });
  await page.click("#lang-toggle");
  await page.waitForFunction(() => document.documentElement.lang === "ja" && window.__nanoGPTState?.().scene === "Home");
  await page.evaluate(() => window.__nanoGPTJump("Level1", 0, 0));
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level1" && window.__nanoGPTState?.().beat === 0);
  await page.waitForTimeout(200);
  const early = await page.evaluate(() => (window.__nanoGPTSpeechLog || []).filter((entry) => entry.op === "speak"));
  if (early.length) throw new Error(`spoke before voiceschanged ${JSON.stringify(early)}`);
  const waited = await page.evaluate(() => (window.__nanoGPTSpeechLog || []).some((entry) => entry.op === "wait"));
  if (!waited) throw new Error(`did not wait for voiceschanged ${JSON.stringify(await page.evaluate(() => window.__nanoGPTSpeechLog))}`);
  await page.evaluate(() => window.__nanoGPTReleaseVoices());
  await page.waitForFunction(() => {
    const hit = (window.__nanoGPTSpeechLog || []).find((entry) => entry.op === "speak" && entry.lang === "ja-JP" && String(entry.voice).includes("日本"));
    return Boolean(hit && hit.text);
  });
  const first = await page.evaluate(() => (window.__nanoGPTSpeechLog || []).filter((entry) => entry.op === "speak").at(-1));
  if (first.voiceLang && String(first.voiceLang).toLowerCase().startsWith("zh")) {
    throw new Error(`ja utterance used a Chinese voice ${JSON.stringify(first)}`);
  }
  const note = await page.evaluate(() => document.getElementById("voice-note")?.textContent || "");
  if (!note.includes("音声")) throw new Error(`voiced note ${note}`);
  if ((await page.evaluate(() => document.getElementById("voice-note")?.dataset.missing)) === "1") {
    throw new Error("missing-voice tip showed even though a ja voice exists");
  }
  await page.screenshot({ path: `${OUT}/ja-speak-voice.png` });

  const beforeMute = await page.evaluate(() => (window.__nanoGPTSpeechLog || []).filter((entry) => entry.op === "speak").length);
  await page.click("#mute-toggle");
  await page.waitForFunction(() => document.getElementById("mute-toggle")?.classList.contains("is-muted"));
  await page.waitForTimeout(180);
  await page.evaluate(() => window.__nanoGPTJump("Level1", 1, 0));
  await page.waitForFunction(() => window.__nanoGPTState?.().beat === 1);
  await page.waitForTimeout(250);
  const whileMuted = await page.evaluate(() => (window.__nanoGPTSpeechLog || []).filter((entry) => entry.op === "speak").length);
  if (whileMuted !== beforeMute) throw new Error(`spoke while muted ${whileMuted} vs ${beforeMute}`);
  const mutedState = await page.evaluate(() => window.__nanoGPTNarration?.() || {});
  if (mutedState.playing) throw new Error(`still playing while muted ${JSON.stringify(mutedState)}`);

  await page.click("#mute-toggle");
  await page.waitForFunction(() => !(document.getElementById("mute-toggle")?.classList.contains("is-muted")));
  await page.waitForFunction((min) => (window.__nanoGPTSpeechLog || []).filter((entry) => entry.op === "speak").length > min, beforeMute);
  const resumed = await page.evaluate(() => (window.__nanoGPTSpeechLog || []).filter((entry) => entry.op === "speak").at(-1));
  if (resumed.lang !== "ja-JP" || !String(resumed.voice).includes("日本")) {
    throw new Error(`unmute did not resume ja ${JSON.stringify(resumed)}`);
  }

  await page.click("#lang-toggle");
  await page.waitForFunction(() => document.documentElement.lang === "zh-CN");
  await page.waitForFunction(() => {
    const row = window.__nanoGPTNarration?.() || {};
    return String(row.lang || "").startsWith("zh") && (row.source === "clip" || row.source === "speech");
  });
  const zh = await page.evaluate(() => window.__nanoGPTNarration?.() || {});
  if (String(zh.lang).startsWith("ja")) throw new Error(`lang toggle left ja narration ${JSON.stringify(zh)}`);

  await page.click("#lang-toggle");
  await page.waitForFunction(() => document.documentElement.lang === "ja");
  await page.waitForFunction(() => {
    const speaks = (window.__nanoGPTSpeechLog || []).filter((entry) => entry.op === "speak" && entry.lang === "ja-JP");
    return speaks.length >= 3 && String(speaks.at(-1).voice).includes("日本");
  });
  await page.close();
  return first;
}

async function pageWithoutJaVoice(browser, label) {
  const page = await openSpeechPage(browser, { mode: "none", label });
  await page.click("#lang-toggle");
  await page.waitForFunction(() => document.documentElement.lang === "ja" && window.__nanoGPTState?.().scene === "Home");
  await page.evaluate(() => window.__nanoGPTJump("Level1", 0, 0));
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level1");
  await page.waitForFunction(() => {
    // Home may already have spoken Chinese before the toggle. The missing-voice
    // check is the later Japanese utterance, not the first speak in the log.
    const hit = (window.__nanoGPTSpeechLog || []).find((entry) => entry.op === "speak" && entry.lang === "ja-JP");
    const note = document.getElementById("voice-note");
    const tip = note?.getAttribute("aria-label") || note?.title || "";
    const line = document.getElementById("voice-line")?.textContent || "";
    return Boolean(
      hit &&
        !hit.voice &&
        note?.dataset.missing === "1" &&
        tip.includes("Chrome") &&
        tip.includes("日本語") &&
        tip.includes("安装") &&
        line.includes("音声"),
    );
  });
  const row = await page.evaluate(() => window.__nanoGPTNarration?.() || {});
  if (!row.missingVoice || row.lang !== "ja-JP") throw new Error(`missing voice state ${label} ${JSON.stringify(row)}`);
  const layout = await page.evaluate(() => window.__nanoGPTAssertLayout?.());
  if (layout && !layout.ok) {
    throw new Error(`missing-voice layout ${label} ${JSON.stringify({ overlaps: layout.overlaps, overflows: layout.overflows })}`);
  }
  await page.screenshot({ path: `${OUT}/ja-missing-voice-${label}.png` });
  await page.close();
  return true;
}

async function assertKeyLines(page) {
  const cases = [
    ["Level1", 2, 1, ["空格画成", "一共 15 格"], "zh-c1-p2-look"],
    ["Level2", 1, 1, ["真的一段是 256 格"], "zh-c2-p1-look"],
    ["Level2", 3, 1, ["第 8 题：看 F 到 i 八个字，猜 t"], "zh-c2-p3-look"],
    ["Level3", 1, 1, ["一行说『这是什么字』", "它排第几", "把两行加起来"], "zh-c3-p1-look"],
    ["Level5", 0, 1, ["小G 每次只接一个字"], "zh-c5-intro-look"],
    ["Level5", 0, 2, ["新的字"], "zh-c5-intro-do"],
  ];
  for (const [key, beat, phase, needles, file] of cases) {
    await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
    await page.waitForFunction(() => window.__nanoGPTCard?.shown, { timeout: 15000 });
    await page.waitForTimeout(300);
    const card = await page.evaluate(() => window.__nanoGPTCard || {});
    const shown = String(card.shown || "").replace(/\s+/g, "");
    for (const needle of needles) {
      if (!shown.includes(needle.replace(/\s+/g, ""))) {
        throw new Error(`key sentence dropped ${file} missing ${needle} shown=${card.shown}`);
      }
    }
    await page.screenshot({ path: `${OUT}/mobile-${file}.png` });
  }
  await page.evaluate(() => window.__nanoGPTJump("Level1", 4, 1));
  await page.waitForTimeout(300);
  await page.click("#book-toggle");
  await page.waitForTimeout(250);
  const detail = await page.evaluate(() => document.getElementById("tutor-book")?.textContent || "");
  if (!detail.includes("数字「3」1 种") || detail.includes("数字 3 种")) {
    throw new Error(`c1-p4 category count ${detail}`);
  }
  await page.screenshot({ path: `${OUT}/mobile-zh-c1-p4-detail.png` });
  await page.click("#lesson-book-close");
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

const speech = await assertJaSpeech(browser);

const LIVE2D_FIT_SIZES = [
  [1440, 900],
  [1280, 600],
  [1024, 522],
  [1280, 640],
  [1366, 768],
  [1920, 960],
  [1920, 1080],
  [2560, 1080],
];

const FIT_LEVELS = [
  ["Level1", LEVEL_PAGES.Level1.length],
  ["Level2", LEVEL_PAGES.Level2.length],
  ["Level3", LEVEL_PAGES.Level3.length],
  ["Level4", LEVEL_PAGES.Level4.length],
  ["Level5", LEVEL_PAGES.Level5.length],
];
const C3_P3_BEAT = LEVEL_PAGES.Level3.findIndex((page) => page.id === "c3-p3");

async function assertLive2dPanel(browser) {
  const shotDir = `${OUT}/live2d-fit2`;
  mkdirSync(shotDir, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.addInitScript(() => {
    localStorage.setItem("nanogpt-lang", "ja");
    localStorage.setItem("nanogpt-seen-guide", "1");
    localStorage.setItem("nanogpt-game-muted", "1");
    window.__nanoGPTReadLive2dFit = () => {
      const stageEl = document.getElementById("tutor-stage");
      const canvas = document.getElementById("tutor-canvas");
      const dock = document.getElementById("tutor-dock");
      const shell = document.getElementById("game-shell")?.getBoundingClientRect();
      const lessonFloor = Math.min(1160, window.innerWidth - 334);
      const lessonFull = Math.min(1160, window.innerWidth);
      const lessonWidth = shell?.width || 0;
      const lessonOk = lessonWidth + 2 >= lessonFloor;
      const fullWidth = Math.abs(lessonWidth - lessonFull) <= 4;
      const reserveRaw = getComputedStyle(document.documentElement).getPropertyValue("--tutor-reserve").trim();
      const reserve = reserveRaw ? Number.parseFloat(reserveRaw) : null;
      const purposeAlpha = typeof window.__nanoGPTPurposeAlpha === "function" ? window.__nanoGPTPurposeAlpha() : null;
      const pageId = window.__nanoGPTState?.().pageId || "";
      const concealed = document.documentElement.dataset.tutor === "hidden";
      if (concealed) {
        const dockHidden = Boolean(dock?.hidden);
        const reserveClear = reserve != null && reserve <= 0.5;
        const lessonRect = shell;
        const leftGap = lessonRect ? lessonRect.left : 0;
        const rightGap = lessonRect ? window.innerWidth - lessonRect.right : 0;
        const gapDelta = Math.abs(leftGap - rightGap);
        const centeredLesson = gapDelta <= 2;
        const dockStyle = dock ? getComputedStyle(dock) : null;
        const dockRect = dock?.getBoundingClientRect();
        const panelVisible = Boolean(
          dock && !dock.hidden && dockStyle?.display !== "none" && dockRect && dockRect.width > 1 && dockRect.height > 1,
        );
        const layoutBg = getComputedStyle(document.getElementById("app-layout")).backgroundImage || "";
        const skyBackdrop =
          /linear-gradient/i.test(layoutBg) && /246,\s*239,\s*228/.test(layoutBg) && /234,\s*214,\s*196/.test(layoutBg);
        const gapClear = (() => {
          const ys = [0.22, 0.5, 0.78].map((t) => Math.round(window.innerHeight * t));
          const xs = [];
          if (leftGap > 6) xs.push(leftGap / 2);
          if (rightGap > 6) xs.push(window.innerWidth - rightGap / 2);
          for (const x of xs) {
            for (const y of ys) {
              const el = document.elementFromPoint(Math.round(x), y);
              if (!el || el.closest("#tutor-dock, #tutor-stage, #tutor-canvas, #pc-stage, #game-shell")) return false;
            }
          }
          return true;
        })();
        const uniform = !panelVisible && skyBackdrop && gapClear;
        return {
          ready: dockHidden && reserveClear,
          hidden: true,
          ok: dockHidden && reserveClear && fullWidth && lessonOk && centeredLesson && uniform,
          fullWidth,
          lessonOk,
          centeredLesson,
          uniform,
          panelVisible,
          skyBackdrop,
          gapClear,
          leftGap,
          rightGap,
          gapDelta,
          lessonWidth,
          lessonFloor,
          lessonFull,
          reserve,
          ratio: null,
          purposeAlpha,
          pageId,
        };
      }
      const stage = stageEl?.getBoundingClientRect();
      const crect = canvas?.getBoundingClientRect();
      const place = window.__nanoGPTTutorHiDPI?.()?.place;
      const bounds = place?.bounds;
      if (!stage || !crect || !bounds || canvas.dataset.fitted !== "1" || dock?.hidden) return { ready: false, hidden: false };
      const box = { x: crect.x + bounds.x, y: crect.y + bounds.y, w: bounds.w, h: bounds.h };
      const bottomGap = stage.bottom - (box.y + box.h);
      const centerDelta = box.x + box.w / 2 - (crect.x + crect.width / 2);
      const ratio = stage.height > 0 ? box.h / stage.height : 0;
      const heightOk = ratio >= 0.88 && ratio <= 0.92;
      const bottomOk = bottomGap >= -2 && bottomGap <= 12;
      const centered = Math.abs(centerDelta) <= 10;
      const inside =
        box.x >= -1 &&
        box.y >= -1 &&
        box.x + box.w <= window.innerWidth + 1 &&
        box.y + box.h <= window.innerHeight + 1 &&
        box.x >= stage.x - 1 &&
        box.y >= stage.y - 1 &&
        box.x + box.w <= stage.right + 1 &&
        box.y + box.h <= stage.bottom + 1;
      return {
        ready: true,
        hidden: false,
        ok: heightOk && bottomOk && centered && inside && lessonOk,
        heightOk,
        bottomOk,
        centered,
        inside,
        lessonOk,
        fullWidth,
        bottomGap,
        centerDelta,
        ratio,
        box,
        lessonWidth,
        lessonFloor,
        lessonFull,
        reserve,
        meshAspect: place?.meshAspect ?? null,
        purposeAlpha,
        panel: { x: stage.x, y: stage.y, w: stage.width, h: stage.height },
        canvas: { x: crect.x, y: crect.y, w: crect.width, h: crect.height },
        pageId,
      };
    };
  });
  await ready(page);
  await page.waitForFunction(() => window.__nanoGPTReadLive2dFit?.()?.ready === true, { timeout: 30000 });
  const shotSizes = new Set(["1024x522", "1280x640", "1920x1080", "2560x1080"]);
  const results = [];
  let pages = 0;
  for (let index = 0; index < LIVE2D_FIT_SIZES.length; index += 1) {
    const [w, h] = LIVE2D_FIT_SIZES[index];
    const name = `${w}x${h}`;
    await page.setViewportSize({ width: w, height: h });
    await page.waitForFunction(
      ({ width, height }) => {
        if (Math.abs(window.innerWidth - width) > 2 || Math.abs(window.innerHeight - height) > 2) return false;
        const fit = window.__nanoGPTReadLive2dFit?.();
        if (!fit?.ready) return false;
        if (fit.hidden) return true;
        const stage = document.getElementById("tutor-stage")?.getBoundingClientRect();
        return Boolean(stage && Math.abs(stage.height - height) < 8);
      },
      { width: w, height: h },
      { timeout: 15000 },
    );
    for (const lang of ["ja", "zh"]) {
      await page.evaluate((next) => window.__nanoGPTSetLang(next), lang);
      for (const [key, count] of FIT_LEVELS) {
        for (let beat = 0; beat < count; beat += 1) {
          const pageId = LEVEL_PAGES[key][beat].id;
          await page.evaluate(([sceneKey, sceneBeat]) => window.__nanoGPTJump(sceneKey, sceneBeat, 0), [key, beat]);
          await page.waitForFunction(
            (id) => {
              const state = window.__nanoGPTState?.();
              const scenes = window.__nanoGPTGame?.scene?.getScenes?.(true) || [];
              const idle = scenes.length > 0 && scenes.every((scene) => (scene.tweens?.getTweens?.() || []).length === 0);
              const fit = window.__nanoGPTReadLive2dFit?.();
              return Boolean(state?.pageId === id && state?.phase === 0 && idle && fit?.ready && window.__nanoGPTBannerSettled === true);
            },
            pageId,
            { timeout: 15000 },
          );
          const report = await page.evaluate(() => {
            const layout = window.__nanoGPTAssertLayout?.() || {};
            const fit = window.__nanoGPTReadLive2dFit?.() || {};
            return {
              ok: Boolean(layout.ok && fit.ok),
              overlaps: layout.overlaps || [],
              overflows: layout.overflows || [],
              orphans: layout.orphans || [],
              lessonWidth: layout.lessonWidth,
              lessonFloor: layout.lessonFloor,
              lessonWidthOk: layout.lessonWidthOk,
              fitOk: fit.ok,
              hidden: fit.hidden,
              fullWidth: fit.fullWidth,
              ratio: fit.ratio,
              bottomGap: fit.bottomGap,
              centerDelta: fit.centerDelta,
              heightOk: fit.heightOk,
              lessonOk: fit.lessonOk,
              lessonFull: fit.lessonFull,
              centeredLesson: fit.centeredLesson,
              gapDelta: fit.gapDelta,
              leftGap: fit.leftGap,
              rightGap: fit.rightGap,
              uniform: fit.uniform,
              panelVisible: fit.panelVisible,
              skyBackdrop: fit.skyBackdrop,
              gapClear: fit.gapClear,
              reserve: fit.reserve,
              meshAspect: fit.meshAspect,
              purposeAlpha: fit.purposeAlpha,
              box: fit.box,
              canvas: fit.canvas,
              inside: fit.inside,
              centered: fit.centered,
              bottomOk: fit.bottomOk,
            };
          });
          pages += 1;
          const shot = shotSizes.has(name) && ((lang === "ja" && pageId === "c1-intro") || (lang === "zh" && pageId === "c3-p3"));
          if (shot) {
            if (!(report.purposeAlpha >= 0.98)) {
              await page.screenshot({ path: `${OUT}/live2d-fade-${lang}-${name}.png` });
              throw new Error(`purpose faded after settle ${lang} ${name} alpha=${report.purposeAlpha}`);
            }
            await page.screenshot({ path: `${shotDir}/${lang}-${pageId}-${name}.png` });
          }
          if (!report.ok) {
            await page.screenshot({ path: `${OUT}/live2d-fit-${lang}-${pageId}-${name}.png` });
            throw new Error(`live2d layout ${lang} ${pageId} ${name} ${JSON.stringify(report)}`);
          }
        }
      }
      const sample = await page.evaluate(() => window.__nanoGPTReadLive2dFit());
      results.push({ name, lang, sample });
      if (sample.hidden) {
        if (lang === "ja") await assertHiddenBackdrop(page);
        console.log(
          `ok live2d ${lang} ${name} hidden lesson=${Math.round(sample.lessonWidth)} full=${Math.round(sample.lessonFull)} gap=${Number(sample.gapDelta).toFixed(2)} alpha=${Number(sample.purposeAlpha).toFixed(2)}`,
        );
      } else {
        console.log(
          `ok live2d ${lang} ${name} ratio=${Number(sample.ratio).toFixed(2)} aspect=${Number(sample.meshAspect).toFixed(2)} lesson=${Math.round(sample.lessonWidth)}/${Math.round(sample.lessonFloor)} bottom=${Number(sample.bottomGap).toFixed(1)} alpha=${Number(sample.purposeAlpha).toFixed(2)}`,
        );
      }
    }
  }
  if (C3_P3_BEAT < 0) throw new Error("c3-p3 missing from spine");
  const threshold = await assertTutorThreshold(page, shotDir);
  await page.close();
  console.log(`LIVE2D_FIT_OK sizes=${LIVE2D_FIT_SIZES.length} pages=${pages} threshold=${threshold.above}x1080/${threshold.below}x1080`);
  return { ok: true, sizes: LIVE2D_FIT_SIZES.length, pages, threshold };
}

async function waitTutorState(page, expect) {
  try {
    await page.waitForFunction(
      (expect) => {
        if (Math.abs(window.innerWidth - expect.width) > 2 || Math.abs(window.innerHeight - expect.height) > 2) return false;
        const scenes = window.__nanoGPTGame?.scene?.getScenes?.(true) || [];
        const idle = scenes.length > 0 && scenes.every((scene) => (scene.tweens?.getTweens?.() || []).length === 0);
        if (!idle || window.__nanoGPTBannerSettled !== true) return false;
        const alpha = window.__nanoGPTPurposeAlpha?.();
        if (alpha != null && alpha < 0.98) return false;
        const fit = window.__nanoGPTReadLive2dFit?.();
        const layout = window.__nanoGPTAssertLayout?.();
        if (!fit?.ready || !fit.ok || !layout?.ok) return false;
        if (Boolean(fit.hidden) !== Boolean(expect.hidden)) return false;
        if (!expect.hidden && !(fit.ratio >= 0.88 && fit.ratio <= 0.92)) return false;
        if (expect.hidden && !fit.fullWidth) return false;
        if (expect.hidden && !(Math.abs((fit.leftGap ?? 0) - (fit.rightGap ?? 0)) <= 2)) return false;
        if (expect.hidden && fit.uniform !== true) return false;
        return true;
      },
      expect,
      { timeout: 20000 },
    );
  } catch (err) {
    const snap = await page.evaluate(() => ({
      gate: window.__nanoGPTTutorGate?.(),
      fit: window.__nanoGPTReadLive2dFit?.(),
      layout: window.__nanoGPTAssertLayout?.(),
    }));
    await page.screenshot({ path: `${OUT}/live2d-threshold-fail.png` });
    throw new Error(`tutor threshold ${JSON.stringify(expect)} ${JSON.stringify(snap)} ${err.message}`);
  }
}

/** Resize across the hide cutoff in both directions, including the slack band. */
async function assertTutorThreshold(page, shotDir) {
  await page.evaluate(() => window.__nanoGPTSetLang("ja"));
  await page.evaluate(() => window.__nanoGPTJump("Level1", 0, 0));
  await page.setViewportSize({ width: 1800, height: 1080 });
  await waitTutorState(page, { width: 1800, height: 1080, hidden: false });
  const plan = await page.evaluate(() => {
    const gate = window.__nanoGPTTutorGate();
    const budget = (vw) => vw - Math.min(1160, vw - 334);
    const needed = gate.neededReserve;
    const floor = gate.showFloor ?? 0;
    const slack = gate.slack;
    let above = null;
    for (let vw = 1081; vw <= 2600; vw += 1) {
      if (budget(vw) - needed >= 0) {
        above = vw;
        break;
      }
    }
    let below = null;
    if (above) {
      for (let vw = above - 1; vw >= 1081; vw -= 1) {
        if (budget(vw) - needed < floor) {
          below = vw;
          break;
        }
      }
    }
    let mid = null;
    let reshow = null;
    for (let vw = (above || 1081) + 1; vw <= 2600; vw += 1) {
      const spare = budget(vw) - needed;
      if (mid == null && spare >= 16 && spare < slack) mid = vw;
      if (reshow == null && spare >= slack) reshow = vw;
      if (mid && reshow) break;
    }
    return {
      above,
      below,
      mid,
      reshow,
      needed,
      slack,
      floor,
      aspect: gate.aspect,
      spareAbove: above == null ? null : budget(above) - needed,
      spareBelow: below == null ? null : budget(below) - needed,
      spareMid: mid == null ? null : budget(mid) - needed,
      spareReshow: reshow == null ? null : budget(reshow) - needed,
    };
  });
  if (!plan.above || !plan.below || !plan.mid || !plan.reshow || plan.below <= 1080 || plan.above <= 1080) {
    throw new Error(`threshold plan unusable ${JSON.stringify(plan)}`);
  }
  console.log(`live2d threshold plan ${JSON.stringify(plan)}`);

  await page.setViewportSize({ width: plan.above, height: 1080 });
  await waitTutorState(page, { width: plan.above, height: 1080, hidden: false });
  await page.screenshot({ path: `${shotDir}/threshold-above-${plan.above}x1080.png` });

  await page.setViewportSize({ width: plan.below, height: 1080 });
  await waitTutorState(page, { width: plan.below, height: 1080, hidden: true });
  await assertHiddenBackdrop(page);
  await page.screenshot({ path: `${shotDir}/threshold-below-${plan.below}x1080.png` });

  await page.setViewportSize({ width: plan.mid, height: 1080 });
  await waitTutorState(page, { width: plan.mid, height: 1080, hidden: true });
  await assertHiddenBackdrop(page);

  await page.setViewportSize({ width: plan.reshow, height: 1080 });
  await waitTutorState(page, { width: plan.reshow, height: 1080, hidden: false });

  await page.setViewportSize({ width: plan.mid, height: 1080 });
  await waitTutorState(page, { width: plan.mid, height: 1080, hidden: false });

  await page.setViewportSize({ width: plan.below, height: 1080 });
  await waitTutorState(page, { width: plan.below, height: 1080, hidden: true });
  await assertHiddenBackdrop(page);

  return plan;
}

function decodePng(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a png");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported png depth=${bitDepth} color=${colorType} interlace=${interlace}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(width * height * 4);
  let src = 0;
  const prior = Buffer.alloc(stride);
  const scan = Buffer.alloc(stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src];
    src += 1;
    for (let i = 0; i < stride; i += 1) {
      const x = raw[src + i];
      const left = i >= channels ? scan[i - channels] : 0;
      const up = prior[i];
      const ul = i >= channels ? prior[i - channels] : 0;
      let value = x;
      if (filter === 1) value = (x + left) & 255;
      else if (filter === 2) value = (x + up) & 255;
      else if (filter === 3) value = (x + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (x + paeth(left, up, ul)) & 255;
      else if (filter !== 0) throw new Error(`bad png filter ${filter}`);
      scan[i] = value;
    }
    src += stride;
    for (let x = 0; x < width; x += 1) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      out[d] = scan[s];
      out[d + 1] = scan[s + 1];
      out[d + 2] = scan[s + 2];
      out[d + 3] = channels === 4 ? scan[s + 3] : 255;
    }
    scan.copy(prior);
  }
  return { width, height, data: out };
}

function skyAt(y, height) {
  const t = height <= 1 ? 0 : y / (height - 1);
  return [
    Math.round(0xf6 + (0xea - 0xf6) * t),
    Math.round(0xef + (0xd6 - 0xef) * t),
    Math.round(0xe4 + (0xc4 - 0xe4) * t),
  ];
}

function maxChannelDelta(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function readPx(img, x, y) {
  const cx = Math.max(0, Math.min(img.width - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(img.height - 1, Math.round(y)));
  const i = (cy * img.width + cx) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

/** Hidden tutor: equal side gaps, no dock, and the gaps match the lesson sky. */
async function assertHiddenBackdrop(page) {
  const frame = await page.evaluate(() => {
    const shell = document.getElementById("game-shell")?.getBoundingClientRect();
    const dock = document.getElementById("tutor-dock");
    const style = dock ? getComputedStyle(dock) : null;
    const rect = dock?.getBoundingClientRect();
    const bg = getComputedStyle(document.getElementById("app-layout")).backgroundImage || "";
    return {
      left: shell?.left ?? 0,
      right: shell?.right ?? 0,
      vw: window.innerWidth,
      vh: window.innerHeight,
      dockHidden: Boolean(dock?.hidden),
      dockDisplay: style?.display || "",
      dockW: rect?.width ?? 0,
      bg,
    };
  });
  const leftGap = frame.left;
  const rightGap = frame.vw - frame.right;
  const gapDelta = Math.abs(leftGap - rightGap);
  if (gapDelta > 2) throw new Error(`lesson not centered left=${leftGap.toFixed(2)} right=${rightGap.toFixed(2)}`);
  if (!frame.dockHidden || frame.dockDisplay !== "none" || frame.dockW > 1) {
    throw new Error(`leftover panel ${JSON.stringify(frame)}`);
  }
  if (!/linear-gradient/i.test(frame.bg) || !/246,\s*239,\s*228/.test(frame.bg) || !/234,\s*214,\s*196/.test(frame.bg)) {
    throw new Error(`backdrop strip ${frame.bg}`);
  }
  const png = decodePng(await page.screenshot({ scale: "css" }));
  if (Math.abs(png.width - frame.vw) > 2 || Math.abs(png.height - frame.vh) > 2) {
    throw new Error(`screenshot scale ${png.width}x${png.height} vs ${frame.vw}x${frame.vh}`);
  }
  const ys = [12, Math.round(frame.vh * 0.42), Math.round(frame.vh * 0.72), frame.vh - 20];
  let lessonMatches = 0;
  for (const y of ys) {
    const expect = skyAt(y, frame.vh);
    const gapX = leftGap > 10 ? leftGap / 2 : frame.left + 8;
    const gap = readPx(png, gapX, y);
    if (leftGap > 10) {
      const right = readPx(png, frame.vw - rightGap / 2, y);
      if (maxChannelDelta(gap, right) > 2) {
        throw new Error(`gap tint y=${y} left=${gap.join(",")} right=${right.join(",")}`);
      }
      if (maxChannelDelta(gap, expect) > 8) {
        throw new Error(`gap not sky y=${y} px=${gap.join(",")} expect=${expect.join(",")}`);
      }
    }
    const x0 = Math.round(frame.left + 4);
    const x1 = Math.round(Math.min(frame.right - 4, frame.left + 56));
    for (let x = x0; x <= x1; x += 4) {
      const px = readPx(png, x, y);
      if (maxChannelDelta(px, gap) <= 12 && maxChannelDelta(px, expect) <= 12) {
        lessonMatches += 1;
        break;
      }
    }
  }
  if (lessonMatches < 2) {
    throw new Error(`lesson backdrop does not match the side gaps matches=${lessonMatches}/${ys.length}`);
  }
}

const nanoRun = async () => {
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

const pc1024 = await runViewport(
  "pc1024",
  {
    viewport: { width: 1024, height: 640 },
    deviceScaleFactor: 2,
  },
  { allPhases: false },
);

const live2dFit = await assertLive2dPanel(browser);
const home = await assertHomeHub(browser);
return { mobile, pc, pc1024, live2dFit, home };
};

function homeShot(lang, width, height) {
  return `${OUT}/home/home-${lang}-${width}x${height}.png`;
}

function lessonShot(lang, width, height) {
  return `${OUT}/home/lesson-${lang}-${width}x${height}.png`;
}

function home2Shot(name) {
  return `${OUT}/home2/${name}.png`;
}

const HOME3_SHOTS = new Set([
  "zh-1440x900",
  "ja-1440x900",
  "zh-1920x1080",
  "ja-1920x1080",
  "zh-1024x640",
  "ja-390x844",
]);

function home3Shot(lang, width, height) {
  return `${OUT}/home3/home-${lang}-${width}x${height}.png`;
}

async function assertJaBunsetsu(page) {
  const rows = await page.evaluate(() => {
    const scene = (window.__nanoGPTGame?.scene?.getScenes?.(true) || []).find((item) => item.sys.settings.key === "Home");
    const found = [];
    const walk = (obj) => {
      if (!obj) return;
      if (obj.type === "Text") {
        const role = obj.getData?.("hubRole") || "";
        if (role === "title" || role === "sub" || role === "card-title" || role === "card-desc") {
          found.push({
            role,
            id: obj.getData?.("cardId") || "",
            source: String(obj.getData?.("source") || ""),
            text: String(obj.text || ""),
          });
        }
      }
      (obj.list || []).forEach(walk);
    };
    (scene?.children?.list || []).forEach(walk);
    return found;
  });
  const rag = rows.find((row) => row.id === "rag" && row.role === "card-title");
  if (!rag?.source.includes("うけつけで")) throw new Error(`rag title missing ${JSON.stringify(rows)}`);
  const lines = rag.text.split("\n").map((line) => line.replace(/\s+/g, ""));
  if (lines.join("") !== "うけつけで聞く") throw new Error(`rag title text ${JSON.stringify(rag)}`);
  const phraseEnd = [..."うけつけで"].length;
  let pos = 0;
  for (let i = 0; i < lines.length - 1; i += 1) {
    pos += [...lines[i]].length;
    if (pos < phraseEnd) throw new Error(`bunsetsu split うけつけで ${JSON.stringify(rag)}`);
  }
}

async function waitHome(page, mobile) {
  await page.waitForFunction(
    () => window.__nanoGPTState?.().scene === "Home" && typeof window.__nanoGPTAssertLayout === "function",
    { timeout: 20000 },
  );
  if (!mobile) {
    await page.waitForFunction(() => {
      const hidden = document.documentElement.dataset.tutor === "hidden";
      const fitted = document.getElementById("tutor-canvas")?.dataset.fitted === "1";
      return hidden || fitted;
    }, { timeout: 30000 });
  }
  await page.waitForTimeout(mobile ? 250 : 500);
}

async function clickHubCard(page, id) {
  const box = await page.evaluate((cardId) => {
    const cards = window.__nanoGPTHubCards?.() || [];
    return cards.find((card) => card.id === cardId) || null;
  }, id);
  if (!box) throw new Error(`missing hub card ${id}`);
  await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
  return box;
}

async function assertHomeViewport(page, label, lang, mobile) {
  await waitHome(page, mobile);
  const layout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  const viewNow = page.viewportSize();
  await page.screenshot({ path: homeShot(lang, viewNow.width, viewNow.height) });
  if ((viewNow.width === 1440 && viewNow.height === 900) || (viewNow.width === 390 && viewNow.height === 844)) {
    mkdirSync(`${OUT}/rag`, { recursive: true });
    await page.screenshot({ path: `${OUT}/rag/home-${lang}-${viewNow.width}x${viewNow.height}.png` });
  }
  if ((viewNow.width === 1440 && viewNow.height === 900) || (viewNow.width === 1920 && viewNow.height === 1080)) {
    await page.screenshot({ path: home2Shot(`home-${lang}-${viewNow.width}x${viewNow.height}`) });
  }
  if (HOME3_SHOTS.has(`${lang}-${viewNow.width}x${viewNow.height}`)) {
    await page.screenshot({ path: home3Shot(lang, viewNow.width, viewNow.height) });
  }
  if (!mobile && viewNow.height >= 900) {
    const cardH = await page.evaluate(() => {
      const cards = window.__nanoGPTHubCards?.() || [];
      return Math.max(0, ...cards.map((card) => card.h || 0));
    });
    if (cardH < 280) throw new Error(`home cards stayed short ${lang} ${label} h=${cardH}`);
  }
  if (!layout?.ok) {
    await page.screenshot({ path: `${OUT}/home-${label}-${lang}.png` });
  }
  if (!layout?.ok) {
    throw new Error(`home layout ${lang} ${label} ${JSON.stringify({ overlaps: layout?.overlaps, overflows: layout?.overflows, orphans: layout?.orphans })}`);
  }
  const copy = await page.evaluate(() => window.__nanoGPTHubCopy?.() || {});
  const cards = await page.evaluate(() => window.__nanoGPTHubCards?.() || []);
  if (cards.length < 3) throw new Error(`home cards ${cards.length}`);
  const rag = cards.find((card) => card.id === "rag");
  const nano = cards.find((card) => card.id === "nanogpt");
  const embedCard = cards.find((card) => card.id === "embed");
  if (!rag?.enabled) throw new Error(`rag card ${JSON.stringify(rag)}`);
  if (!nano?.enabled) throw new Error(`nanogpt card ${JSON.stringify(nano)}`);
  if (!embedCard?.enabled) throw new Error(`embed card ${JSON.stringify(embedCard)}`);
  if (lang === "ja") {
    if (copy.soon !== "準備中" || copy.home !== "ホーム") throw new Error(`ja home copy ${JSON.stringify(copy)}`);
    await assertJaBunsetsu(page);
  } else if (copy.soon !== "准备中" || copy.home !== "首页") {
    throw new Error(`zh home copy ${JSON.stringify(copy)}`);
  }
  if (mobile && layout.live2dOn) throw new Error("live2d on mobile home");
  await page.evaluate(() => {
    window.__nanoGPTHubLast = "";
  });
  await clickHubCard(page, "rag");
  await page.waitForFunction(
    () => window.__nanoGPTState?.().scene === "RagTitle" && window.__nanoGPTState?.().pageId === "rtitle",
    { timeout: 15000 },
  );
  const ragGuide = await page.evaluate(() => document.getElementById("guide-overlay")?.hidden === false);
  if (ragGuide) {
    await page.click("#guide-close");
    await page.waitForFunction(() => document.getElementById("guide-overlay")?.hidden === true);
  }
  const ragLayout = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!ragLayout?.ok) {
    throw new Error(`rag title ${lang} ${label} ${JSON.stringify({ overlaps: ragLayout?.overlaps, overflows: ragLayout?.overflows, orphans: ragLayout?.orphans })}`);
  }
  await page.click("#home-toggle");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Home", { timeout: 15000 });
  await waitHome(page, mobile);
  await clickHubCard(page, "nanogpt");
  await page.waitForFunction(
    () => window.__nanoGPTState?.().scene === "Title" && window.__nanoGPTState?.().pageId === "title",
    { timeout: 15000 },
  );
  const homeBtn = await page.evaluate((expected) => {
    const btn = document.getElementById("home-toggle");
    const rect = btn?.getBoundingClientRect();
    return {
      text: btn?.textContent || "",
      hidden: Boolean(btn?.hidden),
      w: rect?.width || 0,
      expected,
    };
  }, copy.home);
  if (homeBtn.hidden || homeBtn.w < 8 || homeBtn.text !== homeBtn.expected) {
    throw new Error(`home button ${JSON.stringify(homeBtn)}`);
  }
  const view = page.viewportSize();
  if ((mobile && view.width === 390) || (!mobile && view.width === 1440 && view.height === 900)) {
    await page.screenshot({ path: lessonShot(lang, view.width, view.height) });
    await page.screenshot({ path: home2Shot(`lesson-${lang}-${view.width}x${view.height}`) });
  }
  if (lang === "ja" && ((mobile && view.width === 390) || (view.width === 1440 && view.height === 900))) {
    await page.evaluate(() => window.__nanoGPTJump("Level3", 4, 2));
    await page.waitForFunction(() => window.__nanoGPTState?.().pageId === "c3-p4", null, { timeout: 15000 });
    await page.waitForTimeout(450);
    const mid = await page.evaluate(() => window.__nanoGPTAssertLayout());
    if (!mid?.ok) {
      throw new Error(`caption page ${JSON.stringify({ overlaps: mid?.overlaps, overflows: mid?.overflows })}`);
    }
    await page.screenshot({ path: home2Shot(`lesson-ja-${view.width}x${view.height}-caption`) });
  }
  await page.click("#home-toggle");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Home", { timeout: 15000 });
  console.log(`ok home ${lang} ${label}`);
}

async function assertHomeLang(page) {
  await page.evaluate(() => window.__nanoGPTSetLang("zh"));
  await waitHome(page, true);
  await page.click("#lang-toggle");
  await page.waitForFunction(
    () => document.documentElement.lang === "ja" && localStorage.getItem("nanogpt-lang") === "ja" && window.__nanoGPTHubCopy?.().soon === "準備中",
    { timeout: 15000 },
  );
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Home", { timeout: 15000 });
  await clickHubCard(page, "nanogpt");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Title" && document.documentElement.lang === "ja", { timeout: 15000 });
  const stored = await page.evaluate(() => localStorage.getItem("nanogpt-lang"));
  if (stored !== "ja") throw new Error(`lang dropped in tutorial ${stored}`);
  await page.click("#home-toggle");
  await page.waitForFunction(
    () => window.__nanoGPTState?.().scene === "Home"
      && document.documentElement.lang === "ja"
      && window.__nanoGPTHubCopy?.().home === "ホーム"
      && !location.hash
      && !sessionStorage.getItem("nanogpt-lesson"),
    { timeout: 15000 },
  );
  await page.evaluate(() => localStorage.setItem("nanogpt-lang", "ja"));
  const langErrors = [];
  page.on("pageerror", (err) => langErrors.push(String(err?.message || err)));
  await page.reload({ waitUntil: "load" });
  try {
    await page.waitForFunction(
      () => window.__nanoGPTState?.().scene === "Home" && localStorage.getItem("nanogpt-lang") === "ja" && document.documentElement.lang === "ja",
      null,
      { timeout: 45000 },
    );
  } catch (err) {
    const state = await page.evaluate(() => ({
      href: location.href,
      scene: window.__nanoGPTState?.()?.scene || "",
      lang: document.documentElement.lang,
      stored: localStorage.getItem("nanogpt-lang"),
      jump: typeof window.__nanoGPTJump,
      active: window.__nanoGPTGame?.scene?.getScenes?.(true)?.map((scene) => scene.sys.settings.key) || [],
    })).catch((failure) => ({ eval: String(failure) }));
    throw new Error(`home lang reload ${JSON.stringify({ state, langErrors })} ${err.message}`);
  }
}

let freshSeq = 0;

async function openFresh(page, url) {
  // A hash-only goto stays on the current document. A new query forces a full load.
  const next = new URL(url);
  next.searchParams.set("_e2e", `${Date.now()}-${freshSeq += 1}`);
  await page.goto(next.toString(), { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => typeof window.__nanoGPTJump === "function", null, { timeout: 45000 });
}

async function assertHomeDeepLinks(page) {
  await page.evaluate(() => sessionStorage.removeItem("nanogpt-lesson"));
  await openFresh(page, `${BASE}#Level2/1/2`);
  await page.waitForFunction(() => {
    const state = window.__nanoGPTState?.();
    return state?.scene === "Level2" && state.beat === 1 && state.phase === 2;
  }, null, { timeout: 30000 });
  await openFresh(page, `${BASE}?scene=Level1&beat=2&phase=1`);
  await page.waitForFunction(() => {
    const state = window.__nanoGPTState?.();
    return state?.scene === "Level1" && state.beat === 2 && state.phase === 1;
  }, null, { timeout: 30000 });
  await openFresh(page, `${BASE}#Level4/3/2`);
  await page.waitForFunction(() => {
    const state = window.__nanoGPTState?.();
    return state?.scene === "Level4" && state.beat === 3 && state.phase === 2;
  }, null, { timeout: 30000 });
  await openFresh(page, `${BASE}#Level4`);
  await page.waitForFunction(() => {
    const state = window.__nanoGPTState?.();
    return state?.scene === "Level4" && state.beat === 3 && state.phase === 2;
  }, null, { timeout: 30000 });
  await openFresh(page, BASE);
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Home", null, { timeout: 30000 });
  await page.evaluate(() => window.__nanoGPTJump("Level5", 2, 1));
  await page.waitForFunction(() => {
    const state = window.__nanoGPTState?.();
    return state?.scene === "Level5" && state.beat === 2 && state.phase === 1;
  }, null, { timeout: 15000 });
  await page.click("#home-toggle");
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Home" && !location.hash && !location.search.includes("scene="), null, { timeout: 15000 });
  console.log("ok home deeplink");
}

async function assertHomeHub(browser) {
  mkdirSync(`${OUT}/home`, { recursive: true });
  mkdirSync(`${OUT}/home2`, { recursive: true });
  mkdirSync(`${OUT}/home3`, { recursive: true });
  const sizes = [
    { label: "mobile", width: 390, height: 844, mobile: true },
    { label: "pc1024x522", width: 1024, height: 522, mobile: false },
    { label: "pc1024", width: 1024, height: 640, mobile: false },
    { label: "pc1440", width: 1440, height: 900, mobile: false },
    { label: "pc1920", width: 1920, height: 1080, mobile: false },
  ];
  for (const size of sizes) {
    for (const lang of ["zh", "ja"]) {
      const page = await browser.newPage({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: 2,
        isMobile: size.mobile,
        hasTouch: size.mobile,
        userAgent: size.mobile ? MOBILE_UA : undefined,
      });
      await page.addInitScript((next) => {
        localStorage.setItem("nanogpt-lang", next);
        localStorage.setItem("nanogpt-seen-guide", "1");
        localStorage.setItem("nanogpt-game-muted", "1");
      }, lang);
      await ready(page);
      await assertHomeViewport(page, size.label, lang, size.mobile);
      if (size.label === "pc1440" && lang === "zh") await assertHomeDeepLinks(page);
      await page.close();
    }
  }
  const langPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
  });
  await langPage.addInitScript(() => {
    localStorage.setItem("nanogpt-seen-guide", "1");
    localStorage.setItem("nanogpt-game-muted", "1");
  });
  await ready(langPage);
  await assertHomeLang(langPage);
  await langPage.close();
  console.log("ok home lang");
  console.log("HOME_OK viewports=5 locales=2");
  return { ok: true, viewports: sizes.length };
}



function rag3ShotFor(pageId, lang, width, height, phase) {
  if (phase !== 2) return "";
  const spec = RAG3_SHOTS.find((row) => row[0] === pageId && row[1] === lang && row[2] === width && row[3] === height);
  return spec ? `${OUT}/rag3/${spec[4]}` : "";
}

async function playRagSteps(page, name, first) {
  const meta = await page.evaluate(() => ({
    steps: Number(window.__nanoGPTRagSteps || 0),
    phase: window.__nanoGPTState?.().phase ?? 0,
    key: window.__nanoGPTState?.().scene || "",
  }));
  const lesson = /^(Rag|Embed)[1-5]$/.test(meta.key);
  const tally = { overlaps: 0, tiny: 0, short: 0, fill: 0, actors: 0, contrast: 0, words: 0, empty: 0, mapMiss: 0, mapLabelOverlaps: 0, mapDrift: 0, lassoOut: 0 };
  const addStage = (result) => {
    const stage = result?.stage;
    if (!stage?.active) return;
    tally.overlaps += stage.overlaps || 0;
    tally.tiny += stage.tiny || 0;
    tally.short += stage.short || 0;
    tally.fill += stage.fill || 0;
    tally.actors += stage.actors || 0;
    tally.contrast += stage.contrast || 0;
    tally.words += stage.words || 0;
    tally.empty += stage.empty || 0;
    tally.mapMiss += stage.mapMiss || 0;
    tally.mapLabelOverlaps += stage.mapLabelOverlaps || 0;
    tally.mapDrift += stage.mapDrift || 0;
    tally.lassoOut += stage.lassoOut || 0;
  };
  if (!lesson) return { end: first, mid: 0, checks: 0, failed: first?.ok ? null : first, tally };
  const doPhase = meta.phase === 2;
  let mid = doPhase ? 1 : 0;
  let checks = 1;
  let end = first;
  let failed = first?.ok ? null : first;
  addStage(first);
  for (let i = 0; i < meta.steps; i += 1) {
    await page.evaluate(() => {
      if (typeof window.__nanoGPTRagTap !== "function") throw new Error("missing rag tap");
      window.__nanoGPTRagTap();
    });
    await page.waitForFunction(() => window.__nanoGPTRagSettled === true, { timeout: 5000 });
    const isEnd = i === meta.steps - 1;
    if (!doPhase && !isEnd) continue;
    const result = await page.evaluate(() => window.__nanoGPTAssertLayout());
    checks += 1;
    if (doPhase && !isEnd) mid += 1;
    end = result;
    addStage(result);
    if (!result?.ok) {
      failed = failed || result;
      if (isEnd) await page.screenshot({ path: `${OUT}/${name}-end.png` });
    }
  }
  return { end, mid, checks, failed, tally };
}

async function jumpRag(page, key, beat, phase, name) {
  await jumpLanded(page, key, beat, phase);
  await page.waitForTimeout(280);
  await assertRagVo(page, key, beat);
  const first = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (name.startsWith("rag-mobile")) {
    const card = await page.evaluate(() => window.__nanoGPTCard || null);
    if (card?.truncated) throw new Error(`rag card truncated ${name}`);
  }
  if (!first?.ok) await page.screenshot({ path: `${OUT}/${name}.png` });
  const play = await playRagSteps(page, name, first);
  const end = play.end || first;
  const failed = play.failed;
  const pageId = end?.pageId || first?.pageId || (await page.evaluate(() => window.__nanoGPTState?.().pageId || ""));
  const shot = rag3ShotFor(pageId, name.includes("-ja-") ? "ja" : "zh", page.viewportSize().width, page.viewportSize().height, phase);
  if (shot) await page.screenshot({ path: shot });
  const result = failed ? { ...end, ok: false, overlaps: failed.overlaps || end.overlaps, overflows: failed.overflows || end.overflows } : end;
  return {
    name,
    ...result,
    stageMid: play.mid,
    stageChecks: play.checks,
    stageTally: play.tally,
    stage: end?.stage || first?.stage || null,
  };
}

async function runRagLocale(browser, label, pageOpts, lang, { allPhases }) {
  const page = await browser.newPage(pageOpts);
  await page.addInitScript((next) => {
    localStorage.setItem("nanogpt-lang", next);
    localStorage.setItem("nanogpt-seen-guide", "1");
    localStorage.setItem("nanogpt-seen-guide-rag", "1");
    localStorage.setItem("nanogpt-game-muted", "1");
  }, lang);
  await ready(page);
  await page.evaluate(() => window.__nanoGPTJump("RagTitle", 0, 0));
  await page.waitForFunction(
    () => window.__nanoGPTState?.().scene === "RagTitle" && typeof window.__nanoGPTAssertLayout === "function",
    { timeout: 20000 },
  );
  await page.waitForTimeout(300);
  await assertRagVo(page, "RagTitle", 0);
  const title = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!title?.ok) {
    await page.screenshot({ path: `${OUT}/rag-${label}-${lang}-title.png` });
    throw new Error(`rag title ${label} ${lang} ${JSON.stringify({ overlaps: title?.overlaps, overflows: title?.overflows })}`);
  }
  const spine = await page.evaluate(() => window.__nanoGPTRagSpine);
  if (spine?.l1 !== 12 || spine?.l5 !== 12 || spine?.phases !== 5) throw new Error(`rag spine ${JSON.stringify(spine)}`);
  const jobs = ragWalks(spine, { allPhases });
  const reports = [];
  for (const [key, beat, phase, name] of jobs) {
    const result = await jumpRag(page, key, beat, phase, `rag-${label}-${lang}-${name}`);
    reports.push(result);
    if (!result.ok) {
      console.error(`FAIL rag ${label} ${lang} ${name} ${JSON.stringify(result.overlaps || result.overflows || result.orphans)}`);
    } else {
      console.log(`ok rag ${label} ${lang} ${name}`);
    }
  }
  const scoring = RAG_LEVEL_PAGES.Rag3.findIndex((item) => item.id === "r3-p3");
  const threshold = RAG_LEVEL_PAGES.Rag5.findIndex((item) => item.id === "r5-p4");
  await openPseudoShot(page, "Rag3", scoring, 2, null);
  await openPseudoShot(page, "Rag5", threshold, 2, null);
  await page.click("#book-toggle");
  await page.waitForTimeout(200);
  const book = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!book?.ok) throw new Error(`rag book ${label} ${lang}`);
  await page.click("#lesson-book-close");
  await page.click("#notes-toggle");
  await page.waitForTimeout(200);
  const notes = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!notes?.ok) throw new Error(`rag notes ${label} ${lang} ${JSON.stringify(notes?.overlaps)}`);
  await page.click("#notes-close");
  if (lang === "zh") {
    await page.click("#catalog-toggle");
    await page.waitForSelector("#catalog-overlay:not([hidden])");
    const count = await page.locator("#catalog-list [data-chapter]").count();
    if (count !== 5) throw new Error(`rag chapters ${count}`);
    await page.click("[data-chapter='Rag2']");
    await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Rag2" && window.__nanoGPTState?.().beat === 0);
    await page.click("#back-toggle");
    await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Rag1" && window.__nanoGPTState?.().beat === 11);
  }
  await page.close();
  return { reports, walked: jobs.length, lang, spine };
}

async function runRagViewport(browser, label, pageOpts, { allPhases }) {
  mkdirSync(`${OUT}/rag3`, { recursive: true });
  const zh = await runRagLocale(browser, label, pageOpts, "zh", { allPhases });
  const ja = await runRagLocale(browser, label, pageOpts, "ja", { allPhases });
  const reports = [...zh.reports, ...ja.reports];
  return {
    ok: reports.every((item) => item.ok),
    walked: zh.walked + ja.walked,
    reports,
  };
}

const ragRun = async () => {
const browser = await chromium.launch(launchOptions);
const ragMobile = await runRagViewport(
  browser,
  "mobile",
  {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
  },
  { allPhases: true },
);
const ragPc = await runRagViewport(
  browser,
  "pc",
  { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  { allPhases: false },
);
const ragPc1024 = await runRagViewport(
  browser,
  "pc1024",
  { viewport: { width: 1024, height: 640 }, deviceScaleFactor: 2 },
  { allPhases: false },
);

await saveRag5Shots(browser);
await saveRag6Shots(browser);
await browser.close();
return { ragMobile, ragPc, ragPc1024 };
};

async function shootRag5(page, key, beat, phase, taps, file) {
  await jumpLanded(page, key, beat, phase);
  await page.waitForTimeout(240);
  for (let i = 0; i < taps; i += 1) {
    await page.evaluate(() => window.__nanoGPTRagTap());
    await page.waitForFunction(() => window.__nanoGPTRagSettled === true, { timeout: 5000 });
  }
  await page.screenshot({ path: file });
  const probe = await page.evaluate(() => window.__nanoGPTStage || null);
  console.log(`shot ${file} stage=${JSON.stringify(probe)}`);
}

async function saveRag5Shots(browser) {
  const dir = `${OUT}/rag5`;
  mkdirSync(dir, { recursive: true });
  const beatOf = (key, id) => RAG_LEVEL_PAGES[key].findIndex((item) => item.id === id);
  const open = async (width, height, lang, mobile = false) => {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile ? MOBILE_UA : undefined,
    });
    await page.addInitScript((next) => {
      localStorage.setItem("nanogpt-lang", next);
      localStorage.setItem("nanogpt-seen-guide", "1");
      localStorage.setItem("nanogpt-seen-guide-rag", "1");
      localStorage.setItem("nanogpt-game-muted", "1");
    }, lang);
    await ready(page);
    return page;
  };
  const jaPc = await open(1440, 900, "ja");
  const take = beatOf("Rag5", "r5-p2");
  await shootRag5(jaPc, "Rag5", take, 2, 1, `${dir}/r5-ch5-take-ja-1440-tap1.png`);
  await shootRag5(jaPc, "Rag5", take, 2, 2, `${dir}/r5-ch5-take-ja-1440-tap2.png`);
  await shootRag5(jaPc, "Rag5", take, 2, 3, `${dir}/r5-ch5-take-ja-1440-tap3.png`);
  const ch1 = beatOf("Rag1", "r1-p9");
  await shootRag5(jaPc, "Rag1", ch1, 2, 0, `${dir}/r5-ch1-do-ja-1440.png`);
  await jaPc.close();
  const zhPc = await open(1440, 900, "zh");
  const fill = beatOf("Rag4", "r4-p6");
  await shootRag5(zhPc, "Rag4", fill, 2, 0, `${dir}/r5-ch4-fill-zh-1440-blank.png`);
  await shootRag5(zhPc, "Rag4", fill, 2, 1, `${dir}/r5-ch4-fill-zh-1440-filled.png`);
  await shootRag5(zhPc, "Rag3", beatOf("Rag3", "r3-p3"), 2, 1, `${dir}/r5-ch3-score-zh-1440.png`);
  await shootRag5(zhPc, "Rag5", beatOf("Rag5", "r5-p4"), 2, 1, `${dir}/r5-ch5-threshold-zh-1440.png`);
  await zhPc.close();
  const zhShort = await open(1024, 640, "zh");
  await shootRag5(zhShort, "Rag1", ch1, 2, 0, `${dir}/r5-ch1-do-zh-1024.png`);
  await zhShort.close();
  const jaPhone = await open(390, 844, "ja", true);
  await shootRag5(jaPhone, "Rag1", ch1, 2, 0, `${dir}/r5-ch1-do-ja-390.png`);
  await jaPhone.close();
}



async function saveRag6Shots(browser) {
  const dir = `${OUT}/rag6`;
  mkdirSync(dir, { recursive: true });
  const beatOf = (key, id) => RAG_LEVEL_PAGES[key].findIndex((item) => item.id === id);
  const open = async (width, height, lang, mobile = false) => {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile ? MOBILE_UA : undefined,
    });
    await page.addInitScript((next) => {
      localStorage.setItem("nanogpt-lang", next);
      localStorage.setItem("nanogpt-seen-guide", "1");
      localStorage.setItem("nanogpt-seen-guide-rag", "1");
      localStorage.setItem("nanogpt-game-muted", "1");
    }, lang);
    await ready(page);
    return page;
  };
  const jaPc = await open(1440, 900, "ja");
  const take = beatOf("Rag5", "r5-p2");
  await shootRag5(jaPc, "Rag5", take, 2, 1, `${dir}/r6-ch5-take-ja-1440-tap1.png`);
  await shootRag5(jaPc, "Rag5", take, 2, 3, `${dir}/r6-ch5-take-ja-1440-tap3.png`);
  const fillJa = beatOf("Rag4", "r4-p6");
  await shootRag5(jaPc, "Rag4", fillJa, 2, 1, `${dir}/r6-captions-ja-1440.png`);
  await jaPc.close();
  const zhPhone = await open(390, 844, "zh", true);
  await shootRag5(zhPhone, "Rag5", take, 2, 1, `${dir}/r6-ch5-take-zh-390-tap1.png`);
  await zhPhone.close();
  const zhPc = await open(1440, 900, "zh");
  const fill = beatOf("Rag4", "r4-p6");
  await shootRag5(zhPc, "Rag4", fill, 2, 1, `${dir}/r6-ch4-fill-zh-1440-filled.png`);
  await zhPc.close();
}



function embedWalks(spine, { allPhases }) {
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
  pushLevel("Embed1", spine.l1, "E1");
  pushLevel("Embed2", spine.l2, "E2");
  pushLevel("Embed3", spine.l3, "E3");
  pushLevel("Embed4", spine.l4, "E4");
  pushLevel("Embed5", spine.l5, "E5");
  return jobs;
}

function expectedEmbedVo(lang, key, beat) {
  const pack = lang === "ja" ? EMBED_JA : EMBED_ZH;
  const nano = lang === "ja" ? JA : ZH;
  const id = key === "EmbedTitle" ? "etitle" : key === "EmbedEnd" ? "eend" : EMBED_LEVEL_PAGES[key][beat].id;
  return {
    id,
    prefix: nano.voiceBeat,
    text: present(pack[`${id}.vo`] || "").replace(/\s+/g, " ").trim(),
  };
}

async function assertEmbedVo(page, key, beat) {
  const lang = await page.evaluate(() => (document.documentElement.lang || "").toLowerCase().startsWith("ja") ? "ja" : "zh");
  const want = expectedEmbedVo(lang, key, beat);
  try {
    await page.waitForFunction((expected) => {
      const line = String(document.getElementById("voice-line")?.textContent || "").replace(/\s+/g, " ").trim();
      const narr = window.__nanoGPTNarration?.() || {};
      const narrText = String(narr.text || "").replace(/\s+/g, " ").trim();
      const pageId = window.__nanoGPTState?.().pageId || "";
      const body = line.startsWith(expected.prefix) ? line.slice(expected.prefix.length).trim() : "";
      const source = narr.source === "clip" || narr.source === "speech";
      return pageId === expected.id && narr.id === expected.id && source && body === expected.text && narrText === expected.text;
    }, want, { timeout: 4000 });
  } catch {
    const got = await page.evaluate(() => ({
      line: document.getElementById("voice-line")?.textContent || "",
      narr: window.__nanoGPTNarration?.() || {},
      pageId: window.__nanoGPTState?.().pageId || "",
    }));
    throw new Error(`embed vo mismatch ${key} b${beat} want=${JSON.stringify(want)} got=${JSON.stringify(got)}`);
  }
}

async function jumpEmbed(page, key, beat, phase, name) {
  await jumpLanded(page, key, beat, phase);
  await page.waitForTimeout(280);
  await assertEmbedVo(page, key, beat);
  const first = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!first?.ok) await page.screenshot({ path: `${OUT}/${name}.png` });
  const play = await playRagSteps(page, name, first);
  const end = play.end || first;
  const failed = play.failed;
  const result = failed ? { ...end, ok: false, overlaps: failed.overlaps || end.overlaps, overflows: failed.overflows || end.overflows } : end;
  return {
    name,
    ...result,
    stageMid: play.mid,
    stageChecks: play.checks,
    stageTally: play.tally,
    stage: end?.stage || first?.stage || null,
  };
}

async function runEmbedLocale(browser, label, pageOpts, lang, { allPhases }) {
  const page = await browser.newPage(pageOpts);
  await page.addInitScript((next) => {
    localStorage.setItem("nanogpt-lang", next);
    localStorage.setItem("nanogpt-seen-guide", "1");
    localStorage.setItem("nanogpt-seen-guide-rag", "1");
    localStorage.setItem("nanogpt-seen-guide-embed", "1");
    localStorage.setItem("nanogpt-game-muted", "1");
  }, lang);
  await ready(page);
  await page.evaluate(() => window.__nanoGPTJump("EmbedTitle", 0, 0));
  await page.waitForFunction(
    () => window.__nanoGPTState?.().scene === "EmbedTitle" && typeof window.__nanoGPTAssertLayout === "function",
    { timeout: 20000 },
  );
  await page.waitForTimeout(300);
  await assertEmbedVo(page, "EmbedTitle", 0);
  const title = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!title?.ok) {
    await page.screenshot({ path: `${OUT}/embed-${label}-${lang}-title.png` });
    throw new Error(`embed title ${label} ${lang} ${JSON.stringify({ overlaps: title?.overlaps, overflows: title?.overflows })}`);
  }
  const spine = await page.evaluate(() => window.__nanoGPTEmbedSpine);
  if (spine?.l1 !== 8 || spine?.l5 !== 8 || spine?.phases !== 5) throw new Error(`embed spine ${JSON.stringify(spine)}`);
  const jobs = embedWalks(spine, { allPhases });
  const reports = [];
  for (const [key, beat, phase, name] of jobs) {
    const result = await jumpEmbed(page, key, beat, phase, `embed-${label}-${lang}-${name}`);
    reports.push(result);
    if (!result.ok) {
      console.error(`FAIL embed ${label} ${lang} ${name} ${JSON.stringify(result.overlaps || result.overflows || result.orphans || result.stage)}`);
    } else {
      console.log(`ok embed ${label} ${lang} ${name}`);
    }
  }
  await page.click("#book-toggle");
  await page.waitForTimeout(200);
  const book = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!book?.ok) throw new Error(`embed book ${label} ${lang}`);
  await page.click("#lesson-book-close");
  await page.click("#notes-toggle");
  await page.waitForTimeout(200);
  const notes = await page.evaluate(() => window.__nanoGPTAssertLayout());
  if (!notes?.ok) throw new Error(`embed notes ${label} ${lang} ${JSON.stringify(notes?.overlaps)}`);
  await page.click("#notes-close");
  if (lang === "zh") {
    await page.click("#catalog-toggle");
    await page.waitForSelector("#catalog-overlay:not([hidden])");
    const count = await page.locator("#catalog-list [data-chapter]").count();
    if (count !== 5) throw new Error(`embed chapters ${count}`);
    await page.click("[data-chapter='Embed2']");
    await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Embed2" && window.__nanoGPTState?.().beat === 0);
    await page.click("#back-toggle");
    await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Embed1" && window.__nanoGPTState?.().beat === 7);
  }
  await page.close();
  return { reports, walked: jobs.length, lang, spine };
}

async function runEmbedViewport(browser, label, pageOpts, { allPhases }) {
  const zh = await runEmbedLocale(browser, label, pageOpts, "zh", { allPhases });
  const ja = await runEmbedLocale(browser, label, pageOpts, "ja", { allPhases });
  const reports = [...zh.reports, ...ja.reports];
  return {
    ok: reports.every((item) => item.ok),
    walked: zh.walked + ja.walked,
    reports,
  };
}

const embedRun = async () => {
const browser = await chromium.launch(launchOptions);
const embedMobile = await runEmbedViewport(
  browser,
  "mobile",
  {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
  },
  { allPhases: true },
);
const embedPc = await runEmbedViewport(
  browser,
  "pc",
  { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  { allPhases: false },
);
const embedPc1024 = await runEmbedViewport(
  browser,
  "pc1024",
  { viewport: { width: 1024, height: 640 }, deviceScaleFactor: 2 },
  { allPhases: false },
);

await saveEmbedShots(browser);
await saveEmb4Shots(browser);
await browser.close();
return { embedMobile, embedPc, embedPc1024 };
};

async function saveEmbedShots(browser) {
  const dir = `${OUT}/emb3`;
  mkdirSync(dir, { recursive: true });
  const beatOf = (key, id) => EMBED_LEVEL_PAGES[key].findIndex((item) => item.id === id);
  const open = async (width, height, lang, mobile = false) => {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile ? MOBILE_UA : undefined,
    });
    await page.addInitScript((next) => {
      localStorage.setItem("nanogpt-lang", next);
      localStorage.setItem("nanogpt-seen-guide", "1");
      localStorage.setItem("nanogpt-seen-guide-rag", "1");
      localStorage.setItem("nanogpt-seen-guide-embed", "1");
      localStorage.setItem("nanogpt-game-muted", "1");
    }, lang);
    await ready(page);
    return page;
  };
  const shoot = async (page, key, id, file, taps = 1) => {
    await jumpLanded(page, key, beatOf(key, id), 2);
    await page.waitForTimeout(240);
    for (let i = 0; i < taps; i += 1) {
      await page.evaluate(() => window.__nanoGPTRagTap());
      await page.waitForFunction(() => window.__nanoGPTRagSettled === true, { timeout: 5000 });
    }
    await page.screenshot({ path: `${dir}/${file}` });
    const probe = await page.evaluate(() => window.__nanoGPTStage || null);
    console.log(`shot ${file} stage=${JSON.stringify(probe)}`);
  };
  const zhPc = await open(1440, 900, "zh");
  await shoot(zhPc, "Embed1", "e1-p1", "e3-ch1-strip-zh-1440.png", 1);
  await shoot(zhPc, "Embed2", "e2-p2", "e3-ch2-podium-zh-1440.png", 1);
  await shoot(zhPc, "Embed3", "e3-p4", "e3-ch3-ruler-zh-1440.png", 1);
  await zhPc.close();
  const jaPc = await open(1440, 900, "ja");
  await shoot(jaPc, "Embed2", "e2-p1", "e3-map-ja-1440.png", 1);
  await shoot(jaPc, "Embed4", "e4-p3", "e3-ch4-lift-ja-1440.png", 1);
  await shoot(jaPc, "Embed5", "e5-p1", "e3-ch5-rank-ja-1440.png", 1);
  await jaPc.close();
  const jaPhone = await open(390, 844, "ja", true);
  await shoot(jaPhone, "Embed3", "e3-p4", "e3-ch3-ja-390.png", 1);
  await shoot(jaPhone, "Embed2", "e2-p1", "e3-map-ja-390.png", 1);
  await jaPhone.close();
}



async function saveEmb4Shots(browser) {
  const dir = `${OUT}/emb4`;
  mkdirSync(dir, { recursive: true });
  const embedBeat = (key, id) => EMBED_LEVEL_PAGES[key].findIndex((item) => item.id === id);
  const ragBeat = (key, id) => RAG_LEVEL_PAGES[key].findIndex((item) => item.id === id);
  const open = async (width, height, lang, mobile = false) => {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile,
      userAgent: mobile ? MOBILE_UA : undefined,
    });
    await page.addInitScript((next) => {
      localStorage.setItem("nanogpt-lang", next);
      localStorage.setItem("nanogpt-seen-guide", "1");
      localStorage.setItem("nanogpt-seen-guide-rag", "1");
      localStorage.setItem("nanogpt-seen-guide-embed", "1");
      localStorage.setItem("nanogpt-game-muted", "1");
    }, lang);
    await ready(page);
    return page;
  };
  const shoot = async (page, key, beat, phase, taps, file) => {
    await jumpLanded(page, key, beat, phase);
    await page.waitForTimeout(600);
    for (let i = 0; i < taps; i += 1) {
      await page.evaluate(() => window.__nanoGPTRagTap());
      await page.waitForFunction(() => window.__nanoGPTRagSettled === true, { timeout: 5000 });
    }
    await page.screenshot({ path: `${dir}/${file}` });
    const probe = await page.evaluate(() => window.__nanoGPTStage || null);
    console.log(`shot ${file} stage=${JSON.stringify(probe)}`);
  };
  const jaPhone = await open(390, 844, "ja", true);
  await shoot(jaPhone, "Embed2", embedBeat("Embed2", "e2-p1"), 2, 1, "e4-map-ja-390.png");
  await jaPhone.close();
  const zhPhone = await open(390, 844, "zh", true);
  await shoot(zhPhone, "Embed2", embedBeat("Embed2", "e2-p1"), 2, 1, "e4-map-zh-390.png");
  await zhPhone.close();
  const jaPc = await open(1440, 900, "ja");
  await shoot(jaPc, "Embed4", embedBeat("Embed4", "e4-p3"), 2, 1, "e4-ch4-lift-ja-1440.png");
  await shoot(jaPc, "Rag5", ragBeat("Rag5", "r5-p4"), 2, 0, "e4-rag-ja-ch5-threshold-1440.png");
  await shoot(jaPc, "Rag4", ragBeat("Rag4", "r4-p9"), 2, 0, "e4-rag-ja-ch4-pool-1440.png");
  await shoot(jaPc, "Embed3", embedBeat("Embed3", "e3-p5"), 2, 0, "e4-embed-ja-ch3-p5-1440.png");
  await jaPc.close();
  const zhPc = await open(1440, 900, "zh");
  await shoot(zhPc, "Rag5", ragBeat("Rag5", "r5-p4"), 2, 0, "e4-rag-zh-ch5-threshold-1440.png");
  await zhPc.close();
}



// Each course uses its own browser process so focus changes do not pause
// another course's Phaser loop. The walks run one after another by default
// (as on 5cf647a): on a loaded 8-core box the overlapped walks starved the
// nanoGPT page and timed out. E2E_PARALLEL=1 overlaps them on a big machine.
// Every assertion and final count is the same either way.
const runs = process.env.E2E_PARALLEL === "1"
  ? await Promise.all([nanoRun(), ragRun(), embedRun()])
  : [await nanoRun(), await ragRun(), await embedRun()];
const [
  { mobile, pc, pc1024, live2dFit, home },
  { ragMobile, ragPc, ragPc1024 },
  { embedMobile, embedPc, embedPc1024 },
] = runs;
await browser.close();

const summary = { mobile, pc, pc1024, speech, home, ragMobile, ragPc, ragPc1024, embedMobile, embedPc, embedPc1024 };
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));

const failed = [...mobile.reports, ...pc.reports, ...pc1024.reports].filter((r) => !r.ok);
const overlays = mobile.bookOpen.titles >= 5 && pc.bookOpen.titles >= 5 && pc1024.bookOpen.titles >= 5 && mobile.notesOpen && pc.notesOpen && pc1024.notesOpen;
const spineOk =
  mobile.spine.l1 === 11 &&
  mobile.spine.l2 === 11 &&
  mobile.spine.l3 === 9 &&
  mobile.spine.l4 === 9 &&
  mobile.spine.l5 === 9 &&
  mobile.spine.phases === 5 &&
  pc.spine.l1 === 11 &&
  pc.spine.l5 === 9;
const walkedAll = mobile.walked === 49 * 5 && pc.walked === 49 && pc1024.walked === 49;
const pseudoOk =
  tipOk(mobile.pseudoEncode, "号码") &&
  tipOk(pc.pseudoEncode, "号码") &&
  tipOk(mobile.pseudoShift, "右") &&
  tipOk(pc.pseudoShift, "右") &&
  tipOk(mobile.pseudoLoss, "扣分") &&
  tipOk(pc.pseudoLoss, "扣分") &&
  tipOk(mobile.pseudoMask, "前面") &&
  tipOk(pc.pseudoMask, "前面") &&
  tipOk(mobile.pseudoTrain, "一点点") &&
  tipOk(pc.pseudoTrain, "一点点") &&
  tipOk(mobile.pseudoSample, "接") &&
  tipOk(pc.pseudoSample, "接");
const attnOk = mobile.attnLayout?.ok && pc.attnLayout?.ok;
const trainOk = mobile.trainLayout?.ok && pc.trainLayout?.ok;
const sampleOk = mobile.sampleLayout?.ok && pc.sampleLayout?.ok;
const chromeOk = mobile.chrome.actionsRight <= mobile.chrome.width + 1 && mobile.chrome.chromeRight <= mobile.chrome.width + 1;
const flowOk = mobile.guideShown && pc.guideShown && pc1024.guideShown;
const speechOk = speech?.voiced === true && speech?.missing === true;
const live2dOk = live2dFit?.ok === true;
const homeOk = home?.ok === true;
const ragWalked =
  ragMobile.walked === 60 * 5 * 2 && ragPc.walked === 60 * 2 && ragPc1024.walked === 60 * 2;
const ragOk = ragMobile.ok && ragPc.ok && ragPc1024.ok && ragWalked;
const embedWalked =
  embedMobile.walked === 40 * 5 * 2 && embedPc.walked === 40 * 2 && embedPc1024.walked === 40 * 2;
const embedOk = embedMobile.ok && embedPc.ok && embedPc1024.ok && embedWalked;
const stageReports = [...ragMobile.reports, ...ragPc.reports, ...ragPc1024.reports];
const embedStageReports = [...embedMobile.reports, ...embedPc.reports, ...embedPc1024.reports];
const stage = stageReports.reduce(
  (sum, report) => {
    const tally = report.stageTally || {};
    sum.checks += report.stageChecks || 0;
    sum.mid += report.stageMid || 0;
    sum.overlaps += tally.overlaps || 0;
    sum.tiny += tally.tiny || 0;
    sum.short += tally.short || 0;
    sum.fill += tally.fill || 0;
    sum.actors += tally.actors || 0;
    sum.contrast += tally.contrast || 0;
    sum.words += tally.words || 0;
    sum.empty += tally.empty || 0;
    return sum;
  },
  { checks: 0, mid: 0, overlaps: 0, tiny: 0, short: 0, fill: 0, actors: 0, contrast: 0, words: 0, empty: 0 },
);
const doPages = stageReports.filter((report) => /-p2-do$/.test(report.name || "")).length;
const stageOk = stage.overlaps === 0 && stage.tiny === 0 && stage.short === 0 && stage.fill === 0 && stage.actors === 0 && stage.contrast === 0 && stage.words === 0 && stage.empty === 0 && stage.mid >= doPages && stage.checks > 0;
const embedStage = embedStageReports.reduce(
  (sum, report) => {
    const tally = report.stageTally || {};
    sum.checks += report.stageChecks || 0;
    sum.mid += report.stageMid || 0;
    sum.overlaps += tally.overlaps || 0;
    sum.tiny += tally.tiny || 0;
    sum.short += tally.short || 0;
    sum.fill += tally.fill || 0;
    sum.actors += tally.actors || 0;
    sum.contrast += tally.contrast || 0;
    sum.words += tally.words || 0;
    sum.empty += tally.empty || 0;
    sum.mapMiss += tally.mapMiss || 0;
    sum.mapLabelOverlaps += tally.mapLabelOverlaps || 0;
    sum.mapDrift += tally.mapDrift || 0;
    sum.lassoOut += tally.lassoOut || 0;
    return sum;
  },
  { checks: 0, mid: 0, overlaps: 0, tiny: 0, short: 0, fill: 0, actors: 0, contrast: 0, words: 0, empty: 0, mapMiss: 0, mapLabelOverlaps: 0, mapDrift: 0, lassoOut: 0 },
);
const embedDoPages = embedStageReports.filter((report) => /-p2-do$/.test(report.name || "")).length;
const embedStageOk = embedStage.overlaps === 0 && embedStage.tiny === 0 && embedStage.short === 0 && embedStage.fill === 0 && embedStage.actors === 0 && embedStage.contrast === 0 && embedStage.words === 0 && embedStage.empty === 0 && embedStage.mapMiss === 0 && embedStage.mapLabelOverlaps === 0 && embedStage.mapDrift === 0 && embedStage.lassoOut === 0 && embedStage.mid >= embedDoPages && embedStage.checks > 0;
const stageLine = `RAG_STAGE_${stageOk ? "OK" : "FAIL"} checks=${stage.checks} mid=${stage.mid} overlaps=${stage.overlaps} tiny=${stage.tiny} short=${stage.short} fill=${stage.fill} actors=${stage.actors} contrast=${stage.contrast} words=${stage.words} empty=${stage.empty}`;
const embedStageLine = `EMBED_STAGE_${embedStageOk ? "OK" : "FAIL"} checks=${embedStage.checks} mid=${embedStage.mid} overlaps=${embedStage.overlaps} tiny=${embedStage.tiny} short=${embedStage.short} fill=${embedStage.fill} actors=${embedStage.actors} contrast=${embedStage.contrast} words=${embedStage.words} empty=${embedStage.empty} mapMiss=${embedStage.mapMiss} mapLabelOverlaps=${embedStage.mapLabelOverlaps} mapDrift=${embedStage.mapDrift} lassoOut=${embedStage.lassoOut}`;
console.log(stageLine);
console.log(embedStageLine);
if (failed.length || !overlays || !walkedAll || !spineOk || !pseudoOk || !attnOk || !trainOk || !sampleOk || !chromeOk || !flowOk || !speechOk || !live2dOk || !homeOk || !ragOk || !stageOk || !embedOk || !embedStageOk) {
  console.error("E2E_FAIL", {
    failed: failed.map((r) => r.name),
    mobileWalked: mobile.walked,
    pcWalked: pc.walked,
    pc1024Walked: pc1024.walked,
    overlays,
    spineOk,
    pseudoOk,
    attnOk,
    trainOk,
    sampleOk,
    chromeOk,
    flowOk,
    speechOk,
    speech,
    live2dOk,
    live2dFit,
    homeOk,
    home,
    ragOk,
    ragWalked,
    stageOk,
    stage,
    embedOk,
    embedWalked,
    embedStageOk,
    embedStage,
    ragMobile: ragMobile.walked,
    ragPc: ragPc.walked,
    ragPc1024: ragPc1024.walked,
    mobileChrome: mobile.chrome,
  });
  process.exit(1);
}
console.log(`E2E_OK mobile=${mobile.walked} pc=${pc.walked} pc1024=${pc1024.walked} ragMobile=${ragMobile.walked} ragPc=${ragPc.walked} ragPc1024=${ragPc1024.walked} embedMobile=${embedMobile.walked} embedPc=${embedPc.walked} embedPc1024=${embedPc1024.walked} jaSpeech=1`);
