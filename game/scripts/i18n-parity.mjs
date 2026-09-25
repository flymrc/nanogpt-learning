/**
 * Every visible string key exists in both zh and ja, nothing is empty,
 * and every skeleton page points only at keys that exist.
 */
import { JA } from "../src/i18n/ja.js";
import { PAGES } from "../src/i18n/skeleton.js";
import { ZH } from "../src/i18n/zh.js";
import { END_BEAT, TITLE_BEAT } from "../src/data/lessons.js";

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

if (errors.length) {
  console.error("I18N_FAIL");
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`I18N_OK keys=${zhKeys.size} pages=${PAGES.length}`);
