import Phaser from "phaser";
import { LEVEL2_BEATS, STREAM_CHARS } from "../data/beats.js";
import {
  DEMO_BLOCK,
  DEMO_IDS,
  DEMO_STREAM,
  DEMO_Y_IDS,
  REAL_BATCH,
  REAL_BLOCK,
  TOKENS_PER_ITER,
  VOCAB_SIZE,
  displayGlyph,
} from "../data/facts.js";
import {
  addSectionTag,
  highlightChip,
  makeChip,
  makePairBoard,
  makeTag,
  makeWindowFrame,
} from "../ui/components.js";
import {
  clearLayer,
  makeBigStat,
  makeIconCard,
  makeLessonFrame,
  popIn,
  teach,
} from "../ui/lesson.js";
import { tokenMetrics, watchResize } from "../ui/layout.js";
import { C } from "../ui/theme.js";

const STREAM = DEMO_STREAM;
const CHARS = STREAM_CHARS;

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  create() {
    const frame = makeLessonFrame(this, {
      level: 2,
      total: 2,
      title: "窗口与 (x, y)",
    });
    this.frame = frame;
    this.view = frame.v;
    this.beat = 0;
    this.busy = false;

    watchResize(this, {
      restart: true,
      persist: () => this.registry.set("level2.progress", { beat: this.beat }),
    });

    const saved = this.registry.get("level2.progress");
    if (saved) {
      this.registry.remove("level2.progress");
      this.beat = Math.min(LEVEL2_BEATS.length - 1, saved.beat || 0);
      this.showBeat(this.beat, { instant: true });
    } else {
      this.showBeat(0);
    }
  }

  advance() {
    if (this.busy) return;
    if (this.beat >= LEVEL2_BEATS.length - 1) {
      this.registry.remove("level2.progress");
      this.scene.start("End");
      return;
    }
    this.beat += 1;
    this.showBeat(this.beat);
  }

  showBeat(index, { instant = false } = {}) {
    const beat = LEVEL2_BEATS[index];
    teach(this, this.frame.purpose, this.frame.speech, beat, {
      index,
      total: LEVEL2_BEATS.length,
    });
    this.frame.nextBtn.setLabel(index === LEVEL2_BEATS.length - 1 ? "走起" : "下一步");
    this.frame.nextBtn.setCaption(index === LEVEL2_BEATS.length - 1 ? "看契约" : "点一下");
    this.children.bringToTop(this.frame.nextBtn);
    clearLayer(this.frame.stage);
    RENDERERS[beat.id]?.(this, this.frame.stageBand, { instant });
  }
}

const RENDERERS = {
  why: (scene, stage, opts) =>
    drawIconRow(scene, stage, opts, [
      { glyph: "带", label: "train.bin", accent: C.violet },
      { glyph: "框", label: "切窗口", accent: C.blue },
      { glyph: "下", label: "预测下一位", accent: C.gold },
    ]),
  stream: (scene, stage, opts) => drawStreamOnly(scene, stage, opts),
  x: (scene, stage, opts) => drawWindowRows(scene, stage, opts, { showX: true, showY: false }),
  y: (scene, stage, opts) => drawWindowRows(scene, stage, opts, { showX: true, showY: true }),
  "pair-se": (scene, stage, opts) => drawPair(scene, stage, opts, 0),
  "pair-ec": (scene, stage, opts) => drawPair(scene, stage, opts, 1),
  "pair-nw": (scene, stage, opts) => drawPair(scene, stage, opts, DEMO_BLOCK - 1),
  all: (scene, stage, opts) => drawWindowRows(scene, stage, opts, { showX: true, showY: true, allOn: true }),
  block: (scene, stage, opts) =>
    drawStats(scene, stage, opts, [
      { value: String(DEMO_BLOCK), label: "演示 block", accent: C.blue },
      { value: String(REAL_BLOCK), label: "正式 block_size", accent: C.gold },
    ]),
  batch: (scene, stage, opts) =>
    drawStats(scene, stage, opts, [
      { value: String(REAL_BATCH), label: "batch_size", accent: C.teal },
      { value: `(${REAL_BATCH},${REAL_BLOCK})`, label: "x / y 形状", accent: C.blue },
    ]),
  tokens: (scene, stage, opts) =>
    drawStats(scene, stage, opts, [
      { value: String(TOKENS_PER_ITER), label: "单卡 tokens/iter", accent: C.gold },
    ]),
  loss: (scene, stage, opts) =>
    drawStats(scene, stage, opts, [
      { value: String(VOCAB_SIZE), label: "每个位置的类数", accent: C.coral },
      { value: "CE", label: "对齐 y[t]", accent: C.gold },
    ]),
  contract: (scene, stage, opts) =>
    drawIconRow(scene, stage, opts, [
      { glyph: "x[t]", label: "输入", accent: C.blue },
      { glyph: "65", label: "模型打分", accent: C.violet },
      { glyph: "y[t]", label: "cross_entropy", accent: C.gold },
    ]),
};

function drawIconRow(scene, stage, { instant }, cards) {
  const n = cards.length;
  const w = Math.min(150, (stage.w - 20) / n - 8);
  const h = Math.min(120, Math.max(88, stage.h * 0.42));
  cards.forEach((card, i) => {
    const x = stage.cx + (i - (n - 1) / 2) * (w + 14);
    const node = makeIconCard(scene, x, stage.cy, { ...card, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
}

function layoutTokens(stage) {
  const tight = stage.h < 400;
  const metrics = tokenMetrics(STREAM.length, stage.w, {
    maxW: Math.min(tight ? 36 : 48, stage.w / 18),
    maxH: Math.min(tight ? 48 : 64, stage.h / (tight ? 7.5 : 6)),
    minW: 16,
    gap: tight ? 3 : 4,
  });
  const total = STREAM.length * metrics.tileW + (STREAM.length - 1) * metrics.gapX;
  const startX = stage.cx - total / 2 + metrics.tileW / 2;
  const gapY = tight ? 22 : 36;
  const streamY = stage.top + (tight ? 26 : 36) + metrics.tileH / 2;
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
    streamY,
    xY,
    yY,
  };
}

function drawStreamOnly(scene, stage, { instant }) {
  const layout = layoutTokens(stage);
  scene.frame.stage.add(addSectionTag(scene, "带", C.violet, { left: stage.left, top: stage.top + 2 }));
  STREAM.forEach((id, i) => {
    const chip = makeChip(scene, layout.streamPos[i].x, layout.streamPos[i].y, {
      glyph: displayGlyph(CHARS[i]),
      id,
      accent: C.violet,
      width: layout.metrics.tileW,
      height: layout.metrics.tileH,
    });
    scene.frame.stage.add(chip);
    popIn(scene, chip, { instant, delay: i * 12 });
  });
}

function drawWindowRows(scene, stage, { instant }, { showX, showY, highlight = -1, allOn = false }) {
  const layout = layoutTokens(stage);
  scene.frame.stage.add(addSectionTag(scene, "带", C.violet, { left: stage.left, top: stage.top + 2 }));
  const streamChips = STREAM.map((id, i) => {
    const chip = makeChip(scene, layout.streamPos[i].x, layout.streamPos[i].y, {
      glyph: displayGlyph(CHARS[i]),
      id,
      accent: C.violet,
      width: layout.metrics.tileW,
      height: layout.metrics.tileH,
    });
    const inX = i < DEMO_BLOCK;
    const inY = i >= 1 && i <= DEMO_BLOCK;
    chip.setAlpha(showY ? (inY || inX ? 1 : 0.28) : inX ? 1 : 0.28);
    scene.frame.stage.add(chip);
    return chip;
  });

  const first = layout.streamPos[0];
  const last = layout.streamPos[DEMO_BLOCK - 1];
  const winW = last.x - first.x + layout.metrics.tileW + 8;
  const winH = layout.metrics.tileH + 18;
  const shift = showY ? layout.streamPos[1].x - layout.streamPos[0].x : 0;
  const win = makeWindowFrame(
    scene,
    (first.x + last.x) / 2 + shift,
    first.y,
    winW,
    winH,
    showY ? C.gold : C.blue,
  );
  scene.frame.stage.add(win);
  popIn(scene, win, { instant });

  if (showX) {
    scene.frame.stage.add(
      addSectionTag(scene, "x", C.blue, { left: stage.left, top: layout.xY - layout.metrics.tileH / 2 - 22 }),
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
      popIn(scene, chip, { instant, delay: i * 10 });
    });
  }

  if (showY) {
    scene.frame.stage.add(
      addSectionTag(scene, "y", C.gold, { left: stage.left, top: layout.yY - layout.metrics.tileH / 2 - 22 }),
    );
    const plus = makeTag(scene, win.x + winW / 2 + 18, first.y, "+1", C.gold);
    scene.frame.stage.add(plus);
    popIn(scene, plus, { instant });
    DEMO_Y_IDS.forEach((id, i) => {
      const chip = makeChip(scene, layout.yPos[i].x, layout.yPos[i].y, {
        glyph: displayGlyph(CHARS[i + 1]),
        id,
        accent: C.gold,
        width: layout.metrics.tileW,
        height: layout.metrics.tileH,
      });
      scene.frame.stage.add(chip);
      if (highlight === i || allOn) highlightChip(scene, chip, true);
      popIn(scene, chip, { instant, delay: i * 10 });
    });
    if (highlight >= 0) {
      highlightChip(scene, streamChips[highlight], true);
      highlightChip(scene, streamChips[highlight + 1], true);
    }
  }
}

function drawPair(scene, stage, opts, t) {
  drawWindowRows(scene, stage, opts, { showX: true, showY: true, highlight: t });
  const boardH = Math.min(stage.h < 400 ? 64 : 88, stage.h * 0.2);
  const board = makePairBoard(scene, stage.cx, Math.min(stage.bottom - boardH / 2 - 2, stage.cy + stage.h * 0.38), {
    width: Math.min(360, stage.w - 16),
    height: boardH,
  });
  scene.frame.stage.add(board);
  board.show(displayGlyph(CHARS[t]), displayGlyph(CHARS[t + 1]), `${DEMO_IDS[t]} → ${DEMO_Y_IDS[t]}`);
}

function drawStats(scene, stage, { instant }, facts) {
  const n = facts.length;
  const w = Math.min(230, n === 1 ? stage.w * 0.7 : (stage.w - 16) / n - 10);
  const h = Math.min(130, Math.max(90, stage.h * 0.4));
  facts.forEach((fact, i) => {
    const x = stage.cx + (i - (n - 1) / 2) * (w + 12);
    const node = makeBigStat(scene, x, stage.cy, { ...fact, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
}
