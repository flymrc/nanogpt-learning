import { makeCharTile, addSectionTag, makeFactChip } from "./components.js";
import { makeIconCard, popIn } from "./lesson.js";
import { isWidePcTutor } from "../tutor/bus.js";
import { lessonRhythm } from "./layout.js";
import { C, uiText } from "./theme.js";

const GLYPHS = ["S", "e", "c", "o"];

export function drawLookExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, "轮到 c", C.gold, { left: stage.left, top: stage.top, note: "attn" }));
  const tile = Math.min(52, Math.max(32, stage.w / 8));
  const y = stage.top + 28 + rhythm + tile / 2;
  const gap = tile + 10;
  const start = stage.cx - ((GLYPHS.length - 1) * gap) / 2;
  GLYPHS.forEach((ch, i) => {
    const node = makeCharTile(scene, start + i * gap, y, ch, { width: tile, height: tile, seed: ch });
    if (i === 3) node.setAlpha(0.28);
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 20 });
  });
  placeCaption(scene, stage, y + tile / 2 + rhythm, "S、e、c 能看。右边的 o 盖住。");
}

export function drawQkvExample(scene, stage, { instant } = {}) {
  const cards = [
    { glyph: "问", label: "提问", accent: C.coral },
    { glyph: "签", label: "标签", accent: C.gold },
    { glyph: "内", label: "内容", accent: C.teal },
  ];
  const row = drawCards(scene, stage, cards, { instant });
  placeFact(scene, stage, row.bottom + lessonRhythm(scene.frame.v) + 28, {
    value: "一次切开",
    label: "三份来自同一格",
    note: "qkv",
    tip: "提问去比标签。搬回来的才是内容。",
    accent: C.violet,
  });
}

export function drawMaskExample(scene, stage, { instant } = {}) {
  const phone = !isWidePcTutor();
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, "谁在看谁", C.violet, { left: stage.left, top: stage.top, note: "mask" }));
  const cols = GLYPHS;
  const rows = ["S", "e", "c"];
  const labelW = phone ? 28 : 36;
  const availW = stage.w - labelW - 8;
  const availH = Math.max(80, stage.h - 36);
  const cell = Math.min(phone ? 36 : 44, Math.floor(availW / cols.length) - 4, Math.floor(availH / (rows.length + 1)) - 4);
  const size = Math.max(26, cell);
  const gridW = labelW + cols.length * (size + 4);
  const originX = stage.cx - gridW / 2;
  const originY = stage.top + 30 + rhythm;
  cols.forEach((ch, i) => {
    const x = originX + labelW + i * (size + 4) + size / 2;
    const label = scene.add.text(x, originY, ch, uiText(phone ? 12 : 14, { color: C.muted })).setOrigin(0.5, 0);
    scene.frame.stage.add(label);
  });
  rows.forEach((row, r) => {
    const y = originY + 22 + r * (size + 4) + size / 2;
    const lab = scene.add.text(originX + 8, y, row, uiText(phone ? 12 : 14)).setOrigin(0, 0.5);
    scene.frame.stage.add(lab);
    cols.forEach((col, c) => {
      const allow = c <= r;
      const x = originX + labelW + c * (size + 4) + size / 2;
      const node = makeCharTile(scene, x, y, allow ? "✓" : "✗", {
        width: size,
        height: size,
        seed: allow ? "gold" : "x",
      });
      node.setAlpha(allow ? 1 : 0.45);
      scene.frame.stage.add(node);
      popIn(scene, node, { instant, delay: (r * 4 + c) * 12 });
    });
  });
}

export function drawWeightExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, "一份重量", C.gold, { left: stage.left, top: stage.top, note: "softmax" }));
  const tile = Math.min(48, Math.max(30, stage.w / 8));
  const y = stage.top + 28 + rhythm + tile / 2;
  const gap = tile + 12;
  const start = stage.cx - ((GLYPHS.length - 1) * gap) / 2;
  const captions = ["有份", "有份", "有份", "0"];
  GLYPHS.forEach((ch, i) => {
    const x = start + i * gap;
    const node = makeCharTile(scene, x, y, ch, { width: tile, height: tile, seed: i === 3 ? "dim" : ch });
    if (i === 3) node.setAlpha(0.35);
    scene.frame.stage.add(node);
    const cap = scene.add
      .text(x, y + tile / 2 + 14, captions[i], uiText(12, { color: i === 3 ? C.muted : C.goldCss }))
      .setOrigin(0.5, 0);
    scene.frame.stage.add(cap);
    popIn(scene, node, { instant, delay: i * 16 });
  });
  placeCaption(scene, stage, y + tile / 2 + 36, "S、e、c 加起来是一整份。o 是 0。");
}

export function drawMixExample(scene, stage, { instant } = {}) {
  const cards = [
    { glyph: "S", label: "内容", accent: C.teal },
    { glyph: "e", label: "内容", accent: C.blue },
    { glyph: "c", label: "内容", accent: C.gold },
    { glyph: "和", label: "加总", accent: C.coral },
  ];
  const row = drawCards(scene, stage, cards, { instant });
  placeCaption(scene, stage, row.bottom + lessonRhythm(scene.frame.v), "o 的重量是 0，不进这个和。");
}

export function drawWriteExample(scene, stage, { instant } = {}) {
  const phone = !isWidePcTutor();
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, "六个头", C.pink, { left: stage.left, top: stage.top, note: "attn" }));
  const n = 6;
  const plusW = 16;
  const gap = 6;
  const tile = Math.min(phone ? 34 : 42, Math.max(24, (stage.w - plusW - gap * (n + 2)) / (n + 1)));
  const y = stage.top + 28 + rhythm + tile / 2;
  const rowW = n * (tile + gap) + plusW + gap + tile;
  let start = stage.cx - rowW / 2 + tile / 2;
  const leftEdge = start - tile / 2;
  if (leftEdge < stage.left + 2) start += stage.left + 2 - leftEdge;
  for (let i = 0; i < n; i += 1) {
    const node = makeCharTile(scene, start + i * (tile + gap), y, String(i + 1), {
      width: tile,
      height: tile,
      seed: `h${i}`,
    });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 12 });
  }
  const plusX = start + n * (tile + gap) - gap + plusW / 2;
  const plus = scene.add.text(plusX, y, "+", uiText(phone ? 16 : 20, { color: C.coralCss })).setOrigin(0.5);
  const back = makeCharTile(scene, plusX + plusW / 2 + gap + tile / 2, y, "c", {
    width: tile,
    height: tile,
    seed: "c",
  });
  scene.frame.stage.add(plus);
  scene.frame.stage.add(back);
  popIn(scene, back, { instant, delay: 80 });
  placeCaption(scene, stage, y + tile / 2 + rhythm + 8, "拼好以后，加回原来的 c。");
}

function drawCards(scene, stage, cards, { instant }) {
  const n = cards.length;
  const w = Math.min(108, (stage.w - 16) / n - 8);
  const h = Math.min(96, Math.max(72, Math.min(stage.h * 0.42, 96)));
  const y = stage.top + h / 2 + 4;
  cards.forEach((card, i) => {
    const x = stage.cx + (i - (n - 1) / 2) * (w + 8);
    const node = makeIconCard(scene, x, y, { ...card, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 30 });
  });
  return { bottom: y + h / 2 };
}

function placeCaption(scene, stage, y, text) {
  if (y > stage.bottom - 16) return;
  const note = scene.add.text(stage.cx, y, text, uiText(13, { color: C.muted, align: "center" })).setOrigin(0.5, 0);
  scene.frame.stage.add(note);
}

function placeFact(scene, stage, y, opts) {
  const h = 48;
  if (y + h / 2 > stage.bottom - 2) return;
  const tip = makeFactChip(scene, stage.cx, y, {
    ...opts,
    width: Math.min(300, stage.w - 12),
    height: h,
  });
  scene.frame.stage.add(tip);
}
