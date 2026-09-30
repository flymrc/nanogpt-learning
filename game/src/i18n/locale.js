import { LESSON_PHASES } from "../data/lessons.js";
import { JA } from "./ja.js";
import { ZH } from "./zh.js";
import { EMBED_JA } from "./embed/ja.js";
import { EMBED_ZH } from "./embed/zh.js";
import { RAG_JA } from "./rag/ja.js";
import { RAG_ZH } from "./rag/zh.js";

export const LANG_KEY = "nanogpt-lang";
export const GUIDE_KEY = "nanogpt-seen-guide";
export const RAG_GUIDE_KEY = "nanogpt-seen-guide-rag";
export const EMBED_GUIDE_KEY = "nanogpt-seen-guide-embed";

const PACKS = { zh: ZH, ja: JA };
const RAG_PACKS = { zh: RAG_ZH, ja: RAG_JA };
const EMBED_PACKS = { zh: EMBED_ZH, ja: EMBED_JA };

let lang = "zh";
let course = "nanogpt";

export function setCourse(next) {
  course = next === "rag" || next === "embed" ? next : "nanogpt";
  if (typeof document !== "undefined") document.documentElement.dataset.course = course;
  applyDocumentLang();
}

export function isPictureCourse() {
  return course === "rag" || course === "embed";
}

export function getCourse() {
  return course;
}

export function getLang() {
  return lang;
}

export function readStoredLang() {
  try {
    return localStorage.getItem(LANG_KEY) === "ja" ? "ja" : "zh";
  } catch {
    return "zh";
  }
}

function guideStorageKey() {
  if (getCourse() === "rag") return RAG_GUIDE_KEY;
  if (getCourse() === "embed") return EMBED_GUIDE_KEY;
  return GUIDE_KEY;
}

export function readSeenGuide() {
  try {
    return localStorage.getItem(guideStorageKey()) === "1";
  } catch {
    return false;
  }
}

export function writeSeenGuide() {
  try {
    localStorage.setItem(guideStorageKey(), "1");
  } catch {
    /* private mode */
  }
}

/** Drop parser junk and backticks so they never reach the screen or the voice. */
export function present(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/`/g, "")
    .replace(/\s*\n+---\s*$/g, "")
    .replace(/。。+/g, "。")
    .trim();
}

export function t(key) {
  if (!key) return "";
  if (getCourse() === "embed") {
    const embed = EMBED_PACKS[lang] || EMBED_ZH;
    const embedValue = embed[key];
    if (typeof embedValue === "string" && embedValue.length) return present(embedValue);
  }
  if (getCourse() === "rag") {
    const rag = RAG_PACKS[lang] || RAG_ZH;
    const ragValue = rag[key];
    if (typeof ragValue === "string" && ragValue.length) return present(ragValue);
  }
  const pack = PACKS[lang] || ZH;
  const value = pack[key];
  if (typeof value === "string" && value.length) return present(value);
  const fallback = ZH[key];
  return typeof fallback === "string" ? present(fallback) : key;
}

export function L(zh, ja) {
  return lang === "ja" ? ja : zh;
}

function ownedLine(id, suffix) {
  const key = `${id}.${suffix}`;
  const value = t(key);
  return value && value !== key ? value : "";
}

export function resolveBeat(page) {
  if (!page?.keys) return page;
  const keys = page.keys;
  const aim = t(keys.aim);
  const bubble = t(keys.bubble);
  const local = keys.local ? t(keys.local) : "";
  const talk = keys.talk ? t(keys.talk) : "";
  const talkLabel = talk ? t("talkLabel") : "";
  const look = [t(keys.look), local, talk ? `${talkLabel}\n${talk}` : ""].filter(Boolean).join("\n");
  const summary = t(keys.summary);
  const aside = keys.aside ? t(keys.aside) : "";
  const checkQ = t(keys.checkQ);
  const checkA = t(keys.checkA);
  const stars = [1, 2, 3].map((n) => ownedLine(page.id, `star${n}`)).filter(Boolean);
  const detail = ownedLine(page.id, "detail");
  const isSum = /-(sum|rev)$/.test(String(page.id || ""));
  const remember =
    isSum && stars.length
      ? stars.map((line) => `⭐ ${line}`).join("\n")
      : [checkQ, checkA].filter(Boolean).join("\n");
  return {
    ...page,
    purpose: aim,
    caption: bubble,
    goal: bubble && bubble !== aim ? `${bubble}\n${aim}` : aim,
    why: look,
    example: t(keys.action),
    myths: [summary],
    remember,
    footnote: aside,
    checkQ,
    checkA,
    stars,
    detail,
    talk,
    talkLabel,
  };
}

/** Language switch restarts the scene; resolve strings for the active locale. */
export function localizeBeat(beat) {
  return resolveBeat(beat);
}

export function speechFor(id) {
  return t(`${id}.vo`);
}

export function exampleSlot(page) {
  const slots = page?.exampleSlots;
  if (!slots) return null;
  return slots[lang] || null;
}

export function applyPhaseLabels() {
  for (let index = 0; index < LESSON_PHASES.length; index += 1) {
    const phase = LESSON_PHASES[index];
    phase.label = t(`phase.${index}.label`);
    phase.kicker = t(`phase.${index}.kicker`);
  }
}

export function applyDocumentLang() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "ja" ? "ja" : "zh-CN";
  const title = document.querySelector("title");
  if (title) title.textContent = t("appTitle");
}

export function setLang(next, { silent = false } = {}) {
  lang = next === "ja" ? "ja" : "zh";
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* private mode */
  }
  applyPhaseLabels();
  applyDocumentLang();
  if (!silent && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nanogpt-lang", { detail: { lang } }));
  }
}

export function toggleLang() {
  setLang(lang === "ja" ? "zh" : "ja");
}

export function initLocale() {
  lang = readStoredLang();
  applyPhaseLabels();
  applyDocumentLang();
}

export function guideCards() {
  return [1, 2, 3].map((index) => ({
    index,
    title: t(`guide.${index}.title`),
    body: t(`guide.${index}.body`),
  }));
}

export function chapterList() {
  const prefix = getCourse() === "rag" ? "Rag" : getCourse() === "embed" ? "Embed" : "Level";
  return [1, 2, 3, 4, 5].map((index) => ({
    id: `${prefix}${index}`,
    scene: `${prefix}${index}`,
    playable: true,
    short: t(`chapter.${index}.short`),
    title: t(`chapter.${index}.title`),
    blurb: t(`chapter.${index}.blurb`),
    shortLabel: t(`chapter.${index}.short`),
    titleLabel: t(`chapter.${index}.title`),
    blurbLabel: t(`chapter.${index}.blurb`),
    sheetLabel: t(`chapter.${index}.blurb`),
  }));
}

export function noteList() {
  const ids = getCourse() === "rag"
    ? ["memory", "ai", "rag", "finder", "writer", "card", "line"]
    : getCourse() === "embed"
      ? ["vector", "embed", "near", "angle", "ruler", "flat", "maker", "class"]
      : ["vocab", "encode", "decode", "split", "loss", "embed", "attention", "train", "sample"];
  return ids.map((id) => ({
    id,
    term: t(`note.${id}.term`),
    blurb: t(`note.${id}.blurb`),
    note: t(`note.${id}.note`),
  }));
}

initLocale();
