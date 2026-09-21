import {
  CHARSET,
  DATASET,
  DEMO_BLOCK,
  DEMO_IDS,
  DEMO_SNIPPET,
  DEMO_STREAM,
  DEMO_Y_IDS,
  VOCAB_SIZE,
  displayGlyph,
} from "../data/facts.js";
import { STREAM_CHARS } from "../data/beats.js";
import { playSfx } from "../audio/sound.js";
import {
  addSectionTag,
  burstStars,
  highlightChip,
  makeCharTile,
  makeChip,
  makeFactChip,
  makePairBoard,
  makeTag,
  makeWindowFrame,
  setTileActive,
} from "./components.js";
import { makeBigStat, makeIconCard, popIn } from "./lesson.js";
import { isWidePcTutor } from "../tutor/bus.js";
import { flowPositions, lessonRhythm } from "./layout.js";
import { C, uiText, wrapToWidth } from "./theme.js";

const CHARS = [...DEMO_SNIPPET];
const STREAM = DEMO_STREAM;
const STREAM_GLYPHS = STREAM_CHARS;

export function drawTapeExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, "纸带 · 16 格", C.pink, { left: stage.left, top: stage.top }));
  const tile = Math.min(48, Math.max(24, Math.min(stage.w / 10, stage.h / 5)));
  const rowY = stage.top + 26 + rhythm + tile / 2;
  const pos = flowPositions(CHARS.length, {
    y: rowY,
    tileW: tile,
    tileH: tile,
    gapX: 5,
    gapY: 8,
    innerW: stage.w,
    cx: stage.cx,
  });
  CHARS.forEach((ch, i) => {
    const node = makeCharTile(scene, pos[i].x, pos[i].y, displayGlyph(ch), {
      width: tile,
      height: tile,
      seed: ch,
    });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 12 });
  });
  const last = pos[pos.length - 1];
  const noteRaw = "空格写成 ␣，换行写成 ↵。一个字占一格。";
  const noteText = wrapToWidth(scene, noteRaw, 13, stage.w - 8, uiText);
  const noteY = last.y + tile / 2 + rhythm + 6;
  if (noteY < stage.bottom - 8) {
    const note = scene.add
      .text(stage.cx, noteY, noteText, uiText(13, { color: C.muted, align: "center" }))
      .setOrigin(0.5, 0);
    scene.frame.stage.add(note);
  }
}

export function drawEncodeExample(scene, stage, { instant } = {}) {
  const phone = !isWidePcTutor();
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(
    addSectionTag(scene, "一字一号", C.gold, {
      left: stage.left,
      top: stage.top,
      note: "plates",
    }),
  );
  const tile = Math.min(phone ? 32 : 42, Math.max(phone ? 20 : 22, stage.w / (phone ? 9 : 11)));
  const chipH = tile * 1.32;
  let rowY = stage.top + 26 + rhythm;
  const needDemo = !phone && stage.h > 180;
  if (needDemo) {
    const y = rowY + 28;
    const src = makeCharTile(scene, stage.cx - 78, y, "S", { width: 44, height: 44, seed: "S" });
    setTileActive(src, true);
    const arrow = makeIconCard(scene, stage.cx, y, {
      glyph: "→",
      label: "发牌",
      accent: C.coral,
      width: 72,
      height: 56,
    });
    const chip = makeChip(scene, stage.cx + 78, y, {
      glyph: "S",
      id: 31,
      accent: C.teal,
      width: 44,
      height: 52,
    });
    scene.frame.stage.add(src);
    scene.frame.stage.add(arrow);
    scene.frame.stage.add(chip);
    popIn(scene, [src, arrow, chip], { instant });
    if (!instant) {
      playSfx(scene, "sfx-pop", 0.14);
      burstStars(scene, stage.cx + 78, y);
    }
    rowY = y + 28 + rhythm;
  }
  const pos = flowPositions(CHARS.length, {
    y: rowY + chipH / 2,
    tileW: tile,
    tileH: chipH,
    gapX: phone ? 3 : 4,
    gapY: phone ? 4 : 6,
    innerW: stage.w,
    cx: stage.cx,
  });
  CHARS.forEach((ch, i) => {
    const chip = makeChip(scene, pos[i].x, pos[i].y, {
      glyph: displayGlyph(ch),
      id: DEMO_IDS[i],
      accent: i === 0 || i === 1 || i === 15 ? C.coral : C.teal,
      width: tile,
      height: chipH,
    });
    scene.frame.stage.add(chip);
    popIn(scene, chip, { instant, delay: i * 10 });
  });
  if (phone) return;
  const last = pos[pos.length - 1];
  placeFactInBand(scene, stage, last.y + chipH / 2 + rhythm + 24, {
    value: "一字一号",
    label: "不是把词切开",
    note: "bpe",
    tip: "另一种切法叫 BPE，会把词切碎。这一课一个字符一张牌。",
    accent: C.violet,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
}

export function drawSeatExample(scene, stage, { instant } = {}) {
  const cards = [
    { glyph: "e", label: "前面的 e", accent: C.teal },
    { glyph: "43", label: "同一张牌", accent: C.gold },
    { glyph: "e", label: "后面的 e", accent: C.teal },
  ];
  const row = drawIconRow(scene, stage, { instant }, cards);
  placeFactInBand(scene, stage, row.bottom + lessonRhythm(scene.frame.v) + 24, {
    value: "43 是座位",
    label: "不是性格",
    note: "plates",
    tip: "两个 e 都是 43。号码大，也不更重要。",
    accent: C.gold,
    width: Math.min(300, stage.w - 12),
    height: 48,
  });
}

export function drawVocabExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  const statH = Math.min(110, Math.max(78, Math.min(stage.h * 0.32, 110)));
  const node = makeBigStat(scene, stage.cx, stage.top + statH / 2 + 4, {
    value: String(VOCAB_SIZE),
    label: "换行、空格、标点、字母",
    width: Math.min(280, stage.w * 0.72),
    height: statH,
    accent: C.gold,
  });
  scene.frame.stage.add(node);
  popIn(scene, node, { instant });
  const sample = [...CHARSET].filter((ch) => ch !== "\n").slice(0, 18);
  const tile = Math.min(28, stage.w / 20);
  const gridTop = stage.top + statH + rhythm + 8;
  sample.forEach((ch, i) => {
    const x = stage.left + 16 + (i % 9) * (tile + 4);
    const y = gridTop + Math.floor(i / 9) * (tile + 4);
    const cell = makeCharTile(scene, x, y, displayGlyph(ch), { width: tile, height: tile, seed: ch });
    scene.frame.stage.add(cell);
  });
  placeFactInBand(scene, stage, gridTop + tile + 28, {
    value: "只有 65 张",
    label: "只数这套剧本",
    tip: "剧本里出现过的字符，去重以后是 65 个。",
    accent: C.pink,
    width: Math.min(200, stage.w * 0.4),
    height: 48,
  });
}

export function drawScrollExample(scene, stage, { instant } = {}) {
  const row = drawIconRow(scene, stage, { instant }, [
    { glyph: "练", label: "练习卷", accent: C.coral },
    { glyph: "验", label: "验收卷", accent: C.gold },
  ]);
  placeFactInBand(scene, stage, row.bottom + lessonRhythm(scene.frame.v) + 24, {
    value: "不是答题纸",
    label: "九成学，一成抽查",
    note: "scrolls",
    tip: "同一条纸带按大约 9 比 1 切开。验收卷用来抽查。",
    accent: C.pink,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
}

export function drawClipExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: false, showY: false, notFromStart: true });
}

export function drawSeenExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: false, xTag: "x 现在看见的" });
}

export function drawShiftExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, {
    showX: true,
    showY: true,
    xTag: "x 现在看见的",
    yTag: "y 右移一格",
    alignArrows: true,
  });
}

export function drawBlankExample(scene, stage, opts) {
  const rows = drawWindowRows(scene, stage, opts, { showX: true, showY: true, allOn: true, xTag: "线索 x", yTag: "答案 y" });
  const boardH = 58;
  const boardY = (rows?.bottom || stage.top) + 40;
  if (boardY + boardH / 2 <= stage.bottom) {
    const board = makePairBoard(scene, stage.cx, boardY, {
      width: Math.min(340, stage.w - 16),
      height: boardH,
    });
    scene.frame.stage.add(board);
    board.show("S", "e", "第 1 空：看见 S，填右边的 e");
  }
}

export function drawChoiceExample(scene, stage, { instant } = {}) {
  const w = Math.min(200, (stage.w - 16) / 2);
  const h = Math.min(100, stage.h * 0.34);
  [
    { value: String(VOCAB_SIZE), label: "每题的候选", accent: C.coral },
    { value: "1", label: "真答案只有 e", accent: C.gold },
  ].forEach((fact, i) => {
    const x = stage.cx + (i - 0.5) * (w + 12);
    const node = makeBigStat(scene, x, stage.top + h / 2 + 8, { ...fact, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
}

export function drawDeskExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: true, xTag: "线索 x", yTag: "评分桌 y" });
}

export function drawScoreExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(
    addSectionTag(scene, "只点亮真答案", C.coral, { left: stage.left, top: stage.top, note: "penalty" }),
  );
  const cols = 13;
  const rows = 5;
  const gap = 3;
  const tile = Math.min(28, (stage.w - 20) / cols - gap);
  const gridW = cols * (tile + gap) - gap;
  const startX = stage.cx - gridW / 2 + tile / 2;
  const startY = stage.top + 26 + rhythm + tile / 2;
  const trueChar = "e";
  [...CHARSET].forEach((ch, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const on = ch === trueChar;
    const cell = makeCharTile(scene, startX + col * (tile + gap), startY + row * (tile + gap), displayGlyph(ch), {
      width: tile,
      height: tile,
      seed: on ? "gold" : ch,
    });
    cell.setAlpha(on ? 1 : 0.28);
    if (on) setTileActive(cell, true);
    scene.frame.stage.add(cell);
  });
  const tip = placeFactInBand(scene, stage, startY + (rows - 1) * (tile + gap) + tile / 2 + rhythm + 24, {
    value: "真答案是 e",
    label: "押得矮，罚分就大",
    note: "penalty",
    tip: "只看真答案那一格。这一课不写假的罚分。",
    accent: C.coral,
    width: Math.min(340, stage.w - 12),
    height: 46,
  });
  if (tip) popIn(scene, tip, { instant, delay: 60 });
}

export function drawMeanExample(scene, stage, { instant } = {}) {
  const row = drawIconRow(scene, stage, { instant }, [
    { glyph: "16", label: "每格一题", accent: C.blue },
    { glyph: "+", label: "加在一起", accent: C.violet },
    { glyph: "均", label: "再取平均", accent: C.gold },
  ]);
  placeFactInBand(scene, stage, row.bottom + lessonRhythm(scene.frame.v) + 24, {
    value: "不编分数",
    label: "通关还没训练",
    note: "penalty",
    tip: "这一课没有训练，也不写出假的罚分。",
    accent: C.pink,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
}

function placeFactInBand(scene, stage, y, opts) {
  const h = opts.height ?? 48;
  if (y + h / 2 > stage.bottom - 2) return null;
  const tip = makeFactChip(scene, stage.cx, y, opts);
  scene.frame.stage.add(tip);
  return tip;
}

function drawIconRow(scene, stage, { instant }, cards) {
  const n = cards.length;
  const w = Math.min(150, (stage.w - 20) / n - 8);
  const h = Math.min(108, Math.max(78, Math.min(stage.h * 0.36, 108)));
  const y = stage.top + h / 2 + 8;
  cards.forEach((card, i) => {
    const x = stage.cx + (i - (n - 1) / 2) * (w + 12);
    const node = makeIconCard(scene, x, y, { ...card, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
  return { bottom: y + h / 2, height: h };
}

function layoutTokens(stage, { showX = false, showY = false, leftReserve = 0 } = {}) {
  const phone = !isWidePcTutor();
  const count = STREAM.length;
  const gapX = phone ? 2 : 4;
  const room = Math.max(80, stage.w - leftReserve);
  const maxW = phone ? 20 : Math.min(42, room / 18);
  const tileW = Math.min(maxW, (room - Math.max(0, count - 1) * gapX) / count);
  const tileH = phone ? Math.max(26, tileW * 1.35) : Math.max(32, tileW * 1.32);
  const metrics = { tileW, tileH, gapX, font: Math.max(11, Math.round(tileW * 0.4)) };
  const total = count * tileW + (count - 1) * gapX;
  const startX = stage.left + leftReserve + (room - total) / 2 + tileW / 2;
  const tagSlot = phone ? 30 : 28;
  const rhythm = phone ? 10 : 16;
  const rowPitch = tagSlot + tileH + rhythm;
  const streamY = stage.top + tagSlot + tileH / 2;
  const xY = streamY + rowPitch;
  const yY = xY + rowPitch;
  const shiftHintY = streamY + tileH / 2 + rhythm / 2;
  const streamPos = STREAM.map((_, i) => ({
    x: startX + i * (tileW + gapX),
    y: streamY,
  }));
  return {
    phone,
    metrics,
    tagSlot,
    rhythm,
    shiftHintY,
    streamPos,
    xPos: streamPos.slice(0, DEMO_BLOCK).map((p) => ({ x: p.x, y: xY })),
    yPos: streamPos.slice(1, DEMO_BLOCK + 1).map((p) => ({ x: p.x, y: yY })),
    xY,
    yY,
    showX,
    showY,
  };
}

function drawWindowRows(
  scene,
  stage,
  { instant } = {},
  { showX, showY, highlight = -1, allOn = false, notFromStart = false, xTag = "现在看到的牌", yTag = "下一字", alignArrows = false },
) {
  const lead = notFromStart && !isWidePcTutor() ? 0 : notFromStart ? 132 : 0;
  const layout = layoutTokens(stage, { showX, showY, leftReserve: lead });
  const { metrics, phone } = layout;
  const streamLabel = phone && notFromStart ? "纸带 · 前面还有" : "纸带";
  scene.frame.stage.add(addSectionTag(scene, streamLabel, C.violet, { left: stage.left, top: stage.top }));

  if (notFromStart && !phone) {
    const first = layout.streamPos[0];
    const dotsX = first.x - metrics.tileW - 8;
    for (let i = 0; i < 3; i += 1) {
      const node = makeCharTile(scene, dotsX - i * (metrics.tileW * 0.55), first.y, "…", {
        width: Math.max(16, metrics.tileW * 0.7),
        height: metrics.tileH,
        seed: "dot",
      });
      node.setAlpha(0.28);
      scene.frame.stage.add(node);
    }
    const tag = makeTag(scene, dotsX - 8, first.y - metrics.tileH * 0.7, "前面还有", C.violet);
    tag.setAlpha(0.7);
    scene.frame.stage.add(tag);
  }

  STREAM.forEach((id, i) => {
    const chip = makeChip(scene, layout.streamPos[i].x, layout.streamPos[i].y, {
      glyph: displayGlyph(STREAM_GLYPHS[i]),
      id,
      accent: C.violet,
      width: metrics.tileW,
      height: metrics.tileH,
    });
    const inX = i < DEMO_BLOCK;
    const inY = i >= 1 && i <= DEMO_BLOCK;
    chip.setAlpha(showY ? (inY || inX ? 1 : 0.28) : inX ? 1 : 0.28);
    scene.frame.stage.add(chip);
    if (highlight === i || (allOn && inX)) highlightChip(scene, chip, true);
  });

  const first = layout.streamPos[0];
  const last = layout.streamPos[DEMO_BLOCK - 1];
  const winW = last.x - first.x + metrics.tileW + 6;
  const winH = metrics.tileH + 12;
  if (!phone) {
    const shift = showY ? layout.streamPos[1].x - layout.streamPos[0].x : 0;
    const win = makeWindowFrame(scene, (first.x + last.x) / 2 + shift, first.y, winW, winH, showY ? C.gold : C.blue);
    scene.frame.stage.add(win);
    popIn(scene, win, { instant });
    if (showY) {
      const plus = makeTag(scene, win.x + winW / 2 + 22, first.y, "右移一格", C.gold);
      const tagRight = plus.x + plus.width / 2;
      if (tagRight > stage.right - 6) plus.x -= tagRight - (stage.right - 6);
      scene.frame.stage.add(plus);
      popIn(scene, plus, { instant });
    }
  }

  if (showX) {
    scene.frame.stage.add(
      addSectionTag(scene, xTag, C.blue, {
        left: stage.left,
        top: layout.xY - metrics.tileH / 2 - layout.tagSlot + 2,
      }),
    );
    DEMO_IDS.forEach((id, i) => {
      const chip = makeChip(scene, layout.xPos[i].x, layout.xPos[i].y, {
        glyph: displayGlyph(CHARS[i]),
        id,
        accent: C.blue,
        width: metrics.tileW,
        height: metrics.tileH,
      });
      scene.frame.stage.add(chip);
      if (highlight === i || allOn) highlightChip(scene, chip, true);
      popIn(scene, chip, { instant, delay: i * 8 });
    });
  }

  if (showY) {
    scene.frame.stage.add(
      addSectionTag(scene, yTag, C.gold, {
        left: stage.left,
        top: layout.yY - metrics.tileH / 2 - layout.tagSlot + 2,
        note: yTag.includes("挪") || yTag.includes("右移") || yTag.includes("评分") ? "shift" : undefined,
      }),
    );
    DEMO_Y_IDS.forEach((id, i) => {
      const chip = makeChip(scene, layout.yPos[i].x, layout.yPos[i].y, {
        glyph: displayGlyph(STREAM_GLYPHS[i + 1]),
        id,
        accent: C.gold,
        width: metrics.tileW,
        height: metrics.tileH,
      });
      scene.frame.stage.add(chip);
      if (highlight === i || allOn) highlightChip(scene, chip, true);
      popIn(scene, chip, { instant, delay: i * 8 });
      if (alignArrows && !phone && i < 3 && layout.xPos[i]) {
        const mark = scene.add
          .text((layout.xPos[i].x + layout.yPos[i].x) / 2, (layout.xPos[i].y + layout.yPos[i].y) / 2, "↓", uiText(14, { color: C.coralCss }))
          .setOrigin(0.5);
        scene.frame.stage.add(mark);
      }
    });
  }
  const lastY = showY ? layout.yY : showX ? layout.xY : layout.streamPos[0].y;
  scene.frame.tapeRows = [
    {
      name: "row-stream",
      left: stage.left,
      top: layout.streamPos[0].y - metrics.tileH / 2,
      w: stage.w,
      h: metrics.tileH,
    },
    showX
      ? {
          name: "row-x",
          left: stage.left,
          top: layout.xY - metrics.tileH / 2,
          w: stage.w,
          h: metrics.tileH,
        }
      : null,
    showY
      ? {
          name: "row-y",
          left: stage.left,
          top: layout.yY - metrics.tileH / 2,
          w: stage.w,
          h: metrics.tileH,
        }
      : null,
  ].filter(Boolean);
  return { bottom: lastY + metrics.tileH / 2 };
}

