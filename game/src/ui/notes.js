import { noteList, t } from "../i18n/locale.js";

let mounted = false;
let openId = "";

function noteEntries() {
  return noteList();
}

export function mountNotesHud() {
  const btn = document.getElementById("notes-toggle");
  const overlay = document.getElementById("notes-overlay");
  const close = document.getElementById("notes-close");
  if (!btn || !overlay || mounted) {
    renderNotes();
    return;
  }
  mounted = true;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleNotes();
  });
  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeNotes();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeNotes();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      event.stopPropagation();
      closeNotes();
    }
  });
  window.addEventListener("nanogpt-lang", () => {
    renderNotes();
  });
  window.__nanoGPTOpenNote = openNote;
  renderNotes();
}

export function toggleNotes(id) {
  const overlay = document.getElementById("notes-overlay");
  if (!overlay) return;
  if (overlay.hidden) openNote(id);
  else closeNotes();
}

export function openNote(id) {
  const overlay = document.getElementById("notes-overlay");
  if (!overlay) return;
  openId = id || noteEntries()[0]?.id || "";
  renderNotes();
  overlay.hidden = false;
}

export function closeNotes() {
  const overlay = document.getElementById("notes-overlay");
  if (!overlay) return;
  overlay.hidden = true;
}

function renderNotes() {
  const title = document.getElementById("notes-title");
  const list = document.getElementById("notes-list");
  const term = document.getElementById("notes-detail-term");
  const detail = document.getElementById("notes-detail");
  if (title) title.textContent = t("notesTitle");
  if (!list) return;
  const notes = noteEntries();
  if (!notes.some((item) => item.id === openId)) openId = notes[0]?.id || "";
  list.innerHTML = "";
  notes.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `notes-term${item.id === openId ? " is-on" : ""}`;
    button.textContent = item.term;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openId = item.id;
      renderNotes();
    });
    list.appendChild(button);
  });
  const current = notes.find((item) => item.id === openId) || notes[0];
  if (term) term.textContent = current?.term || "";
  if (detail) detail.textContent = current ? `${current.blurb}。${current.note}` : t("notesHint");
}
