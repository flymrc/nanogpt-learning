/**
 * Every visible string key exists in both zh and ja, nothing is empty,
 * and every skeleton page points only at keys that exist.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JA } from "../src/i18n/ja.js";
import { PAGES } from "../src/i18n/skeleton.js";
import { ZH } from "../src/i18n/zh.js";
import { RAG_JA } from "../src/i18n/rag/ja.js";
import { RAG_END, RAG_PAGES, RAG_TITLE } from "../src/i18n/rag/skeleton.js";
import { RAG_ZH } from "../src/i18n/rag/zh.js";
import { END_BEAT, TITLE_BEAT } from "../src/data/lessons.js";
import { checkRagVoFiles, checkVoFiles } from "./vo-check.mjs";

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
if (!ZH["c3-sum.summary"].includes("像不像") || !ZH["c3-sum.summary"].includes("块")) {
  fail("chapter 3 summary must say how looking back works");
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
  if (cite("r5-p4", "zh")?.meaningLine !== 30 || cite("r5-p4", "zh")?.wordLine !== 10) fail("zh threshold lines");
  if (cite("r5-p4", "ja")?.meaningLine !== 30 || cite("r5-p4", "ja")?.wordLine !== 10) fail("ja threshold lines");
  if (en.settings.no_card_threshold.word_match !== 0.1 || en.settings.no_card_threshold.meaning !== 0.3) {
    fail("en thresholds drifted");
  }
  if (zh.settings.no_card_threshold.word_match !== 0.1 || zh.settings.no_card_threshold.meaning !== 0.3) {
    fail("zh thresholds drifted");
  }
  const allowedFor = (data) => {
    const allowed = scoreSet(data);
    allowed.add(0);
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

const ragKeys = checkRagPack();

for (const error of checkVoFiles()) fail(error);
for (const error of checkRagVoFiles()) fail(error);

if (errors.length) {
  console.error("I18N_FAIL");
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`I18N_OK keys=${zhKeys.size} pages=${PAGES.length} ragKeys=${ragKeys} ragPages=${RAG_PAGES.length}`);
