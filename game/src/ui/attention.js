import { makeCharTile, addSectionTag, makeFactChip, markCaption } from "./components.js";
import { makeIconCard, popIn } from "./lesson.js";
import { isWidePcTutor } from "../tutor/bus.js";
import { CAPTION_CLEAR, CHIP_GAP_X, CHIP_GAP_Y, STICKER_SHADOW_Y, lessonRhythm } from "./layout.js";
import { L } from "../i18n/locale.js";
import { C, uiText } from "./theme.js";

const GLYPHS = ["S", "e", "c", "o"];

export function drawLookExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, L("轮到 c", "c の番"), C.gold, { left: stage.left, top: stage.top, note: "attn" }));
  const tile = Math.min(52, Math.max(32, stage.w / 8));
  const y = stage.top + 28 + rhythm + tile / 2;
  const gap = tile + Math.max(10, CHIP_GAP_X);
  const start = stage.cx - ((GLYPHS.length - 1) * gap) / 2;
  GLYPHS.forEach((ch, i) => {
    const node = makeCharTile(scene, start + i * gap, y, ch, { width: tile, height: tile, seed: ch });
    if (i === 3) node.setAlpha(0.28);
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 20 });
  });
  placeCaption(scene, stage, y + tile / 2, L("S、e、c 能看。右边的 o 盖住。", "S・e・c は見える。右の o は隠す。"));
}

export function drawQkvExample(scene, stage, { instant } = {}) {
  const cards = [
    { glyph: L("问", "問"), label: L("提问", "問い"), accent: C.coral },
    { glyph: L("牌", "札"), label: L("名牌", "名札"), accent: C.gold },
    { glyph: L("内", "中"), label: L("内容", "中身"), accent: C.teal },
  ];
  const row = drawCards(scene, stage, cards, { instant });
  placeFact(scene, stage, row.bottom + STICKER_SHADOW_Y + CAPTION_CLEAR + 24, {
    value: L("一次切开", "一度に切る"),
    label: L("三份来自同一格", "三つは同じマス"),
    note: "qkv",
    tip: L("提问去比名牌。搬回来的才是内容。", "問いで名札を比べます。運び戻すのは中身です。"),
    accent: C.violet,
  });
}

export function drawMaskExample(scene, stage, { instant } = {}) {
  const phone = !isWidePcTutor();
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, L("谁在看谁", "誰が誰を見る"), C.violet, { left: stage.left, top: stage.top, note: "mask" }));
  const cols = GLYPHS;
  const rows = ["S", "e", "c"];
  const labelCol = phone ? 18 : 22;
  const availW = stage.w - labelCol - CAPTION_CLEAR - 4;
  const headerH = 18;
  const availH = Math.max(90, stage.h - 36 - headerH - CAPTION_CLEAR);
  const maxW = Math.floor((availW - CHIP_GAP_X * (cols.length - 1)) / cols.length);
  const maxH = Math.floor((availH - CHIP_GAP_Y * (rows.length - 1)) / rows.length);
  const size = Math.max(26, Math.min(phone ? 36 : 44, maxW, maxH));
  const gridW = labelCol + CAPTION_CLEAR + cols.length * size + (cols.length - 1) * CHIP_GAP_X;
  const originX = stage.cx - gridW / 2;
  const tileTop = stage.top + 30 + rhythm + headerH + CAPTION_CLEAR;
  cols.forEach((ch, i) => {
    const x = originX + labelCol + CAPTION_CLEAR + i * (size + CHIP_GAP_X) + size / 2;
    const label = markCaption(
      scene.add.text(x, tileTop - CAPTION_CLEAR, ch, uiText(phone ? 12 : 14, { color: C.muted })).setOrigin(0.5, 1),
    );
    scene.frame.stage.add(label);
  });
  rows.forEach((row, r) => {
    const y = tileTop + r * (size + CHIP_GAP_Y) + size / 2;
    const lab = markCaption(
      scene.add.text(originX + labelCol, y, row, uiText(phone ? 12 : 14)).setOrigin(1, 0.5),
    );
    scene.frame.stage.add(lab);
    cols.forEach((col, c) => {
      const allow = c <= r;
      const x = originX + labelCol + CAPTION_CLEAR + c * (size + CHIP_GAP_X) + size / 2;
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
  scene.frame.stage.add(addSectionTag(scene, L("一份重量", "一そろいの重み"), C.gold, { left: stage.left, top: stage.top, note: "softmax" }));
  const tile = Math.min(48, Math.max(32, stage.w / 8));
  const y = stage.top + 28 + rhythm + tile / 2;
  const gap = tile + Math.max(10, CHIP_GAP_X);
  const start = stage.cx - ((GLYPHS.length - 1) * gap) / 2;
  GLYPHS.forEach((ch, i) => {
    const node = makeCharTile(scene, start + i * gap, y, ch, { width: tile, height: tile, seed: i === 3 ? "dim" : ch });
    if (i === 3) node.setAlpha(0.35);
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 16 });
  });
  placeCaption(scene, stage, y + tile / 2, L("S、e、c 加起来是一整份。o 是 0。", "S・e・c で一そろい。o は 0。"));
}

export function drawMixExample(scene, stage, { instant } = {}) {
  const cards = [
    { glyph: "S", label: L("内容", "中身"), accent: C.teal },
    { glyph: "e", label: L("内容", "中身"), accent: C.blue },
    { glyph: "c", label: L("内容", "中身"), accent: C.gold },
    { glyph: L("和", "和"), label: L("加总", "合計"), accent: C.coral },
  ];
  const row = drawCards(scene, stage, cards, { instant });
  placeCaption(scene, stage, row.bottom, L("o 的重量是 0，不进这个和。", "o の重みは 0。この和に入らない。"));
}

export function drawWriteExample(scene, stage, { instant } = {}) {
  const phone = !isWidePcTutor();
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, L("六个头", "六つの頭"), C.pink, { left: stage.left, top: stage.top, note: "attn" }));
  const n = 6;
  const plusW = 18;
  const gap = Math.max(CHIP_GAP_X, 8);
  const slot = plusW + gap * 2;
  const tile = Math.min(phone ? 34 : 42, Math.max(26, (stage.w - slot - gap * (n - 1)) / (n + 1)));
  const y = stage.top + 28 + rhythm + tile / 2;
  const rowW = n * (tile + gap) - gap + slot + tile;
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
  const lastHead = start + (n - 1) * (tile + gap);
  const plusX = lastHead + tile / 2 + gap + plusW / 2;
  const plus = scene.add.text(plusX, y, "+", uiText(phone ? 16 : 20, { color: C.coralCss })).setOrigin(0.5);
  const back = makeCharTile(scene, plusX + plusW / 2 + gap + tile / 2, y, "c", {
    width: tile,
    height: tile,
    seed: "c",
  });
  scene.frame.stage.add(plus);
  scene.frame.stage.add(back);
  popIn(scene, back, { instant, delay: 80 });
  placeCaption(scene, stage, y + tile / 2, L("拼好以后，加回原来的 c。", "つないだあと、元の c へ足す。"));
}

function drawCards(scene, stage, cards, { instant }) {
  const n = cards.length;
  const w = Math.min(108, (stage.w - 16) / n - Math.max(8, CHIP_GAP_X));
  const h = Math.min(96, Math.max(72, Math.min(stage.h * 0.42, 96)));
  const y = stage.top + h / 2 + 4;
  cards.forEach((card, i) => {
    const x = stage.cx + (i - (n - 1) / 2) * (w + Math.max(8, CHIP_GAP_X));
    const node = makeIconCard(scene, x, y, { ...card, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 30 });
  });
  return { bottom: y + h / 2 };
}

function placeCaption(scene, stage, pieceBottom, text) {
  const y = pieceBottom + STICKER_SHADOW_Y + CAPTION_CLEAR;
  if (y > stage.bottom - 16) return;
  const note = markCaption(
    scene.add.text(stage.cx, y, text, uiText(13, { color: C.muted, align: "center" })).setOrigin(0.5, 0),
  );
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
