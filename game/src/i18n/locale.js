import { LESSON_PHASES } from "../data/lessons.js";
import { JA } from "./ja.js";
import { ZH } from "./zh.js";

export const LANG_KEY = "nanogpt-lang";
export const GUIDE_KEY = "nanogpt-seen-guide";

const PACKS = { zh: ZH, ja: JA };

let lang = "zh";

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

export function readSeenGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSeenGuide() {
  try {
    localStorage.setItem(GUIDE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function t(key) {
  if (!key) return "";
  const pack = PACKS[lang] || ZH;
  const value = pack[key];
  if (typeof value === "string" && value.length) return value;
  const fallback = ZH[key];
  return typeof fallback === "string" ? fallback : key;
}

export function L(zh, ja) {
  return lang === "ja" ? ja : zh;
}

export function resolveBeat(page) {
  if (!page?.keys) return page;
  const keys = page.keys;
  const aim = t(keys.aim);
  const bubble = t(keys.bubble);
  const local = keys.local ? t(keys.local) : "";
  const look = [t(keys.look), local].filter(Boolean).join("\n");
  const summary = t(keys.summary);
  const aside = keys.aside ? t(keys.aside) : "";
  const check = [t(keys.checkQ), t(keys.checkA)].filter(Boolean).join("\n");
  return {
    ...page,
    purpose: aim,
    caption: bubble,
    goal: bubble && bubble !== aim ? `${bubble}\n${aim}` : aim,
    why: look,
    example: t(keys.action),
    myths: [summary],
    remember: check,
    footnote: aside,
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
  return [1, 2, 3, 4, 5].map((index) => ({
    id: `Level${index}`,
    scene: `Level${index}`,
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
  return ["vocab", "encode", "decode", "split", "loss", "embed", "attention", "train", "sample"].map((id) => ({
    id,
    term: t(`note.${id}.term`),
    blurb: t(`note.${id}.blurb`),
    note: t(`note.${id}.note`),
  }));
}

initLocale();
