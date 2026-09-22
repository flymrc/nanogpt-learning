import { t } from "../i18n/locale.js";
import { isPcLayout } from "./mode.js";

const HUD_IDS = ["back-toggle", "catalog-toggle", "lang-toggle", "pseudo-toggle", "book-toggle", "notes-toggle", "mute-toggle"];

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

export function bindVoiceNote() {
  const note = document.getElementById("voice-note");
  if (!note || note.dataset.bound === "1") return;
  note.dataset.bound = "1";
  window.addEventListener("nanogpt-narration", (event) => {
    const detail = event.detail || {};
    const text = String(detail.text || "").replace(/\s+/g, " ").trim();
    if (!text) {
      note.textContent = t("voiceIdle");
      note.dataset.live = "";
      return;
    }
    const prefix = detail.kind === "pseudo" ? t("voicePseudo") : t("voiceBeat");
    note.textContent = `${prefix}${text}`;
    note.dataset.live = "1";
    note.dataset.lang = detail.lang || "";
    note.dataset.source = detail.source || "";
  });
  window.addEventListener("nanogpt-lang", () => {
    if (!note.dataset.live) note.textContent = t("voiceIdle");
  });
}
