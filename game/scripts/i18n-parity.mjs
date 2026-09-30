/**
 * Every visible string key exists in both zh and ja, nothing is empty,
 * and every skeleton page points only at keys that exist.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JA } from "../src/i18n/ja.js";
import { PAGES } from "../src/i18n/skeleton.js";
import { ZH } from "../src/i18n/zh.js";
import { EMBED_JA } from "../src/i18n/embed/ja.js";
import { EMBED_END, EMBED_PAGES, EMBED_TITLE } from "../src/i18n/embed/skeleton.js";
import { EMBED_ZH } from "../src/i18n/embed/zh.js";
import { RAG_JA } from "../src/i18n/rag/ja.js";
import { RAG_END, RAG_PAGES, RAG_TITLE } from "../src/i18n/rag/skeleton.js";
import { RAG_ZH } from "../src/i18n/rag/zh.js";
import { END_BEAT, TITLE_BEAT } from "../src/data/lessons.js";
import { checkEmbedVoFiles, checkRagVoFiles, checkVoFiles } from "./vo-check.mjs";

const BANNED = [
  "纸带",
  "号码牌",
  "错题分",
  "把握",
  "脾气",
  "旋钮",
  "书包",
  "蛋糕",
  "罚分",
  "线索牌",
  "验收卷",
  "闯关",
  "伪代码",
  "AdamW",
  "盖住",
  "紙テープ",
  "罰点",
  "気性",
];

const errors = [];

function fail(message) {
  errors.push(message);
}

const zhKeys = new Set(Object.keys(ZH));
const jaKeys = new Set(Object.keys(JA));
for (const key of zhKeys) {
  if (!jaKeys.has(key)) fail(`missing ja key ${key}`);
}
for (const key of jaKeys) {
  if (!zhKeys.has(key)) fail(`missing zh key ${key}`);
}
for (const [key, value] of Object.entries(ZH)) {
  if (typeof value !== "string" || !value.trim()) fail(`empty zh ${key}`);
}
for (const [key, value] of Object.entries(JA)) {
  if (typeof value !== "string" || !value.trim()) fail(`empty ja ${key}`);
}

const pages = [...PAGES, TITLE_BEAT, END_BEAT];
for (const page of pages) {
  for (const key of Object.values(page.keys || {})) {
    if (!zhKeys.has(key) || !jaKeys.has(key)) fail(`${page.id} references missing key ${key}`);
  }
  for (const suffix of ["does", "metaphor", "myth", "l1", "l2", "l3", "l4"]) {
    const key = `pseudo.${page.id}.${suffix}`;
    if (!zhKeys.has(key) || !jaKeys.has(key)) fail(`missing pseudo ${key}`);
  }
  if (page.exampleSlots) {
    if (!page.exampleSlots.zh || !page.exampleSlots.ja) fail(`${page.id} example slot missing a locale`);
  }
}

const counts = [1, 2, 3, 4, 5].map((chapter) => PAGES.filter((page) => page.chapter === chapter).length);
if (counts.join(",") !== "11,11,9,9,9") fail(`page counts ${counts.join(",")}`);

if (!ZH["c1-intro.local"].includes("床前明月") || !ZH["c1-intro.local"].includes("光")) {
  fail("zh chapter-1 intro local example must be 床前明月＿ → 光");
}
if (!JA["c1-intro.local"].includes("金") || JA["c1-intro.local"].includes("床前明月")) {
  fail("ja chapter-1 intro must keep its own example");
}
if (!ZH["c1-intro.look"].includes("🍎")) fail("zh intro should keep the fruit row");

const joined = `${Object.values(ZH).join("\n")}\n${Object.values(JA).join("\n")}`;
for (const word of BANNED) {
  if (joined.includes(word)) fail(`banned word ${word}`);
}
for (const token of ["65", "256", "384", "5000", "0.8"]) {
  if (!joined.includes(token)) fail(`shared number missing ${token}`);
}
if (!ZH["c5-sign"].includes("不放") || !JA["c5-sign"].includes("のせません")) {
  fail("chapter 5 must say fake text is not shown");
}
if (!ZH["c5-intro.aim"].includes("一个接一个，接得越来越长")) fail("c5 intro aim still has a script marker");
if (!JA["c5-intro.aim"].includes("一つずつ")) fail("ja c5 intro aim still has a script marker");
if (!ZH["c3-sum.summary"].includes("Q") || !ZH["c3-sum.summary"].includes("K") || !ZH["c3-sum.summary"].includes("块") || ZH["c3-sum.summary"].includes("像不像")) {
  fail("chapter 3 summary must preserve Q/K matching and weights, not character similarity");
}
if (ZH["c1-p4.checkQ"].includes("假名")) fail("zh c1-p4 must not say 假名");
for (const [key, value] of Object.entries(ZH)) {
  if (value.includes("`") || value.includes("【") || value.includes("】")) fail(`zh marker ${key}`);
  if (value.includes("\n\n---") || value.includes("。。")) fail(`zh voice junk ${key}`);
  if (key.endsWith(".myth") && /^答案[:：]/.test(value)) fail(`zh myth spoils ${key}`);
}
for (const [key, value] of Object.entries(JA)) {
  if (value.includes("`") || value.includes("【") || value.includes("】")) fail(`ja marker ${key}`);
  if (value.includes("\n\n---")) fail(`ja voice junk ${key}`);
  if (key.endsWith(".myth") && /^こたえ[:：]/.test(value)) fail(`ja myth spoils ${key}`);
}
for (const word of ["分数", "份数", "九成", "平均", "拖动", "按住", "运行", "ckpt", "旋钮", "信心", "墙上"]) {
  if (Object.values(ZH).some((value) => value.includes(word))) fail(`zh still says ${word}`);
}

function scoreSet(data) {
  const scores = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Object.prototype.hasOwnProperty.call(node, "score_x100")) scores.add(node.score_x100);
    for (const value of Object.values(node)) walk(value);
  };
  walk(data);
  return scores;
}

function checkRagPack() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const en = JSON.parse(readFileSync(join(root, "rag/demo/results.json"), "utf8"));
  const zh = JSON.parse(readFileSync(join(root, "rag/demo/results_zh.json"), "utf8"));
  const ragZh = new Set(Object.keys(RAG_ZH));
  const ragJa = new Set(Object.keys(RAG_JA));
  for (const key of ragZh) {
    if (!ragJa.has(key)) fail(`missing rag ja key ${key}`);
  }
  for (const key of ragJa) {
    if (!ragZh.has(key)) fail(`missing rag zh key ${key}`);
  }
  for (const [key, value] of Object.entries(RAG_ZH)) {
    if (typeof value !== "string" || !value.trim()) fail(`empty rag zh ${key}`);
    if (value.includes("`") || value.includes("【") || value.includes("】")) fail(`rag zh marker ${key}`);
  }
  for (const [key, value] of Object.entries(RAG_JA)) {
    if (typeof value !== "string" || !value.trim()) fail(`empty rag ja ${key}`);
    if (value.includes("`") || value.includes("【") || value.includes("】")) fail(`rag ja marker ${key}`);
  }
  const counts = [1, 2, 3, 4, 5].map((chapter) => RAG_PAGES.filter((page) => page.chapter === chapter).length);
  if (counts.join(",") !== "12,12,12,12,12") fail(`rag page counts ${counts.join(",")}`);
  const quizzes = [1, 2, 3, 4, 5].map((chapter) => RAG_PAGES.filter((page) => page.chapter === chapter && page.quiz).length);
  if (quizzes.join(",") !== "10,10,10,10,10") fail(`rag quiz counts ${quizzes.join(",")}`);
  const pages = [...RAG_PAGES, RAG_TITLE, RAG_END];
  for (const page of pages) {
    if (page.course !== "rag") fail(`${page.id} course`);
    for (const key of Object.values(page.keys || {})) {
      if (!ragZh.has(key) || !ragJa.has(key)) fail(`${page.id} references missing rag key ${key}`);
    }
    for (const suffix of ["does", "metaphor", "myth", "l1", "l2", "l3", "l4"]) {
      const key = `pseudo.${page.id}.${suffix}`;
      if (!ragZh.has(key) || !ragJa.has(key)) fail(`missing rag pseudo ${key}`);
    }
    if (page.id.startsWith("r") && page.chapter) {
      const zhPic = page.shared?.locales?.zh;
      const jaPic = page.shared?.locales?.ja;
      if (!zhPic?.kind || !jaPic?.kind) fail(`${page.id} missing locale picture`);
    }
  }
  const banned = ["随便猜", "手册里没有对得上的页", "最高分比线还低，就是手册里没有", "No page in the handbook matches"];
  const ragJoined = `${Object.values(RAG_ZH).join("\n")}\n${Object.values(RAG_JA).join("\n")}\n${JSON.stringify(RAG_PAGES)}`;
  for (const word of banned) {
    if (ragJoined.includes(word)) fail(`rag banned phrase ${word}`);
  }
  const zhIdk = "我不知道。我没找到分数过线的卡片。请问问酒店的工作人员。";
  const enIdk = "I don't know. I found no card with a score over the line. Please ask a hotel staff member.";
  if (!Object.values(RAG_ZH).join("\n").includes(zhIdk)) fail("rag zh round-5 template missing");
  if (!ragJoined.includes(enIdk)) fail("rag en round-5 template missing");
  const cite = (id, loc) => RAG_PAGES.find((page) => page.id === id)?.shared?.locales?.[loc];
  if (cite("r5-p5", "zh")?.line !== zhIdk) fail("rag zh cite is not the json template");
  if (cite("r5-p5", "ja")?.line !== enIdk) fail("rag ja cite is not the json template");
  if (cite("r3-p4", "zh")?.kind === cite("r3-p4", "ja")?.kind) fail("r3-p4 pictures must differ by locale");
  if (cite("r5-p1", "zh")?.kind === cite("r5-p1", "ja")?.kind) fail("r5-p1 pictures must differ by locale");
  const enLine = Math.round(en.settings.no_card_threshold.meaning * 100);
  const zhLine = Math.round(zh.settings.no_card_threshold.meaning * 100);
  if (cite("r5-p4", "zh")?.meaningLine !== zhLine || cite("r5-p4", "zh")?.wordLine !== 10) fail("zh threshold lines");
  if (cite("r5-p4", "ja")?.meaningLine !== enLine || cite("r5-p4", "ja")?.wordLine !== 10) fail("ja threshold lines");
  if (enLine !== 20 || zhLine !== 30) fail(`locale lines ja=${enLine} zh=${zhLine}`);
  if (en.settings.no_card_threshold.word_match !== 0.1 || en.settings.no_card_threshold.meaning !== 0.2) {
    fail("en thresholds drifted");
  }
  if (zh.settings.no_card_threshold.word_match !== 0.1 || zh.settings.no_card_threshold.meaning !== 0.3) {
    fail("zh thresholds drifted");
  }
  if (en.settings.threshold_check_en?.threshold_used_separates !== true) fail("en line does not separate");
  const jaKid = Object.values(RAG_JA).join("\n");
  if (/(?<![\d.:])30てん/.test(jaKid)) fail("ja rag still says 30てん");
  for (const needle of ["20てん", "57てん", "36てん", "19てん", "81てん", "27てん"]) {
    if (!jaKid.includes(needle)) fail(`ja rag missing ${needle}`);
  }
  const pool = cite("r4-p9", "ja");
  const poolScores = (pool?.items || []).map((item) => item.score).join(",");
  const poolJson = en.meaning.questions.find((item) => item.id === "q3_pool").top3.map((row) => row.score_x100).join(",");
  if (pool?.kind !== "bars" || poolScores !== poolJson) fail(`ja pool picture ${poolScores} != ${poolJson}`);
  const verified = spawnSync(process.env.PYTHON || (process.platform === "win32" ? "python" : "python3"), ["verify_ja_scores.py"], { cwd: join(root, "rag"), encoding: "utf8" });
  if (verified.status !== 0) fail(verified.stdout || verified.stderr || "verify_ja_scores.py");
  const allowedFor = (data) => {
    const allowed = scoreSet(data);
    allowed.add(0);
    allowed.add(Math.round(data.settings.no_card_threshold.word_match * 100));
    allowed.add(Math.round(data.settings.no_card_threshold.meaning * 100));
    allowed.add(10);
    allowed.add(30);
    allowed.add(384);
    allowed.add(12);
    for (let page = 1; page <= 13; page += 1) allowed.add(page);
    for (const value of Object.values(data.card_word_counts || {})) allowed.add(value);
    allowed.add(data.word_match?.experiment_one_big_card?.n_words);
    for (const card of Object.values(data.word_match?.card_word_shares || {})) {
      for (const value of Object.values(card)) allowed.add(value);
    }
    for (const question of Object.values(data.word_match?.question_word_shares || {})) {
      for (const value of Object.values(question)) allowed.add(value);
    }
    return allowed;
  };
  const checkNumbers = (page, loc, spec, allowed) => {
    const visit = (node, path) => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
      }
      if (!node || typeof node !== "object") return;
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === "number" && !allowed.has(value)) {
          fail(`${page.id} ${loc} ${path}.${key}=${value} is not in the demo json`);
        } else if (value && typeof value === "object") visit(value, `${path}.${key}`);
      }
    };
    visit(spec, spec.kind || "pic");
  };
  for (const page of RAG_PAGES) {
    checkNumbers(page, "zh", page.shared.locales.zh, allowedFor(zh));
    checkNumbers(page, "ja", page.shared.locales.ja, allowedFor(en));
  }
  return ragZh.size;
}

function embedPointSet(data) {
  const pts = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 30, 50, 100, 384, 45, 70, 71, 74, 80, 83]);
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.points === "number") pts.add(node.points);
    if (typeof node.score_x100 === "number") pts.add(node.score_x100);
    for (const value of Object.values(node)) walk(value);
  };
  walk(data);
  for (const matrix of Object.values(data.similarity_matrix || {})) {
    for (const row of Object.values(matrix)) {
      if (!row || typeof row !== "object") continue;
      for (const value of Object.values(row)) {
        if (typeof value === "number") pts.add(Math.round(value * 100));
      }
    }
  }
  return pts;
}

function checkEmbedPack() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const data = JSON.parse(readFileSync(join(root, "embed/demo/results.json"), "utf8"));
  const ragZh = JSON.parse(readFileSync(join(root, "rag/demo/results_zh.json"), "utf8"));
  const ragEn = JSON.parse(readFileSync(join(root, "rag/demo/results.json"), "utf8"));
  const allowed = embedPointSet(data);
  embedPointSet(ragZh).forEach((n) => allowed.add(n));
  embedPointSet(ragEn).forEach((n) => allowed.add(n));
  allowed.add(Math.round(ragEn.settings.no_card_threshold.meaning * 100));
  allowed.add(Math.round(ragZh.settings.no_card_threshold.meaning * 100));
  const embedZh = new Set(Object.keys(EMBED_ZH));
  const embedJa = new Set(Object.keys(EMBED_JA));
  for (const key of embedZh) {
    if (!embedJa.has(key)) fail(`missing embed ja key ${key}`);
  }
  for (const key of embedJa) {
    if (!embedZh.has(key)) fail(`missing embed zh key ${key}`);
  }
  for (const [key, value] of Object.entries(EMBED_ZH)) {
    if (typeof value !== "string" || !value.trim()) fail(`empty embed zh ${key}`);
    if (value.includes("`") || value.includes("【") || value.includes("】") || value.includes("→")) fail(`embed zh marker ${key}`);
    if (/\n+---\s*$/.test(value)) fail(`embed zh trailing rule ${key}`);
  }
  for (const [key, value] of Object.entries(EMBED_JA)) {
    if (typeof value !== "string" || !value.trim()) fail(`empty embed ja ${key}`);
    if (value.includes("`") || value.includes("【") || value.includes("】") || value.includes("→")) fail(`embed ja marker ${key}`);
    if (/\n+---\s*$/.test(value)) fail(`embed ja trailing rule ${key}`);
    for (const n of [45, 71, 83, 37]) {
      if (new RegExp(`(?<!\\d)${n}\\s*てん`).test(value)) fail(`embed ja old rag score ${key} ${n}`);
    }
    if (key.endsWith(".look") || key.endsWith(".talk") || key.endsWith(".vo")) {
      if (value.includes("はかりなお") || value.includes("RAG の 本の 人") || value.includes("べつの 人")) {
        fail(`embed ja remeasure ${key}`);
      }
    }
  }
  const counts = [1, 2, 3, 4, 5].map((chapter) => EMBED_PAGES.filter((page) => page.chapter === chapter).length);
  if (counts.join(",") !== "8,8,8,8,8") fail(`embed page counts ${counts.join(",")}`);
  const pages = [...EMBED_PAGES, EMBED_TITLE, EMBED_END];
  for (const page of pages) {
    if (page.course !== "embed") fail(`${page.id} course`);
    for (const key of Object.values(page.keys || {})) {
      if (!embedZh.has(key) || !embedJa.has(key)) fail(`${page.id} references missing embed key ${key}`);
    }
    if (page.chapter && page.keys && !page.keys.talk && !/-(sum|rev)$/.test(page.id) && page.kind !== "intro") {
      fail(`${page.id} missing talk key`);
    }
    if (String(page.id || "").startsWith("e")) {
      for (const suffix of ["does", "metaphor", "myth", "l1", "l2", "l3", "l4"]) {
        const key = `pseudo.${page.id}.${suffix}`;
        if (!embedZh.has(key) || !embedJa.has(key)) fail(`missing embed pseudo ${key}`);
      }
    }
  }
  const visit = (page, loc, node, path) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(page, loc, item, `${path}[${index}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "kind" || key === "mapKey" || key === "word" || key === "label" || key === "a" || key === "b" || key === "aLabel" || key === "bLabel" || key === "name" || key === "title") continue;
      if (typeof value === "number" && !allowed.has(value)) fail(`${page.id} ${loc} ${path}.${key}=${value} is not in results.json`);
      else if (value && typeof value === "object") visit(page, loc, value, `${path}.${key}`);
    }
  };
  for (const page of EMBED_PAGES) {
    visit(page, "zh", page.shared?.locales?.zh, "pic");
    visit(page, "ja", page.shared?.locales?.ja, "pic");
    if (!page.keys?.talk || !EMBED_ZH[page.keys.talk]) fail(`${page.id} talk`);
  }
  const zhPark = data.rag_link.parking_recomputed_here.zh.top3.map((row) => row.score_x100).join(",");
  const ragPark = ragZh.meaning.questions.find((item) => item.id === "q4_parking").top3.map((row) => row.score_x100).join(",");
  if (zhPark !== ragPark) fail(`embed zh parking ${zhPark} != rag ${ragPark}`);
  const enPark = data.rag_link.parking_recomputed_here.en.top3.map((row) => row.score_x100).join(",");
  const ragEnPark = ragEn.meaning.questions.find((item) => item.id === "q4_parking").top3.map((row) => row.score_x100).join(",");
  if (enPark !== ragEnPark) fail(`embed ja parking ${enPark} != rag ${ragEnPark}`);
  const jaEmbed = Object.values(EMBED_JA).join("\n");
  const enLine = Math.round(ragEn.settings.no_card_threshold.meaning * 100);
  if (!jaEmbed.includes(`RAG の 本の 線（${enLine}てん）`)) fail("embed ja missing rag line");
  if (!jaEmbed.includes("81てん") || !jaEmbed.includes("70てん") || !jaEmbed.includes("72てん")) {
    fail("embed ja missing quoted rag scores");
  }
  const enWord = data.rag_link.parking_recomputed_here?.en;
  void enWord;
  return embedZh.size;
}

const ragKeys = checkRagPack();
const embedKeys = checkEmbedPack();

for (const error of checkVoFiles()) fail(error);
for (const error of checkRagVoFiles()) fail(error);
for (const error of checkEmbedVoFiles()) fail(error);

if (errors.length) {
  console.error("I18N_FAIL");
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`I18N_OK keys=${zhKeys.size} pages=${PAGES.length} ragKeys=${ragKeys} ragPages=${RAG_PAGES.length} embedKeys=${embedKeys} embedPages=${EMBED_PAGES.length}`);
