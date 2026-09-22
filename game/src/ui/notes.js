/** Lesson jargon only. Skip Live2D / engine terms. */
export const NOTES = [
  {
    id: "bpe",
    term: "BPE",
    blurb: "把词切成小碎块的办法",
    note: "BPE 是另一种切法：把词切成小碎块。这一课不用它。我们一个字符发一张号码牌。",
  },
  {
    id: "plates",
    term: "号码牌",
    blurb: "一个字符，一个整数",
    note: "每个字符领一张整数号码牌。号码只是座位号，不代表这个字的性格，也不代表它更重要。",
  },
  {
    id: "scrolls",
    term: "练习卷 / 验收卷",
    blurb: "九成学，一成抽查",
    note: "同一条纸带切开。九成是练习卷，用来学。一成是验收卷，用来抽查。验收卷不是印着答案的答题纸。文件叫 train.bin 和 val.bin。",
  },
  {
    id: "shift",
    term: "右移一格",
    blurb: "看见这张，猜右边那张",
    note: "x 是现在看见的牌。y 把整段往右挪一格。看见这一张，答案就是右边那一张。",
  },
  {
    id: "penalty",
    term: "猜错罚分",
    blurb: "真答案押得越少，分越大",
    note: "打分只问：真答案被押了多少把握？押得越少，猜错罚分越大。整段再取一个平均。这里不写假的数字。",
  },
];

let mounted = false;
let openId = "";

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
  NOTES.forEach((item) => {
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
  const item = NOTES.find((note) => note.id === id) || NOTES[0];
  openId = item.id;
  const detail = document.getElementById("notes-detail");
  const title = document.getElementById("notes-detail-term");
  if (title) title.textContent = item.term;
  if (detail) detail.textContent = item.note;
  document.querySelectorAll(".notes-term").forEach((el) => {
    el.classList.toggle("is-on", el.dataset.note === item.id);
  });
}
