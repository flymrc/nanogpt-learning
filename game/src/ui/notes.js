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
    term: "按错题分拧旋钮",
    blurb: "改分器拧一点",
    note: "号码是座位，不改。错题分只是指路。要拧的是猜字规矩的旋钮。一步是：猜，记错题分，从后往前指路，改分器拧一点。大人把改分器叫 AdamW。热身就是开头步子小。步子从 1e-3 慢慢到 1e-4。前 100 步步子小。指路太猛，先收到 1.0。看完左边再混一混，大人叫 MLP。字换成记号、第几格换成记号，大人叫投影。有的旋钮按 0.1 的力气轻轻收一点，大人叫 weight decay。右边的盖子不进改分器。电脑上要打的字：python data/shakespeare_char/prepare.py，然后 python train.py config/train_shakespeare_char.py。存档文件是 out-shakespeare-char/ckpt.pt。验收更好才写下它。",
  },
  {
    id: "sample",
    term: "从开头往后续",
    blurb: "一格一格接下去",
    note: "从开头往后续，就是一格一格接下去。读存档。开头是空的一行，或你写的一小段。旋钮不再拧。第 2 章的把握还在：把握高的字更常被抽到，但不是每次都抽最高的。乱不乱有一个旋钮，大人叫温度。默认是 0.8。1.0 是不改。小于 1 更稳，大于 1 更乱。前几名就是只从最可能的几个字里抽。丢掉的格子写成负无穷，就是小到看不见的数。这一课说留前 200 名。字只有 65 个，所以一个也不丢。没有老师的答案，就算不出正确率。验收错题分是开训时的另一场考试。好看不等于过关。这里没有编出来的台词。大人把这一步叫做采样。存档文件是 out-shakespeare-char/ckpt.pt。对照表是 data/shakespeare_char/meta.pkl。另一套切法会把词语切成小碎块，大人叫 GPT-2，号码对不上这 65 张牌。电脑上要打的字：python sample.py --out_dir=out-shakespeare-char。抽签的固定起点是 1337。",
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
