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
import { flowPositions, lessonRhythm, tokenMetrics } from "./layout.js";
import { C, uiText } from "./theme.js";

const CHARS = [...DEMO_SNIPPET];
const STREAM = DEMO_STREAM;
const STREAM_GLYPHS = STREAM_CHARS;

export function drawTapeExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(addSectionTag(scene, "纸带 16 格", C.pink, { left: stage.left, top: stage.top }));
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
  const note = scene.add
    .text(
      stage.cx,
      last.y + tile / 2 + rhythm + 6,
      "空格写成 ␣，换行写成 ↵。Citizen 是 8 格，不是 1 个词。",
      uiText(14, { color: C.muted }),
    )
    .setOrigin(0.5, 0);
  scene.frame.stage.add(note);
}

export function drawEncodeExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(
    addSectionTag(scene, "一字一号", C.gold, { left: stage.left, top: stage.top, note: "plates" }),
  );
  const tile = Math.min(42, Math.max(22, stage.w / 11));
  const chipH = tile * 1.32;
  let rowY = stage.top + 26 + rhythm;
  if (stage.h > 180) {
    const y = rowY + 28;
    const src = makeCharTile(scene, stage.cx - 78, y, "S", { width: 44, height: 44, seed: "S" });
    setTileActive(src, true);
    const arrow = makeIconCard(scene, stage.cx, y, {
      glyph: "→",
      label: "领牌",
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
    gapX: 4,
    gapY: 6,
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
  const last = pos[pos.length - 1];
  const tip = makeFactChip(scene, stage.cx, last.y + chipH / 2 + rhythm + 24, {
    value: "按字符编号",
    label: "GPT-2 用 BPE，本课不用",
    note: "bpe",
    tip: "GPT-2 会用 BPE。这一课按字符领号码牌。",
    accent: C.violet,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
  scene.frame.stage.add(tip);
}

export function drawSeatExample(scene, stage, { instant } = {}) {
  const cards = [
    { glyph: "e", label: "Second 的 e", accent: C.teal },
    { glyph: "43", label: "同一座位", accent: C.gold },
    { glyph: "e", label: "Citizen 的 e", accent: C.teal },
  ];
  const row = drawIconRow(scene, stage, { instant }, cards);
  const tip = makeFactChip(scene, stage.cx, row.bottom + lessonRhythm(scene.frame.v) + 24, {
    value: "43 ≠ 性格",
    label: "号码只是座位号",
    note: "plates",
    tip: "两个 e 都是 43。大号码也不更重要。",
    accent: C.gold,
    width: Math.min(300, stage.w - 12),
    height: 48,
  });
  scene.frame.stage.add(tip);
}

export function drawVocabExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  const statH = Math.min(110, Math.max(78, Math.min(stage.h * 0.32, 110)));
  const node = makeBigStat(scene, stage.cx, stage.top + statH / 2 + 4, {
    value: String(VOCAB_SIZE),
    label: "换行+空格+标点+A-Z+a-z",
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
  const tip = makeFactChip(scene, stage.right - Math.min(150, stage.w * 0.34), gridTop + tile + 28, {
    value: "不是宇宙词表",
    label: "只数这套剧本",
    tip: "去重以后 65 个字符。",
    accent: C.pink,
    width: Math.min(200, stage.w * 0.4),
    height: 48,
  });
  scene.frame.stage.add(tip);
}

export function drawScrollExample(scene, stage, { instant } = {}) {
  const row = drawIconRow(scene, stage, { instant }, [
    { glyph: "练", label: `练习 ${DATASET.trainTokens.toLocaleString("zh-CN")}`, accent: C.coral },
    { glyph: "验", label: `验收 ${DATASET.valTokens.toLocaleString("zh-CN")}`, accent: C.gold },
  ]);
  const tip = makeFactChip(scene, stage.cx, row.bottom + lessonRhythm(scene.frame.v) + 24, {
    value: "验收不是答题纸",
    label: "九成学 · 一成抽查",
    note: "scrolls",
    tip: "同一卷按 9:1 切开。验收用来抽查。",
    accent: C.pink,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
  scene.frame.stage.add(tip);
}

export function drawClipExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: false, showY: false, notFromStart: true });
}

export function drawSeenExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: false, xTag: "x 现在看到的牌" });
}

export function drawShiftExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, {
    showX: true,
    showY: true,
    xTag: "x 现在看到的",
    yTag: "y 往右挪一格",
    alignArrows: true,
  });
}

export function drawBlankExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: true, allOn: true, xTag: "填空线索", yTag: "每格一空" });
  if (stage.h > 200) {
    const board = makePairBoard(scene, stage.cx, stage.top + Math.min(stage.h - 40, 168), {
      width: Math.min(340, stage.w - 16),
      height: 58,
    });
    scene.frame.stage.add(board);
    board.show("S", "e", "空1：看见 S，填右边的 e");
  }
}

export function drawChoiceExample(scene, stage, { instant } = {}) {
  const w = Math.min(200, (stage.w - 16) / 2);
  const h = Math.min(100, stage.h * 0.34);
  [
    { value: String(VOCAB_SIZE), label: "每道题的候选", accent: C.coral },
    { value: "1", label: "真答案只有 e", accent: C.gold },
  ].forEach((fact, i) => {
    const x = stage.cx + (i - 0.5) * (w + 12);
    const node = makeBigStat(scene, x, stage.top + h / 2 + 8, { ...fact, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
}

export function drawDeskExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: true, xTag: "学生卷 x", yTag: "评分桌 y" });
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
  const tip = makeFactChip(scene, stage.cx, startY + (rows - 1) * (tile + gap) + tile / 2 + rhythm + 24, {
    value: "真答案是 e",
    label: "不写假数字 · 押得矮就罚得多",
    note: "penalty",
    tip: "交叉熵只问真答案那一格。本游戏没有训练。",
    accent: C.coral,
    width: Math.min(340, stage.w - 12),
    height: 46,
  });
  scene.frame.stage.add(tip);
  popIn(scene, tip, { instant, delay: 60 });
}

export function drawMeanExample(scene, stage, { instant } = {}) {
  const row = drawIconRow(scene, stage, { instant }, [
    { glyph: "16", label: "每格一题", accent: C.blue },
    { glyph: "+", label: "整段加起来", accent: C.violet },
    { glyph: "均", label: "只看平均分", accent: C.gold },
  ]);
  const tip = makeFactChip(scene, stage.cx, row.bottom + lessonRhythm(scene.frame.v) + 24, {
    value: "不编造分数",
    label: "通关 ≠ 已经训练好",
    note: "penalty",
    tip: "本游戏没有训练，也不写出假的 loss 数字。",
    accent: C.pink,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
  scene.frame.stage.add(tip);
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

function layoutTokens(stage) {
  const tight = stage.h < 280;
  const metrics = tokenMetrics(STREAM.length, stage.w, {
    maxW: Math.min(tight ? 32 : 42, stage.w / 18),
    maxH: Math.min(tight ? 42 : 56, stage.h / (tight ? 8 : 6.2)),
    minW: 16,
    gap: tight ? 3 : 4,
  });
  const total = STREAM.length * metrics.tileW + (STREAM.length - 1) * metrics.gapX;
  const startX = stage.cx - total / 2 + metrics.tileW / 2;
  const gapY = tight ? 18 : 30;
  const streamY = stage.top + (tight ? 22 : 30) + metrics.tileH / 2;
  const xY = streamY + metrics.tileH + gapY;
  const yY = xY + metrics.tileH + gapY;
  const streamPos = STREAM.map((_, i) => ({
    x: startX + i * (metrics.tileW + metrics.gapX),
    y: streamY,
  }));
  return {
    metrics,
    streamPos,
    xPos: streamPos.slice(0, DEMO_BLOCK).map((p) => ({ x: p.x, y: xY })),
    yPos: streamPos.slice(1, DEMO_BLOCK + 1).map((p) => ({ x: p.x, y: yY })),
    xY,
    yY,
  };
}

function drawWindowRows(
  scene,
  stage,
  { instant } = {},
  { showX, showY, highlight = -1, allOn = false, notFromStart = false, xTag = "现在看到的牌", yTag = "下一字", alignArrows = false },
) {
  const layout = layoutTokens(stage);
  scene.frame.stage.add(addSectionTag(scene, "纸带", C.violet, { left: stage.left, top: stage.top + 2 }));

  if (notFromStart) {
    const first = layout.streamPos[0];
    const dotsX = first.x - layout.metrics.tileW - 8;
    for (let i = 0; i < 3; i += 1) {
      const node = makeCharTile(scene, dotsX - i * (layout.metrics.tileW * 0.55), first.y, "…", {
        width: Math.max(16, layout.metrics.tileW * 0.7),
        height: layout.metrics.tileH,
        seed: "dot",
      });
      node.setAlpha(0.28);
      scene.frame.stage.add(node);
    }
    const tag = makeTag(scene, dotsX - 8, first.y - layout.metrics.tileH * 0.7, "前面还很长", C.violet);
    tag.setAlpha(0.7);
    scene.frame.stage.add(tag);
  }

  STREAM.forEach((id, i) => {
    const chip = makeChip(scene, layout.streamPos[i].x, layout.streamPos[i].y, {
      glyph: displayGlyph(STREAM_GLYPHS[i]),
      id,
      accent: C.violet,
      width: layout.metrics.tileW,
      height: layout.metrics.tileH,
    });
    const inX = i < DEMO_BLOCK;
    const inY = i >= 1 && i <= DEMO_BLOCK;
    chip.setAlpha(showY ? (inY || inX ? 1 : 0.28) : inX ? 1 : 0.28);
    scene.frame.stage.add(chip);
    if (highlight === i || (allOn && inX)) highlightChip(scene, chip, true);
  });

  const first = layout.streamPos[0];
  const last = layout.streamPos[DEMO_BLOCK - 1];
  const winW = last.x - first.x + layout.metrics.tileW + 8;
  const winH = layout.metrics.tileH + 16;
  const shift = showY ? layout.streamPos[1].x - layout.streamPos[0].x : 0;
  const win = makeWindowFrame(scene, (first.x + last.x) / 2 + shift, first.y, winW, winH, showY ? C.gold : C.blue);
  scene.frame.stage.add(win);
  popIn(scene, win, { instant });

  if (showX) {
    scene.frame.stage.add(
      addSectionTag(scene, xTag, C.blue, { left: stage.left, top: layout.xY - layout.metrics.tileH / 2 - 20 }),
    );
    DEMO_IDS.forEach((id, i) => {
      const chip = makeChip(scene, layout.xPos[i].x, layout.xPos[i].y, {
        glyph: displayGlyph(CHARS[i]),
        id,
        accent: C.blue,
        width: layout.metrics.tileW,
        height: layout.metrics.tileH,
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
        top: layout.yY - layout.metrics.tileH / 2 - 20,
        note: yTag.includes("挪") || yTag.includes("评分") ? "shift" : undefined,
      }),
    );
    const plus = makeTag(scene, win.x + winW / 2 + 22, first.y, "挪一格", C.gold);
    scene.frame.stage.add(plus);
    popIn(scene, plus, { instant });
    DEMO_Y_IDS.forEach((id, i) => {
      const chip = makeChip(scene, layout.yPos[i].x, layout.yPos[i].y, {
        glyph: displayGlyph(STREAM_GLYPHS[i + 1]),
        id,
        accent: C.gold,
        width: layout.metrics.tileW,
        height: layout.metrics.tileH,
      });
      scene.frame.stage.add(chip);
      if (highlight === i || allOn) highlightChip(scene, chip, true);
      popIn(scene, chip, { instant, delay: i * 8 });
      if (alignArrows && i < 3 && layout.xPos[i]) {
        const mark = scene.add
          .text((layout.xPos[i].x + layout.yPos[i].x) / 2, (layout.xPos[i].y + layout.yPos[i].y) / 2, "↓", uiText(14, { color: C.coralCss }))
          .setOrigin(0.5);
        scene.frame.stage.add(mark);
      }
    });
  }
}

