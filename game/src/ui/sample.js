import { markCaption } from "./components.js";
import { makeIconCard, popIn } from "./lesson.js";
import { CAPTION_CLEAR, CHIP_GAP_X, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText } from "./theme.js";

const GAP = Math.max(8, CHIP_GAP_X);

export function drawPromptExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "存", label: "检查点", accent: C.gold },
      { glyph: "起", label: "换行", accent: C.teal },
      { glyph: "续", label: "往后", accent: C.coral },
    ],
    "从开头接新格子。不改数。",
  );
}

export function drawLoopExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "看", label: "当前", accent: C.blue },
      { glyph: "抽", label: "下一格", accent: C.gold },
      { glyph: "接", label: "末尾", accent: C.coral },
      { glyph: "再", label: "再看", accent: C.teal },
    ],
    "一格一格接上去。",
  );
}

export function drawKnobsExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "温", label: "0.8", accent: C.coral },
      { glyph: "留", label: "65 全留", accent: C.violet },
    ],
    "前 200 名，在这一课等于全留。",
  );
}

export function drawRunExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "点", label: "ckpt.pt", accent: C.gold },
      { glyph: "表", label: "meta.pkl", accent: C.teal },
    ],
    "上游命令。本仓库没有样本。",
  );
}

export function drawScoreExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "续", label: "新纸带", accent: C.coral },
      { glyph: "罚", label: "另一件事", accent: C.blue },
    ],
    "不打正确率。",
  );
}

export function drawWrapExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "带", label: "纸带", accent: C.teal },
      { glyph: "移", label: "右移", accent: C.blue },
      { glyph: "看", label: "左边", accent: C.violet },
      { glyph: "改", label: "开训", accent: C.gold },
      { glyph: "续", label: "采样", accent: C.coral },
    ],
    "字符课的机制走到这里。",
  );
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
