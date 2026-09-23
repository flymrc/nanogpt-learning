import { L } from "../i18n/locale.js";
import { markCaption } from "./components.js";
import { makeIconCard, popIn } from "./lesson.js";
import { CAPTION_CLEAR, CHIP_GAP_X, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText } from "./theme.js";

const GAP = Math.max(8, CHIP_GAP_X);

export function drawRandomExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "乱", label: L("随手拧", "適当"), accent: C.coral },
    { glyph: "练", label: L("练习卷", "練習"), accent: C.gold },
    { glyph: "验", label: L("看着", "見る"), accent: C.teal },
  ], L("按错题分拧旋钮。验收卷在旁边。", "罰点でつまみを回す。確認は横。"));
}

export function drawStepExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "剪", label: L("几段", "数段"), accent: C.blue },
    { glyph: "罚", label: L("错题分", "罰点"), accent: C.coral },
    { glyph: "回", label: L("往回指", "指す"), accent: C.violet },
    { glyph: "拧", label: L("拧一点", "回す"), accent: C.gold },
  ], L("改分器拧一点。", "直し器が少し回す。"));
}

export function drawRewriteExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "左", label: L("看左边", "左だけ"), accent: C.gold },
    { glyph: "混", label: L("再混", "まぜる"), accent: C.teal },
    { glyph: "号", label: L("记号", "記号"), accent: C.blue },
    { glyph: "盖", label: L("不拧", "固定"), accent: C.violet },
  ], L("右边的盖子不进改分器。", "右のふたは直し器に入らない。"));
}

export function drawHoldoutExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "练", label: L("可能背", "暗記"), accent: C.gold },
    { glyph: "验", label: L("不拧", "回さない"), accent: C.teal },
  ], L("验收错题分不降，就是在背。", "確認の罰点が下がらなければ暗記。"));
}

export function drawLaunchExample(scene, stage, opts) {
  drawCardRow(
    scene,
    stage,
    opts,
    [
      { glyph: "备", label: L("准备纸带", "用意"), accent: C.blue },
      { glyph: "拧", label: L("开始拧", "回す"), accent: C.coral },
    ],
    L("要打的字在伪代码里。", "打つ字は擬似コードにある。"),
  );
}

export function drawEnoughExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "停", label: L("步数到了", "歩数"), accent: C.blue },
    { glyph: "存", label: L("验收更好", "保存"), accent: C.gold },
    { glyph: "续", label: L("下一章", "次章"), accent: C.violet },
  ], L("下一章才往后面续字。", "次の章で、うしろへ続ける。"));
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
