import { LESSON_PHASES } from "../data/lessons.js";
import { CHAPTERS, GUIDE, JA_BEATS, PHASES, SPEECH, UI } from "./copy.js";

export const LANG_KEY = "nanogpt-lang";
export const GUIDE_KEY = "nanogpt-seen-guide";

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
  return UI[lang]?.[key] ?? UI.zh[key] ?? key;
}

export function L(zh, ja) {
  return lang === "ja" ? ja : zh;
}

export function pick(entry) {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry[lang] || entry.zh || "";
}

export function speechFor(id) {
  const row = SPEECH[id];
  if (!row) return "";
  return lang === "ja" ? row.ja : row.zh;
}

export function localizeBeat(beat) {
  if (!beat || lang !== "ja") return beat;
  const ja = JA_BEATS[beat.id];
  if (!ja) return beat;
  return { ...beat, ...ja, vo: undefined };
}

export function applyPhaseLabels() {
  const pack = PHASES[lang] || PHASES.zh;
  LESSON_PHASES.forEach((phase, index) => {
    const next = pack[index];
    if (!next) return;
    phase.label = next.label;
    phase.kicker = next.kicker;
  });
}

export function applyDocumentLang() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang === "ja" ? "ja" : "zh-CN";
  const title = document.querySelector("title");
  if (title) title.textContent = t("appTitle");
}

export function setLang(next, { silent = false } = {}) {
  const value = next === "ja" ? "ja" : "zh";
  if (value === lang && !silent) {
    /* still notify so a second click can restart if the first paint raced */
  }
  lang = value;
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
  return GUIDE.map((card, index) => ({
    index: index + 1,
    title: pick(card),
    ...(() => {
      const side = card[lang] || card.zh;
      return { title: side.title, body: side.body };
    })(),
  }));
}

export function chapterList() {
  return CHAPTERS.map((chapter) => ({
    ...chapter,
    shortLabel: pick(chapter.short),
    titleLabel: pick(chapter.title),
    blurbLabel: pick(chapter.blurb),
    sheetLabel: pick(chapter.sheet) || pick(chapter.blurb),
  }));
}

initLocale();
