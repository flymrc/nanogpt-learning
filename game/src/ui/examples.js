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
  makeWindowFrame,
  markCaption,
  setTileActive,
} from "./components.js";
import { ctaCeiling, makeBigStat, makeIconCard, popIn } from "./lesson.js";
import { isWidePcTutor } from "../tutor/bus.js";
import {
  CAPTION_CLEAR,
  CHIP_GAP_X,
  CHIP_GAP_Y,
  MIN_CHIP_H,
  STICKER_SHADOW_Y,
  fitChipGrid,
  lessonRhythm,
} from "./layout.js";
import { C, uiText, wrapToWidth } from "./theme.js";

const CHARS = [...DEMO_SNIPPET];
const STREAM = DEMO_STREAM;
const STREAM_GLYPHS = STREAM_CHARS;

export function drawTapeExample(scene, stage, { instant } = {}) {
  const tag = addSectionTag(scene, "纸带 · 16 格", C.pink, { left: stage.left, top: stage.top });
  scene.frame.stage.add(tag);
  const ceiling = exampleCeiling(scene, stage);
  const gridTop = stage.top + tag.height + CAPTION_CLEAR;
  const noteRaw = "空格写成 ␣，换行写成 ↵。一个字占一格。";
  const noteText = wrapToWidth(scene, noteRaw, 13, stage.w - 8, uiText);
  const noteReserve = 40;
  const grid = fitChipGrid(CHARS.length, {
    left: stage.left,
    top: gridTop,
    width: stage.w,
    maxHeight: Math.max(48, ceiling - gridTop - noteReserve),
    maxW: 48,
    maxH: 48,
    minW: 28,
    minH: 28,
    gapX: stage.w >= 720 ? 8 : CHIP_GAP_X,
    gapY: CHIP_GAP_Y,
  });
  CHARS.forEach((ch, i) => {
    const node = makeCharTile(scene, grid.positions[i].x, grid.positions[i].y, displayGlyph(ch), {
      width: grid.tileW,
      height: grid.tileH,
      seed: ch,
    });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 12 });
  });
  const noteY = gridTop + grid.height + STICKER_SHADOW_Y + CAPTION_CLEAR;
  if (noteY + 18 <= ceiling) {
    const note = markCaption(
      scene.add
        .text(stage.cx, noteY, noteText, uiText(13, { color: C.muted, align: "center" }))
        .setOrigin(0.5, 0),
    );
    scene.frame.stage.add(note);
  }
  scene.frame.tapeRows = [{ name: "tape", left: stage.left, top: gridTop, w: stage.w, h: grid.height }];
}

export function drawEncodeExample(scene, stage, { instant } = {}) {
  const phone = !isWidePcTutor();
  const tag = addSectionTag(scene, "一字一号", C.gold, {
    left: stage.left,
    top: stage.top,
    note: "plates",
  });
  scene.frame.stage.add(tag);
  const ceiling = exampleCeiling(scene, stage);
  let gridTop = stage.top + tag.height + CAPTION_CLEAR;
  const needDemo = !phone && ceiling - gridTop > 220;
  if (needDemo) {
    const y = gridTop + 28;
    const src = makeCharTile(scene, stage.cx - 96, y, "S", { width: 44, height: 44, seed: "S" });
    setTileActive(src, true);
    const arrow = makeIconCard(scene, stage.cx, y, {
      glyph: "→",
      label: "发牌",
      accent: C.coral,
      width: 72,
      height: 52,
    });
    const chip = makeChip(scene, stage.cx + 96, y, {
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
      burstStars(scene, stage.cx + 96, y);
    }
    gridTop = y + 26 + STICKER_SHADOW_Y + CAPTION_CLEAR;
  }
  const factH = phone ? 0 : 48;
  const grid = fitChipGrid(CHARS.length, {
    left: stage.left,
    top: gridTop,
    width: stage.w,
    maxHeight: Math.max(MIN_CHIP_H, ceiling - gridTop - (factH ? factH + CAPTION_CLEAR + STICKER_SHADOW_Y : 0)),
    gapX: stage.w >= 720 ? 8 : CHIP_GAP_X,
    gapY: CHIP_GAP_Y,
  });
  CHARS.forEach((ch, i) => {
    const node = makeChip(scene, grid.positions[i].x, grid.positions[i].y, {
      glyph: displayGlyph(ch),
      id: DEMO_IDS[i],
      accent: i === 0 || i === 1 || i === 15 ? C.coral : C.teal,
      width: grid.tileW,
      height: grid.tileH,
    });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 10 });
  });
  scene.frame.tapeRows = [{ name: "tape", left: stage.left, top: gridTop, w: stage.w, h: grid.height }];
  if (phone) return;
  placeFactBelow(scene, stage, gridTop + grid.height, {
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
  placeFactBelow(scene, stage, row.bottom, {
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
  const gridTop = stage.top + statH + rhythm + CAPTION_CLEAR;
  const grid = fitChipGrid(sample.length, {
    left: stage.left,
    top: gridTop,
    width: stage.w,
    maxHeight: Math.max(36, stage.bottom - gridTop - 80),
    maxW: 32,
    maxH: 32,
    minW: 18,
    minH: 18,
    gapX: CHIP_GAP_X,
    gapY: CHIP_GAP_Y,
  });
  sample.forEach((ch, i) => {
    const cell = makeCharTile(scene, grid.positions[i].x, grid.positions[i].y, displayGlyph(ch), {
      width: grid.tileW,
      height: grid.tileH,
      seed: ch,
    });
    scene.frame.stage.add(cell);
  });
  placeFactBelow(scene, stage, gridTop + grid.height, {
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
  placeFactBelow(scene, stage, row.bottom, {
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
  const letters = [...CHARSET];
  const gridTop = stage.top + 26 + rhythm;
  const grid = fitChipGrid(letters.length, {
    left: stage.left,
    top: gridTop,
    width: stage.w,
    maxHeight: Math.max(80, exampleCeiling(scene, stage) - gridTop - 80),
    maxW: 28,
    maxH: 28,
    minW: 16,
    minH: 16,
    gapX: CHIP_GAP_X,
    gapY: CHIP_GAP_Y,
  });
  const trueChar = "e";
  letters.forEach((ch, i) => {
    const on = ch === trueChar;
    const cell = makeCharTile(scene, grid.positions[i].x, grid.positions[i].y, displayGlyph(ch), {
      width: grid.tileW,
      height: grid.tileH,
      seed: on ? "gold" : ch,
    });
    cell.setAlpha(on ? 1 : 0.45);
    if (on) setTileActive(cell, true);
    scene.frame.stage.add(cell);
  });
  const tip = placeFactBelow(scene, stage, gridTop + grid.height, {
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
  placeFactBelow(scene, stage, row.bottom, {
    value: "不编分数",
    label: "通关还没训练",
    note: "penalty",
    tip: "这一课没有训练，也不写出假的罚分。",
    accent: C.pink,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
}

function exampleCeiling(scene, stage) {
  return Math.min(stage.bottom - 2, ctaCeiling(scene.frame) - 4);
}

function placeFactInBand(scene, stage, y, opts) {
  const h = opts.height ?? 48;
  if (y + h / 2 > exampleCeiling(scene, stage)) return null;
  const tip = makeFactChip(scene, stage.cx, y, opts);
  scene.frame.stage.add(tip);
  return tip;
}

function placeFactBelow(scene, stage, bodyBottom, opts) {
  const h = opts.height ?? 48;
  const y = bodyBottom + STICKER_SHADOW_Y + CAPTION_CLEAR + h / 2;
  return placeFactInBand(scene, stage, y, opts);
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

function drawPlaceholders(scene, stage, top) {
  const tag = addSectionTag(scene, "前面还有", C.violet, { left: stage.left, top });
  scene.frame.stage.add(tag);
  const dot = 28;
  const gap = Math.max(CHIP_GAP_X, 8);
  const dotH = 36;
  const y = top + tag.height + CAPTION_CLEAR + dotH / 2;
  for (let i = 0; i < 3; i += 1) {
    const node = makeCharTile(scene, stage.left + dot / 2 + i * (dot + gap), y, "…", {
      width: dot,
      height: dotH,
      seed: "dot",
    });
    node.setData("kind", "placeholder");
    node.setAlpha(0.55);
    scene.frame.stage.add(node);
  }
  return { bottom: y + dotH / 2 + STICKER_SHADOW_Y };
}

function drawWindowRows(
  scene,
  stage,
  { instant } = {},
  { showX, showY, highlight = -1, allOn = false, notFromStart = false, xTag = "现在看到的牌", yTag = "下一字" },
) {
  const phone = !isWidePcTutor();
  const ceiling = exampleCeiling(scene, stage);
  let cursor = stage.top;
  if (notFromStart) {
    cursor = drawPlaceholders(scene, stage, cursor).bottom + CAPTION_CLEAR;
  }

  const specs = [
    {
      id: "stream",
      name: "row-stream",
      label: notFromStart ? "纸带 · 前面还有" : "纸带",
      accent: C.violet,
      count: STREAM.length,
    },
  ];
  if (showX) specs.push({ id: "x", name: "row-x", label: xTag, accent: C.blue, count: DEMO_IDS.length });
  if (showY) {
    specs.push({
      id: "y",
      name: "row-y",
      label: yTag,
      accent: C.gold,
      count: DEMO_Y_IDS.length,
      note: yTag.includes("挪") || yTag.includes("右移") || yTag.includes("评分") ? "shift" : undefined,
    });
  }

  const tagH = 26;
  const tagGap = CAPTION_CLEAR + 2;
  const afterGrid = STICKER_SHADOW_Y + tagGap;
  const gapX = stage.w >= 720 ? 8 : CHIP_GAP_X;
  const bandStart = cursor;
  const planBands = (list) => {
    const overhead =
      list.length * (tagH + tagGap) + Math.max(0, list.length - 1) * afterGrid + STICKER_SHADOW_Y;
    const gridMaxH = Math.max(1, (ceiling - bandStart - overhead) / list.length);
    const grids = {};
    const gridTops = {};
    let y = bandStart;
    list.forEach((spec) => {
      gridTops[spec.id] = y + tagH + tagGap;
      grids[spec.id] = fitChipGrid(spec.count, {
        left: stage.left,
        top: gridTops[spec.id],
        width: stage.w,
        maxHeight: gridMaxH,
        gapX,
        gapY: CHIP_GAP_Y,
      });
      y = gridTops[spec.id] + grids[spec.id].height + afterGrid;
    });
    return { grids, gridTops, bottom: y - CAPTION_CLEAR };
  };
  let planned = planBands(specs);
  if (planned.bottom > ceiling + 1 && showX && specs.some((spec) => spec.id === "stream")) {
    specs.splice(0, specs.length, ...specs.filter((spec) => spec.id !== "stream"));
    planned = planBands(specs);
  }
  const grids = planned.grids;
  const gridTops = planned.gridTops;

  const singleRow = specs.every((spec) => grids[spec.id].rows === 1);
  if (singleRow && showX && grids.stream) {
    const stream = grids.stream;
    const xs = stream.positions.map((p) => p.x);
    const share = (id, indexes) => {
      const y = grids[id].positions[0].y;
      grids[id] = {
        ...stream,
        positions: indexes.map((index, col) => ({ x: xs[index], y, row: 0, col })),
        height: stream.tileH,
        rows: 1,
      };
    };
    share("x", STREAM.map((_, i) => i).slice(0, DEMO_BLOCK));
    if (showY) share("y", STREAM.map((_, i) => i).slice(1, DEMO_BLOCK + 1));
    if (showY && xs[DEMO_BLOCK] != null) {
      const limit = stage.right - stream.tileW / 2;
      if (xs[DEMO_BLOCK] > limit) {
        const shiftBack = xs[DEMO_BLOCK] - limit;
        for (const id of ["stream", "x", "y"]) {
          if (!grids[id]) continue;
          grids[id].positions = grids[id].positions.map((p) => ({ ...p, x: p.x - shiftBack }));
        }
      }
    }
  }

  const streamGrid = grids.stream;
  if (!phone && streamGrid?.rows === 1) {
    const windowPositions = streamGrid.positions.slice(0, DEMO_BLOCK);
    const first = windowPositions[0];
    const last = windowPositions[windowPositions.length - 1];
    const shift = showY ? streamGrid.tileW + streamGrid.gapX : 0;
    const winW = last.x - first.x + streamGrid.tileW + 6;
    const winH = streamGrid.tileH + 4;
    const win = makeWindowFrame(
      scene,
      (first.x + last.x) / 2 + shift,
      first.y,
      winW,
      winH,
      showY ? C.gold : C.blue,
    );
    scene.frame.stage.add(win);
  }

  specs.forEach((spec) => {
    scene.frame.stage.add(
      addSectionTag(scene, spec.label, spec.accent, {
        left: stage.left,
        top: gridTops[spec.id] - tagH - tagGap,
        note: spec.note,
      }),
    );
  });

  const paint = (grid, items, accent, opts = {}) => {
    items.forEach((item, i) => {
      const pos = grid.positions[i];
      if (!pos) return;
      const chip = makeChip(scene, pos.x, pos.y, {
        glyph: item.glyph,
        id: item.id,
        accent,
        width: grid.tileW,
        height: grid.tileH,
      });
      if (item.alpha != null) chip.setAlpha(item.alpha);
      scene.frame.stage.add(chip);
      if (item.on) highlightChip(scene, chip, true);
      popIn(scene, chip, { instant, delay: i * 8 });
    });
  };

  if (streamGrid) paint(
    streamGrid,
    STREAM.map((id, i) => {
      const inX = i < DEMO_BLOCK;
      const inY = i >= 1 && i <= DEMO_BLOCK;
      return {
        glyph: displayGlyph(STREAM_GLYPHS[i]),
        id,
        alpha: showY ? (inY || inX ? 1 : 0.45) : inX ? 1 : 0.45,
        on: highlight === i || (allOn && inX),
      };
    }),
    C.violet,
  );
  if (showX) {
    paint(
      grids.x,
      DEMO_IDS.map((id, i) => ({
        glyph: displayGlyph(CHARS[i]),
        id,
        on: highlight === i || allOn,
      })),
      C.blue,
    );
  }
  if (showY) {
    paint(
      grids.y,
      DEMO_Y_IDS.map((id, i) => ({
        glyph: displayGlyph(STREAM_GLYPHS[i + 1]),
        id,
        on: highlight === i || allOn,
      })),
      C.gold,
    );
  }

  scene.frame.tapeRows = specs.map((spec) => {
    const grid = grids[spec.id];
    const top = Math.min(...grid.positions.map((p) => p.y)) - grid.tileH / 2;
    return { name: spec.name, left: stage.left, top, w: stage.w, h: grid.height };
  });
  const lastGrid = grids[specs[specs.length - 1].id];
  const lastTop = Math.min(...lastGrid.positions.map((p) => p.y)) - lastGrid.tileH / 2;
  return { bottom: lastTop + lastGrid.height };
}

