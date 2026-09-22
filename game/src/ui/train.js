import { markCaption } from "./components.js";
import { makeIconCard, popIn } from "./lesson.js";
import { CAPTION_CLEAR, CHIP_GAP_X, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText } from "./theme.js";

const GAP = Math.max(8, CHIP_GAP_X);

export function drawRandomExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "乱", label: "刚出生", accent: C.coral },
    { glyph: "练", label: "练习卷", accent: C.gold },
    { glyph: "验", label: "看着", accent: C.teal },
  ], "罚分往下压。验收卷在旁边。");
}

export function drawStepExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "剪", label: "窗口", accent: C.blue },
    { glyph: "前", label: "往前", accent: C.teal },
    { glyph: "罚", label: "罚分", accent: C.coral },
    { glyph: "回", label: "回传", accent: C.violet },
    { glyph: "改", label: "改数", accent: C.gold },
  ], "一批窗口，改一笔。");
}

export function drawRewriteExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "注", label: "注意力", accent: C.gold },
    { glyph: "层", label: "MLP", accent: C.teal },
    { glyph: "罩", label: "不改", accent: C.violet },
  ], "遮罩继续盖住右边。");
}

export function drawHoldoutExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "练", label: "用来改", accent: C.gold },
    { glyph: "验", label: "只抽查", accent: C.teal },
  ], "抽查的时候不改数。");
}

export function drawLaunchExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "备", label: "prepare.py", accent: C.blue },
      { glyph: "训", label: "train.py", accent: C.coral },
    ],
    "上游命令。本仓库没跑罚分。",
  );
}

export function drawEnoughExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "停", label: "步数到了", accent: C.blue },
    { glyph: "存", label: "验收更好", accent: C.gold },
    { glyph: "续", label: "还没写", accent: C.violet },
  ], "采样留到下一章。");
}

function drawCardRow(scene, stage, { instant } = {}, cards, caption) {
  const n = cards.length;
  const w = Math.min(112, Math.floor((stage.w - GAP * (n - 1)) / n));
  const captionBlock = STICKER_SHADOW_Y + CAPTION_CLEAR + 18;
  let h = Math.min(84, Math.floor(stage.h - captionBlock - 6));
  let showCaption = true;
  if (h < 64) {
    showCaption = false;
    h = Math.min(84, Math.floor(stage.h - STICKER_SHADOW_Y - 4));
  }
  h = Math.max(60, Math.min(84, h));
  const rowW = n * w + (n - 1) * GAP;
  const y = stage.top + h / 2 + 2;
  cards.forEach((card, i) => {
    const x = stage.cx - rowW / 2 + w / 2 + i * (w + GAP);
    const node = makeIconCard(scene, x, y, { ...card, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 24 });
  });
  if (showCaption) placeCaption(scene, stage, y + h / 2, caption);
}

function placeCaption(scene, stage, pieceBottom, text) {
  const y = pieceBottom + STICKER_SHADOW_Y + CAPTION_CLEAR;
  if (y + 18 > stage.bottom) return;
  const note = markCaption(
    scene.add.text(stage.cx, y, text, uiText(13, { color: C.muted, align: "center" })).setOrigin(0.5, 0),
  );
  if (note.width > stage.w - 4) note.setScale((stage.w - 4) / note.width);
  scene.frame.stage.add(note);
}
