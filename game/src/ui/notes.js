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
    note: "手里的是线索牌，大人叫 x。答案排把整段往右挪一格，大人叫 y。看见这一张，就猜右边那一张。",
  },
  {
    id: "penalty",
    term: "猜错罚分",
    blurb: "真答案押得越少，分越大",
    note: "老师看你对真的下一个字有多确定。确定得少，错题记号就大。不是对了打勾、错了打叉。这一课不写假的数字。大人也叫它交叉熵。",
  },
  {
    id: "attn",
    term: "只看左边",
    blurb: "每一格回头看自己和左边",
    note: "每一格只看自己和左边。按蛋糕的份从书包里搬，再加回原来的这一格，不擦掉。右边不给看。一次最多看 256 格。大人把这件事叫做注意力，不是上课专心。也叫因果自注意力。一共 6 层。每一层先抹平一点，大人叫层归一化，再看左边，再加回去。",
  },
  {
    id: "qkv",
    term: "提问卡 / 标签卡 / 内容卡",
    blurb: "同一格同时做出的三张卡",
    note: "同一格同时做出三张卡。提问卡问谁和我有关。标签卡是书包上的名字。内容卡是书包里要搬的东西。大人把这一次做成三张叫做线性层。每一张有 384 个数那么宽。",
  },
  {
    id: "mask",
    term: "盖住右边",
    blurb: "左下勾，右上叉",
    note: "左下打勾，右上打叉。盖住的格子，分数写成负无穷，就是一个小到看不见的数，所以分不到蛋糕。大人也叫 is_causal，意思是只看左边。字还在纸带上。",
  },
  {
    id: "softmax",
    term: "分蛋糕",
    blurb: "能看的格子加起来是一整块",
    note: "提问卡比标签卡，看有多合得来。分数先除以 8，因为每双眼睛看的宽度是 64，8 是 64 的平方根。再变成加起来为 1 的蛋糕份。右边是 0。这不是罚分。六双眼睛，每双看 64 宽。大人把「分成一整块」叫做 softmax。",
  },
  {
    id: "train",
    term: "开训",
    blurb: "按罚分改一笔",
    note: "从练习卷一次剪几段，往前猜，记下猜错罚分，把错传回去。大人把一次剪几段叫做一批。改数助手叫 AdamW，像一块橡皮，按罚分改一笔。验收卷只抽查。这里不写假的罚分。",
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
