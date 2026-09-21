import Phaser from "phaser";
import { LEVEL1_BEATS, SNIPPET_CHARS } from "../data/beats.js";
import { DATASET, DEMO_IDS, VOCAB_SIZE, displayGlyph } from "../data/facts.js";
import { playSfx } from "../audio/sound.js";
import {
  addSectionTag,
  burstStars,
  highlightChip,
  makeCharTile,
  makeChip,
  makeFactChip,
  setTileActive,
} from "../ui/components.js";
import {
  clearLayer,
  makeBigStat,
  makeIconCard,
  makeLessonFrame,
  popIn,
  teach,
} from "../ui/lesson.js";
import { flowPositions, watchResize } from "../ui/layout.js";
import { C } from "../ui/theme.js";

const CHARS = SNIPPET_CHARS;

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1");
  }

  create() {
    const frame = makeLessonFrame(this, { level: 1, total: 2, title: "手机也会猜字" });
    this.frame = frame;
    this.view = frame.v;
    this.beat = 0;
    this.busy = false;

    watchResize(this, {
      restart: true,
      persist: () => this.registry.set("level1.progress", { beat: this.beat }),
    });

    const saved = this.registry.get("level1.progress");
    if (saved) {
      this.registry.remove("level1.progress");
      this.beat = Math.min(LEVEL1_BEATS.length - 1, saved.beat || 0);
      this.showBeat(this.beat, { instant: true });
    } else {
      this.showBeat(0);
    }
  }

  advance() {
    if (this.busy) return;
    if (this.beat >= LEVEL1_BEATS.length - 1) {
      this.registry.remove("level1.progress");
      this.scene.start("Level2");
      return;
    }
    this.beat += 1;
    this.showBeat(this.beat);
  }

  showBeat(index, { instant = false } = {}) {
    const beat = LEVEL1_BEATS[index];
    teach(this, this.frame.purpose, this.frame.speech, beat, {
      index,
      total: LEVEL1_BEATS.length,
    });
    this.frame.nextBtn.setLabel(index === LEVEL1_BEATS.length - 1 ? "走起" : "下一步");
    this.frame.nextBtn.setCaption(index === LEVEL1_BEATS.length - 1 ? "下一关" : "点一下");
    this.children.bringToTop(this.frame.nextBtn);

    clearLayer(this.frame.stage);
    const render = RENDERERS[beat.id];
    render?.(this, this.frame.stageBand, { instant });
  }
}

const RENDERERS = {
  phone: (scene, stage, opts) =>
    drawIconRow(scene, stage, opts, [
      { glyph: "前", label: "已经看到", accent: C.pink },
      { glyph: "机", label: "输入法", accent: C.coral },
      { glyph: "?", label: "猜下一个", accent: C.gold },
    ]),
  rank: (scene, stage, opts) =>
    drawIconRow(scene, stage, opts, [
      { glyph: "下", label: "最可能", accent: C.gold },
      { glyph: "好", label: "也常见", accent: C.teal },
      { glyph: "啊", label: "比较少", accent: C.violet },
    ]),
  lm: (scene, stage, opts) =>
    drawIconRow(scene, stage, opts, [
      { glyph: "机", label: "语言模型", accent: C.blue },
      { glyph: "榜", label: "下一字排行", accent: C.gold },
    ]),
  "no-letters": (scene, stage, opts) =>
    drawIconRow(scene, stage, opts, [
      { glyph: "文", label: "字母", accent: C.pink },
      { glyph: "→", label: "换成号", accent: C.coral },
      { glyph: "31", label: "号码", accent: C.gold },
    ]),
  contact: (scene, stage, opts) => drawFocusChar(scene, stage, opts, 0, 31, "名片"),
  newline: (scene, stage, opts) => drawFocusChar(scene, stage, opts, CHARS.length - 1, 0, "换行"),
  space: (scene, stage, opts) => drawFocusChar(scene, stage, opts, 6, 1, "空格"),
  reuse: (scene, stage, opts) => drawReuse(scene, stage, opts),
  snippet: (scene, stage, opts) => drawSnippet(scene, stage, opts, { highlight: -1 }),
  sentence: (scene, stage, opts) => drawMappedSentence(scene, stage, opts),
  vocab: (scene, stage, opts) =>
    drawStats(scene, stage, opts, [
      { value: String(VOCAB_SIZE), label: "种不同的字", accent: C.gold },
    ]),
  split: (scene, stage, opts) =>
    drawStats(scene, stage, opts, [
      { value: "九成", label: "练习卷", accent: C.teal },
      { value: "一成", label: "检查卷", accent: C.gold },
    ]),
  tapes: (scene, stage, opts) => drawTapes(scene, stage, opts),
};

function drawIconRow(scene, stage, { instant }, cards) {
  const n = cards.length;
  const w = Math.min(150, (stage.w - 20) / n - 8);
  const h = Math.min(120, Math.max(88, stage.h * 0.42));
  const y = stage.cy;
  cards.forEach((card, i) => {
    const x = stage.cx + (i - (n - 1) / 2) * (w + 14);
    const node = makeIconCard(scene, x, y, { ...card, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
}

function drawSnippet(scene, stage, { instant }, { highlight }) {
  scene.frame.stage.add(addSectionTag(scene, "台词", C.pink, { left: stage.left, top: stage.top + 4 }));
  const tile = Math.min(56, Math.max(28, Math.min(stage.w / 9, stage.h / 5)));
  const pos = flowPositions(CHARS.length, {
    y: stage.cy,
    tileW: tile,
    tileH: tile,
    gapX: 6,
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
    if (highlight === i) setTileActive(node, true);
    popIn(scene, node, { instant, delay: i * 18 });
  });
}

function drawFocusChar(scene, stage, { instant }, index, id, label) {
  const ch = CHARS[index];
  const tile = Math.min(72, stage.h * 0.28);
  const fromX = stage.cx - Math.min(110, stage.w * 0.28);
  const toX = stage.cx + Math.min(110, stage.w * 0.28);
  const y = stage.cy;
  const src = makeCharTile(scene, fromX, y, displayGlyph(ch), {
    width: tile,
    height: tile,
    seed: ch,
  });
  setTileActive(src, true);
  const chip = makeChip(scene, toX, y, {
    glyph: displayGlyph(ch),
    id,
    accent: C.teal,
    width: tile,
    height: tile * 1.25,
  });
  const arrow = makeIconCard(scene, stage.cx, y, {
    glyph: "→",
    label,
    accent: C.coral,
    width: Math.min(100, stage.w * 0.22),
    height: Math.min(88, tile + 16),
  });
  scene.frame.stage.add([src, arrow, chip]);
  popIn(scene, [src, arrow, chip], { instant });
  if (!instant) {
    playSfx(scene, "sfx-pop", 0.2);
    burstStars(scene, toX, y);
  }
}

function drawReuse(scene, stage, { instant }) {
  const eIndex = [1, 12];
  const tile = Math.min(64, stage.h * 0.24);
  const y = stage.cy;
  eIndex.forEach((idx, i) => {
    const x = stage.cx + (i === 0 ? -90 : 90);
    const src = makeCharTile(scene, x, y - tile * 0.7, "e", { width: tile, height: tile, seed: "e" });
    const chip = makeChip(scene, x, y + tile * 0.7, {
      glyph: "e",
      id: 43,
      accent: C.blue,
      width: tile,
      height: tile * 1.2,
    });
    scene.frame.stage.add([src, chip]);
    popIn(scene, [src, chip], { instant, delay: i * 80 });
    if (i === 1) highlightChip(scene, chip, true);
  });
  const stamp = makeIconCard(scene, stage.cx, y, {
    glyph: "同号",
    label: "见过就复用",
    accent: C.coral,
    width: Math.min(120, stage.w * 0.28),
    height: Math.min(96, tile + 28),
  });
  scene.frame.stage.add(stamp);
  popIn(scene, stamp, { instant, delay: 80 });
}

function drawMappedSentence(scene, stage, { instant }) {
  scene.frame.stage.add(addSectionTag(scene, "号码", C.gold, { left: stage.left, top: stage.top + 4 }));
  const tile = Math.min(46, Math.max(26, stage.w / 10));
  const chipH = tile * 1.28;
  const pos = flowPositions(CHARS.length, {
    y: stage.cy,
    tileW: tile,
    tileH: chipH,
    gapX: 5,
    gapY: 8,
    innerW: stage.w,
    cx: stage.cx,
  });
  CHARS.forEach((ch, i) => {
    const chip = makeChip(scene, pos[i].x, pos[i].y, {
      glyph: displayGlyph(ch),
      id: DEMO_IDS[i],
      accent: i === 1 || i === 12 ? C.blue : C.teal,
      width: tile,
      height: chipH,
    });
    scene.frame.stage.add(chip);
    popIn(scene, chip, { instant, delay: i * 16 });
  });
}

function drawStats(scene, stage, { instant }, facts) {
  const n = facts.length;
  const w = Math.min(220, n === 1 ? stage.w * 0.72 : (stage.w - 16) / n - 10);
  const h = Math.min(130, Math.max(90, stage.h * 0.42));
  facts.forEach((fact, i) => {
    const x = stage.cx + (i - (n - 1) / 2) * (w + 12);
    const node = makeBigStat(scene, x, stage.cy - (n === 1 ? 10 : 0), { ...fact, width: w, height: h });
    scene.frame.stage.add(node);
    popIn(scene, node, { instant, delay: i * 40 });
  });
}

function drawTapes(scene, stage, { instant }) {
  drawIconRow(scene, stage, { instant }, [
    { glyph: "长", label: "练习卷", accent: C.coral },
    { glyph: "短", label: "检查卷", accent: C.gold },
  ]);
  const tip = makeFactChip(scene, stage.cx, stage.bottom - 36, {
    value: "约 111 万个字",
    label: "源码里叫 train.bin / val.bin",
    tip: `练习 ${DATASET.trainTokens.toLocaleString("zh-CN")} · 检查 ${DATASET.valTokens.toLocaleString("zh-CN")}`,
    accent: C.pink,
    width: Math.min(300, stage.w - 12),
    height: 52,
  });
  scene.frame.stage.add(tip);
  popIn(scene, tip, { instant, delay: 80 });
}
