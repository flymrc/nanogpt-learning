/**
 * Visual E2E for mobile 390×844 and PC 1440×900.
 * Mobile walks ALL pages × ALL 5 sections. First+last only is NOT enough.
 * Intro + 9/9/7/7/7 pages + chapter summaries: 49 × 5 = 245 mobile, 49 PC.
 * Fails if any Phaser label/bar intersects the CTA.
 * Also fails on local sticker collisions: tile/chip vs caption, chip vs chip,
 * chips under the minimum size, and placeholder tiles stacked on the first chip.
 * Big-band checks alone missed that class (caption on the Second tiles, ellipsis on S).
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { present } from "../src/i18n/locale.js";
import { JA } from "../src/i18n/ja.js";
import { ZH } from "../src/i18n/zh.js";
import { pagesFor } from "../src/i18n/skeleton.js";

const LEVEL_PAGES = {
  Level1: pagesFor(1),
  Level2: pagesFor(2),
  Level3: pagesFor(3),
  Level4: pagesFor(4),
  Level5: pagesFor(5),
};

function expectedVo(lang, key, beat) {
  const pack = lang === "ja" ? JA : ZH;
  const id = key === "Title" ? "title" : LEVEL_PAGES[key][beat].id;
  return {
    id,
    prefix: pack.voiceBeat,
    text: present(pack[`${id}.vo`] || "").replace(/\s+/g, " ").trim(),
  };
}

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

const PHASE_NAMES = ["aim", "look", "do", "box", "check"];
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

async function waitTutor(page) {
  const wide = await page.evaluate(() => window.innerWidth >= 1024 && window.innerWidth > window.innerHeight);
  if (!wide) return;
  await page.waitForFunction(() => document.getElementById("tutor-canvas")?.dataset.fitted === "1", { timeout: 30000 });
  await page.waitForTimeout(900);
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
}

async function jumpAndAssert(page, key, beat, phase, name) {
  await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
  await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
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
  await page.click("#pseudo-close");
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
        await page.evaluate(([k, b, p]) => window.__nanoGPTJump(k, b, p), [key, beat, phase]);
        await page.waitForFunction(() => typeof window.__nanoGPTAssertLayout === "function", { timeout: 15000 });
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
  await page.click("#lesson-book-close");
  await page.waitForTimeout(150);
  await page.click("#notes-toggle");
  await page.waitForTimeout(250);
  const notesOpen = await page.evaluate(() => !document.getElementById("notes-overlay")?.hidden);
  await page.screenshot({ path: `${OUT}/${label}-glossary.png` });
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
  await page.waitForFunction(() => document.documentElement.lang === "ja");
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
  await page.waitForFunction(() => document.documentElement.lang === "ja");
  await page.evaluate(() => window.__nanoGPTJump("Level1", 0, 0));
  await page.waitForFunction(() => window.__nanoGPTState?.().scene === "Level1");
  await page.waitForFunction(() => {
    const hit = (window.__nanoGPTSpeechLog || []).find((entry) => entry.op === "speak");
    const note = document.getElementById("voice-note");
    const tip = note?.getAttribute("aria-label") || note?.title || "";
    const line = document.getElementById("voice-line")?.textContent || "";
    return Boolean(
      hit &&
        hit.lang === "ja-JP" &&
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
  const shotDir = "/opt/cursor/artifacts/live2d-fit2";
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
        return {
          ready: dockHidden && reserveClear,
          hidden: true,
          ok: dockHidden && reserveClear && fullWidth && lessonOk,
          fullWidth,
          lessonOk,
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
        console.log(
          `ok live2d ${lang} ${name} hidden lesson=${Math.round(sample.lessonWidth)} full=${Math.round(sample.lessonFull)} alpha=${Number(sample.purposeAlpha).toFixed(2)}`,
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
  await page.screenshot({ path: `${shotDir}/threshold-below-${plan.below}x1080.png` });

  await page.setViewportSize({ width: plan.mid, height: 1080 });
  await waitTutorState(page, { width: plan.mid, height: 1080, hidden: true });

  await page.setViewportSize({ width: plan.reshow, height: 1080 });
  await waitTutorState(page, { width: plan.reshow, height: 1080, hidden: false });

  await page.setViewportSize({ width: plan.mid, height: 1080 });
  await waitTutorState(page, { width: plan.mid, height: 1080, hidden: false });

  await page.setViewportSize({ width: plan.below, height: 1080 });
  await waitTutorState(page, { width: plan.below, height: 1080, hidden: true });

  return plan;
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

const pc1024 = await runViewport(
  "pc1024",
  {
    viewport: { width: 1024, height: 640 },
    deviceScaleFactor: 2,
  },
  { allPhases: false },
);

const live2dFit = await assertLive2dPanel(browser);

await browser.close();

const summary = { mobile, pc, pc1024, speech };
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
if (failed.length || !overlays || !walkedAll || !spineOk || !pseudoOk || !attnOk || !trainOk || !sampleOk || !chromeOk || !flowOk || !speechOk || !live2dOk) {
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
    mobileChrome: mobile.chrome,
  });
  process.exit(1);
}
console.log(`E2E_OK mobile=${mobile.walked} pc=${pc.walked} pc1024=${pc1024.walked} jaSpeech=1`);
