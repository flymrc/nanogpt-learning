import { t } from "../i18n/locale.js";
import { isPcLayout } from "./mode.js";
import { glueRegExp } from "./theme.js";

const HUD_IDS = ["home-toggle", "back-toggle", "catalog-toggle", "lang-toggle", "pseudo-toggle", "book-toggle", "notes-toggle", "mute-toggle"];
const LESSON_CHROME = ["back-toggle", "catalog-toggle", "pseudo-toggle", "book-toggle", "notes-toggle"];

export function applyChromeCopy() {
  const pc = isPcLayout();
  const set = (id, text, label = text) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.id === "mute-toggle") return;
    el.textContent = text;
    el.title = label;
    el.setAttribute("aria-label", label);
  };
  set("home-toggle", t("hub.home"));
  set("back-toggle", t("back"));
  set("catalog-toggle", t("catalog"));
  set("lang-toggle", pc ? t("lang") : t("langShort"), t("lang"));
  set("pseudo-toggle", pc ? t("pseudo") : t("pseudo"));
  set("book-toggle", pc ? t("book") : t("bookShort"), t("book"));
  set("notes-toggle", t("notes"));
  const bookTitle = document.getElementById("lesson-book-title");
  const bookClose = document.getElementById("lesson-book-close");
  if (bookTitle) bookTitle.textContent = t("bookTitle");
  if (bookClose) {
    bookClose.textContent = t("close");
    bookClose.setAttribute("aria-label", t("close"));
  }
  const pseudoTitle = document.getElementById("pseudo-title");
  const pseudoClose = document.getElementById("pseudo-close");
  if (pseudoClose) {
    pseudoClose.textContent = t("close");
    pseudoClose.setAttribute("aria-label", t("close"));
  }
  const does = document.getElementById("pseudo-h-does");
  const meta = document.getElementById("pseudo-h-meta");
  const code = document.getElementById("pseudo-h-code");
  const myth = document.getElementById("pseudo-h-myth");
  if (does) does.textContent = t("pseudoHDoes");
  if (meta) meta.textContent = t("pseudoHMeta");
  if (code) code.textContent = t("pseudoHCode");
  if (myth) myth.textContent = t("pseudoHMyth");
  if (pseudoTitle && !pseudoTitle.dataset.bound) pseudoTitle.textContent = t("pseudo");
  const notesTitle = document.getElementById("notes-title");
  const notesClose = document.getElementById("notes-close");
  const notesDetail = document.getElementById("notes-detail");
  if (notesTitle) notesTitle.textContent = t("notesTitle");
  if (notesClose) {
    notesClose.textContent = t("close");
    notesClose.setAttribute("aria-label", t("close"));
  }
  const splash = document.querySelector("#boot-splash .boot-label");
  if (splash) splash.textContent = t("bootSplash");
  const note = document.getElementById("voice-note");
  if (note && !note.dataset.live) note.textContent = t("voiceIdle");
  return HUD_IDS;
}

/** Lesson tools stay in the tutorial. Home keeps language and mute. */
export function syncHubChrome(sceneKey) {
  document.documentElement.dataset.scene = sceneKey === "Home" ? "home" : "lesson";
  const lesson = Boolean(sceneKey) && sceneKey !== "Home" && sceneKey !== "Boot";
  for (const id of LESSON_CHROME) {
    const el = document.getElementById(id);
    if (el) el.hidden = !lesson;
  }
  const home = document.getElementById("home-toggle");
  if (home) home.hidden = !lesson;
}

export function bindVoiceNote() {
  const note = document.getElementById("voice-note");
  if (!note || note.dataset.bound === "1") return;
  note.dataset.bound = "1";
  note.setAttribute("aria-live", "polite");
  const lineOf = () => {
    let line = note.querySelector("#voice-line");
    if (!line) {
      line = document.createElement("span");
      line.id = "voice-line";
      note.textContent = "";
      note.appendChild(line);
    }
    return line;
  };
  const reflowCaption = (line) => {
    const note = line?.parentElement;
    if (!line) return;
    const words = [...line.querySelectorAll(".voice-word")];
    const chinese = document.documentElement.lang.toLowerCase().startsWith("zh");
    for (const word of words) {
      // Chinese has no spaces between words. Keeping a whole sentence nowrap
      // can overflow when a following time token and punctuation join its line.
      // Explicit number/time units remain unbroken in both languages.
      if (word.dataset.glue !== "1") word.classList.toggle("is-breakable", chinese);
    }
    const limit = line.clientWidth || note?.clientWidth || 0;
    if (limit < 8) return;
    const lineOverflow = line.scrollWidth > limit + 1;
    const noteOverflow = Boolean(note) && note.scrollWidth > note.clientWidth + 1;
    if (!lineOverflow && !noteOverflow) return;
    for (const word of words) {
      if (word.dataset.glue === "1") continue;
      const range = document.createRange();
      range.selectNodeContents(word);
      if (range.getBoundingClientRect().width > limit - 1) word.classList.add("is-breakable");
    }
  };
  const appendPiece = (line, text, glue) => {
    if (!text) return;
    const word = document.createElement("span");
    word.className = "voice-word";
    if (glue) word.dataset.glue = "1";
    word.textContent = text;
    line.appendChild(word);
  };
  const fillLine = (line, shown) => {
    line.replaceChildren();
    const src = String(shown);
    const pieces = [];
    let last = 0;
    for (const match of src.matchAll(glueRegExp())) {
      if (match.index > last) pieces.push({ text: src.slice(last, match.index), glue: false });
      pieces.push({ text: match[0], glue: true });
      last = match.index + match[0].length;
    }
    if (last < src.length) pieces.push({ text: src.slice(last), glue: false });
    for (const piece of pieces) {
      if (piece.glue) {
        appendPiece(line, piece.text, true);
        continue;
      }
      for (const part of piece.text.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) line.appendChild(document.createTextNode(part));
        else appendPiece(line, part, false);
      }
    }
    reflowCaption(line);
  };
  window.__nanoGPTReflowCaption = () => {
    const line = document.getElementById("voice-line");
    if (line) reflowCaption(line);
  };
  window.addEventListener("resize", () => window.__nanoGPTReflowCaption?.());
  window.addEventListener("nanogpt-narration", (event) => {
    const detail = event.detail || {};
    const text = String(detail.text || "").replace(/\s+/g, " ").trim();
    const ja = String(detail.lang || "").toLowerCase().startsWith("ja");
    const line = lineOf();
    if (!text) {
      fillLine(line, t("voiceIdle"));
      note.classList.remove("is-missing");
      note.dataset.missing = "";
      note.dataset.live = "";
      note.removeAttribute("title");
      note.removeAttribute("aria-label");
      return;
    }
    const prefix = detail.kind === "pseudo" ? t("voicePseudo") : t("voiceBeat");
    const shown = `${prefix}${text}`;
    fillLine(line, shown);
    note.dataset.live = "1";
    note.dataset.lang = detail.lang || "";
    note.dataset.source = detail.source || "";
    if (detail.missingVoice && ja) {
      const tip = t("voiceMissing");
      note.title = tip;
      note.setAttribute("aria-label", `${shown} ${tip}`);
      note.dataset.missing = "1";
      note.classList.add("is-missing");
      return;
    }
    note.classList.remove("is-missing");
    note.dataset.missing = "";
    note.removeAttribute("title");
    note.removeAttribute("aria-label");
  });
  window.addEventListener("nanogpt-lang", () => {
    if (!note.dataset.live) fillLine(lineOf(), t("voiceIdle"));
  });
}
