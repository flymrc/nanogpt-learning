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
import { L } from "../i18n/locale.js";
import { C, uiText, wrapToWidth } from "./theme.js";

const CHARS = [...DEMO_SNIPPET];
const STREAM = DEMO_STREAM;
const STREAM_GLYPHS = STREAM_CHARS;

export function drawTapeExample(scene, stage, { instant } = {}) {
  const tag = addSectionTag(scene, L("纸带 · 16 格", "テープ · 16マス"), C.pink, { left: stage.left, top: stage.top });
  scene.frame.stage.add(tag);
  const ceiling = exampleCeiling(scene, stage);
  const gridTop = stage.top + tag.height + CAPTION_CLEAR;
  const noteRaw = L("空格写成 ␣，换行写成 ↵。一个字占一格。", "空白は ␣、改行は ↵。一文字が一マス。");
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
  const tag = addSectionTag(scene, L("一字一号", "一文字一番号"), C.gold, {
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
      label: L("发牌", "配る"),
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
    value: L("一字一号", "一文字一番号"),
    label: L("不是把词切开", "単語では切らない"),
    note: "bpe",
    tip: L("不是把词语切成小碎块。这一课一个字一张牌。", "言葉を小さく砕きません。この課は一文字に一枚。"),
    accent: C.violet,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
}

export function drawSeatExample(scene, stage, { instant } = {}) {
  const cards = [
    { glyph: "e", label: L("前面的 e", "前の e"), accent: C.teal },
    { glyph: "43", label: L("同一张牌", "同じ札"), accent: C.gold },
    { glyph: "e", label: L("后面的 e", "後の e"), accent: C.teal },
  ];
  const row = drawIconRow(scene, stage, { instant }, cards);
  placeFactBelow(scene, stage, row.bottom, {
    value: L("43 是座位", "43 は座席"),
    label: L("不是性格", "性格ではない"),
    note: "plates",
    tip: L("两个 e 都是 43。号码大，也不更重要。", "二つの e はどちらも 43。番号が大きくても大事ではない。"),
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
    label: L("换行、空格、标点、字母", "改行、空白、記号、字母"),
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
    value: L("只有 65 张", "65 枚だけ"),
    label: L("只数这套剧本", "この脚本だけ"),
    tip: L("剧本里出现过的字，相同的只算一张，一共 65 张。", "脚本に出た字は、同じものを一枚にして、65 枚。"),
    accent: C.pink,
    width: Math.min(200, stage.w * 0.4),
    height: 48,
  });
}

export function drawScrollExample(scene, stage, { instant } = {}) {
  const row = drawIconRow(scene, stage, { instant }, [
    { glyph: L("练", "練"), label: L("练习卷", "練習"), accent: C.coral },
    { glyph: L("验", "確"), label: L("验收卷", "確認"), accent: C.gold },
  ]);
  placeFactBelow(scene, stage, row.bottom, {
    value: L("不是答题纸", "答案用紙ではない"),
    label: L("九成学，一成抽查", "九割学び、一割確認"),
    note: "scrolls",
    tip: L("同一条纸带按大约 9 比 1 切开。验收卷用来抽查。", "同じ紙テープをおよそ 9 対 1 で切る。確認用は抜き打ち。"),
    accent: C.pink,
    width: Math.min(320, stage.w - 12),
    height: 48,
  });
}

export function drawClipExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: false, showY: false, notFromStart: true });
}

export function drawSeenExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: false, xTag: L("x 现在看见的", "x 今見ている") });
}

export function drawShiftExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, {
    showX: true,
    showY: true,
    xTag: L("x 现在看见的", "x 今見ている"),
    yTag: L("y 右移一格", "y を右へ"),
    linkShift: true,
    alignArrows: true,
  });
}

export function drawBlankExample(scene, stage, opts) {
  const rows = drawWindowRows(scene, stage, opts, { showX: true, showY: true, allOn: true, xTag: L("线索 x", "手がかり x"), yTag: L("答案 y", "答え y") });
  const boardH = 58;
  const boardY = (rows?.bottom || stage.top) + 40;
  if (boardY + boardH / 2 <= stage.bottom) {
    const board = makePairBoard(scene, stage.cx, boardY, {
      width: Math.min(340, stage.w - 16),
      height: boardH,
    });
    scene.frame.stage.add(board);
    board.show("S", "e", L("第 1 空：看见 S，填右边的 e", "1問目：S を見て、右の e"));
  }
}

export function drawChoiceExample(scene, stage, { instant } = {}) {
  const w = Math.min(200, (stage.w - 16) / 2);
  const h = Math.min(100, stage.h * 0.34);
  [
    { value: String(VOCAB_SIZE), label: L("每题的候选", "各問の候補"), accent: C.coral },
    { value: "1", label: L("真答案只有 e", "正解は e だけ"), accent: C.gold },
  ].forEach((fact, i) => {
    const x = stage.cx + (i - 0.5) * (w + 12);
    const node = makeBigStat(scene, x, stage.top + h / 2 + 8, { ...fact, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
}

export function drawDeskExample(scene, stage, opts) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: true, xTag: L("线索 x", "手がかり x"), yTag: L("评分桌 y", "採点机 y"), linkShift: true });
}

export function drawScoreExample(scene, stage, { instant } = {}) {
  const rhythm = lessonRhythm(scene.frame.v);
  scene.frame.stage.add(
    addSectionTag(scene, L("只点亮真答案", "正解だけ点灯"), C.coral, { left: stage.left, top: stage.top, note: "penalty" }),
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
    value: L("真答案是 e", "正解は e"),
    label: L("押得矮，罚分就大", "低いと罰点が大きい"),
    note: "penalty",
    tip: L("只看真答案那一格。这一课不写假的罚分。", "正解のマスだけを見る。偽の罰点は書かない。"),
    accent: C.coral,
    width: Math.min(340, stage.w - 12),
    height: 46,
  });
  if (tip) popIn(scene, tip, { instant, delay: 60 });
}

export function drawMeanExample(scene, stage, { instant } = {}) {
  const row = drawIconRow(scene, stage, { instant }, [
    { glyph: "16", label: L("每格一题", "各1問"), accent: C.blue },
    { glyph: "+", label: L("加在一起", "合計"), accent: C.violet },
    { glyph: L("均", "均"), label: L("再取平均", "平均"), accent: C.gold },
  ]);
  placeFactBelow(scene, stage, row.bottom, {
    value: L("不编分数", "点数は作らない"),
    label: L("通关还没训练", "クリアは未学習"),
    note: "penalty",
    tip: L("这一课没有训练，也不写出假的罚分。", "この課に学習は無く、偽の罰点も書かない。"),
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
  const tag = addSectionTag(scene, L("前面还有", "前はまだ"), C.violet, { left: stage.left, top });
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
  { showX, showY, highlight = -1, allOn = false, notFromStart = false, linkShift = false, xTag = L("现在看到的牌", "今の札"), yTag = L("下一字", "次の字") },
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
      label: notFromStart ? L("纸带 · 前面还有", "テープ · 前はまだ") : L("纸带", "テープ"),
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
      note: linkShift ? "shift" : undefined,
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

