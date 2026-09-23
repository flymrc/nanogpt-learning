import { L } from "../i18n/locale.js";
import { markCaption } from "./components.js";
import { makeIconCard, popIn } from "./lesson.js";
import { CAPTION_CLEAR, CHIP_GAP_X, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText } from "./theme.js";

const GAP = Math.max(8, CHIP_GAP_X);

export function drawRandomExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "乱", label: L("刚出生", "生まれ"), accent: C.coral },
    { glyph: "练", label: L("练习卷", "練習"), accent: C.gold },
    { glyph: "验", label: L("看着", "見る"), accent: C.teal },
  ], L("罚分往下压。验收卷在旁边。", "罰点を下げる。確認は横に置く。"));
}

export function drawStepExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "剪", label: L("窗口", "窓"), accent: C.blue },
    { glyph: "前", label: L("往前", "前へ"), accent: C.teal },
    { glyph: "罚", label: L("罚分", "罰点"), accent: C.coral },
    { glyph: "回", label: L("回传", "戻す"), accent: C.violet },
    { glyph: "改", label: L("改数", "直す"), accent: C.gold },
  ], L("一批窗口，改一笔。", "一束の窓で、一筆。"));
}

export function drawRewriteExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "注", label: L("注意力", "注意"), accent: C.gold },
    { glyph: "层", label: L("混合", "まぜる"), accent: C.teal },
    { glyph: "罩", label: L("不改", "固定"), accent: C.violet },
  ], L("右边一直盖住。", "右はずっと隠す。"));
}

export function drawHoldoutExample(scene, stage, opts) {
  drawCardRow(scene, stage, opts, [
    { glyph: "练", label: L("用来改", "直す"), accent: C.gold },
    { glyph: "验", label: L("只抽查", "抜く"), accent: C.teal },
  ], L("抽查的时候不改数。", "抜き打ちのあいだは直さない。"));
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
    L("说明里的命令。我们没跑过。", "説明のコマンド。まだ走っていない。"),
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
