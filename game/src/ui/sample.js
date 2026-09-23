import { L } from "../i18n/locale.js";
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
      { glyph: "存", label: L("存档", "保存"), accent: C.gold },
      { glyph: "起", label: L("空行", "空行"), accent: C.teal },
      { glyph: "续", label: L("接下去", "足す"), accent: C.coral },
    ],
    L("从开头往后续。旋钮不再拧。", "先頭から続ける。つまみは回さない。"),
  );
}

export function drawLoopExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "看", label: L("当前", "今"), accent: C.blue },
      { glyph: "抽", label: L("下一格", "次"), accent: C.gold },
      { glyph: "接", label: L("末尾", "末尾"), accent: C.coral },
      { glyph: "再", label: L("再看", "また"), accent: C.teal },
    ],
    L("一格一格接上去。", "一マスずつ足す。"),
  );
}

export function drawKnobsExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "稳", label: L("拧得稳", "安定"), accent: C.coral },
      { glyph: "乱", label: L("拧得乱", "乱れる"), accent: C.violet },
    ],
    L("大人叫温度。65 个字全留。", "大人は温度。65字は全部残す。"),
  );
}

export function drawRunExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "档", label: L("存档", "保存"), accent: C.gold },
      { glyph: "表", label: L("对照表", "対照"), accent: C.teal },
    ],
    L("要打的字在详细笔记里。没有台词。", "打つ字は詳細ノート。せりふはない。"),
  );
}

export function drawScoreExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "续", label: L("新纸带", "新しい"), accent: C.coral },
      { glyph: "罚", label: L("另一件事", "別の話"), accent: C.blue },
    ],
    L("好看不等于过关。", "きれいで合格ではない。"),
  );
}

export function drawWrapExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "带", label: L("纸带", "テープ"), accent: C.teal },
      { glyph: "移", label: L("右移", "右へ"), accent: C.blue },
      { glyph: "看", label: L("左边", "左"), accent: C.violet },
      { glyph: "拧", label: L("拧旋钮", "つまみ"), accent: C.gold },
      { glyph: "续", label: L("续字", "続く"), accent: C.coral },
    ],
    L("五步都能讲给朋友。", "五つの手順を友だちに話せる。"),
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
