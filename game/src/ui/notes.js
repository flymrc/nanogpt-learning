import { JA_NOTES } from "../i18n/copy.js";
import { getLang } from "../i18n/locale.js";

/** Lesson words only. Each note starts with a life picture. */
export const NOTES = [
  {
    id: "bpe",
    term: "小碎块",
    blurb: "把单词切碎的另一种办法",
    note: "有人会把一个词语切成小碎块。这一课不这么做。一个字一张号码牌。",
  },
  {
    id: "plates",
    term: "号码牌",
    blurb: "一个字，一个座位号",
    note: "每个字领一张号码牌，像学号。号码只是座位，不是这个字的脾气，也不表示它更重要。",
  },
  {
    id: "scrolls",
    term: "练习卷 / 验收卷",
    blurb: "九成学，一成抽查",
    note: "同一条纸带切开。九成是练习卷，用来学。一成是验收卷，用来抽查。验收卷不是印着答案的答题纸。练习卷的文件叫 train.bin，验收卷叫 val.bin。里面装的是号码，不是字的样子。",
  },
  {
    id: "shift",
    term: "右移一格",
    blurb: "看见这张，猜右边那张",
    note: "手里看见的牌叫 x。答案 y 把整段往右挪一格。看见这一张，就猜右边那一张。",
  },
  {
    id: "penalty",
    term: "猜错罚分",
    blurb: "真答案押得越少，分越大",
    note: "打分只问：真答案被押了多少把握？押得越少，猜错罚分越大。整段再取一个平均。这里不写假的数字。大人也叫它交叉熵。",
  },
  {
    id: "attn",
    term: "只看左边",
    blurb: "每一格回头看自己和左边",
    note: "每一格只看自己和左边，按重量把内容搬回来，再加回原来的这一格。右边不给看。大人把这件事叫做注意力。",
  },
  {
    id: "qkv",
    term: "提问 / 名牌 / 内容",
    blurb: "一格切开的三张纸条",
    note: "同一格先变成三张纸条。提问像举手问谁和我有关。名牌是被问的标记。比完才搬内容。每一张有 384 个数那么宽。",
  },
  {
    id: "mask",
    term: "盖住右边",
    blurb: "右边低到不可能",
    note: "左边和自己留下。右边的分数改成负无穷，就是低到不可能，所以分不到重量。字还在纸带上，只是这一格不准看。",
  },
  {
    id: "softmax",
    term: "分重量",
    blurb: "能看的格子加起来是 1",
    note: "先把分数除以 8，再变成加起来为 1 的重量，像一块蛋糕分完。右边是 0。这不是罚分。大人把「分成一整份」叫做 softmax。",
  },
  {
    id: "train",
    term: "开训",
    blurb: "按罚分改一笔",
    note: "从练习卷剪一批窗口，往前猜，记下猜错罚分，把错传回去。改数助手叫 AdamW，像一块橡皮，按罚分改一笔。验收卷只抽查。这里不写假的罚分。",
  },
  {
    id: "sample",
    term: "往后续字",
    blurb: "从开头接新格子",
    note: "读存档，从换行或你给的开头，一格一格把新号码接到纸带后面。默认温度 0.8，就是少乱跳一点。字只有 65 个，所以说留前 200 名，其实一个也不丢。不改数，也不打正确率。这里没有编出来的台词。大人把这一步叫做采样。",
  },
];

let mounted = false;
let openId = "";

function noteEntries() {
  if (getLang() !== "ja") return NOTES;
  return NOTES.map((item) => ({ ...item, ...(JA_NOTES[item.id] || {}) }));
}

export function mountNotesHud() {
  const btn = document.getElementById("notes-toggle");
  const overlay = document.getElementById("notes-overlay");
  const close = document.getElementById("notes-close");
  if (!btn || !overlay || mounted) return;
  mounted = true;

  renderList();
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
    if (event.key === "Escape") closeNotes();
  });

  window.__nanoGPTOpenNote = openNote;
  window.__nanoGPTNotesOpen = () => !overlay.hidden;
  window.addEventListener("nanogpt-lang", () => {
    renderList();
    if (openId) selectNote(openId);
  });
}

export function toggleNotes(id) {
  const overlay = document.getElementById("notes-overlay");
  if (!overlay) return;
  if (overlay.hidden) openNote(id);
  else closeNotes();
}

export function openNote(id) {
  const overlay = document.getElementById("notes-overlay");
  const btn = document.getElementById("notes-toggle");
  if (!overlay) return;
  overlay.hidden = false;
  btn?.setAttribute("aria-expanded", "true");
  selectNote(id || openId || "bpe");
}

export function closeNotes() {
  const overlay = document.getElementById("notes-overlay");
  const btn = document.getElementById("notes-toggle");
  if (!overlay) return;
  overlay.hidden = true;
  btn?.setAttribute("aria-expanded", "false");
}

function renderList() {
  const list = document.getElementById("notes-list");
  if (!list) return;
  list.innerHTML = "";
  noteEntries().forEach((item) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "notes-term";
    button.dataset.note = item.id;
    button.innerHTML = `<strong>${item.term}</strong><span>${item.blurb}</span>`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectNote(item.id);
    });
    li.appendChild(button);
    list.appendChild(li);
  });
}

function selectNote(id) {
  const entries = noteEntries();
  const item = entries.find((note) => note.id === id) || entries[0];
  openId = item.id;
  const detail = document.getElementById("notes-detail");
  const title = document.getElementById("notes-detail-term");
  if (title) title.textContent = item.term;
  if (detail) detail.textContent = item.note;
  document.querySelectorAll(".notes-term").forEach((el) => {
    el.classList.toggle("is-on", el.dataset.note === item.id);
  });
}
