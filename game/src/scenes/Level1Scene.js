import Phaser from "phaser";
import { LEVEL1_BEATS, SNIPPET_CHARS, SPINE_TOTAL } from "../data/beats.js";
import { DATASET, DEMO_IDS, VOCAB_SIZE, displayGlyph } from "../data/facts.js";
import { playSfx } from "../audio/sound.js";
import {
  addSectionTag,
  burstStars,
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
    const frame = makeLessonFrame(this, { level: 1, total: 2, title: "先拉成纸带" });
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
      total: SPINE_TOTAL,
    });
    this.frame.nextBtn.setLabel(index === LEVEL1_BEATS.length - 1 ? "走起" : "下一步");
    this.frame.nextBtn.setCaption(index === LEVEL1_BEATS.length - 1 ? "下一关" : "点一下");
    this.children.bringToTop(this.frame.nextBtn);

    clearLayer(this.frame.stage);
    RENDERERS[beat.id]?.(this, this.frame.stageBand, { instant });
  }
}

const RENDERERS = {
  tape: (scene, stage, opts) => drawSnippet(scene, stage, opts, "纸带"),
  plates: (scene, stage, opts) => drawMappedSentence(scene, stage, opts),
  seats: (scene, stage, opts) =>
    drawIconRow(scene, stage, opts, [
      { glyph: "43", label: "只是座位号", accent: C.gold },
      { glyph: "≠", label: "不是性格", accent: C.coral },
      { glyph: "e", label: "还是那个字", accent: C.teal },
    ]),
  sixtyfive: (scene, stage, opts) => drawSixtyFive(scene, stage, opts),
  scrolls: (scene, stage, opts) => drawScrolls(scene, stage, opts),
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

function drawSnippet(scene, stage, { instant }, tag) {
  scene.frame.stage.add(addSectionTag(scene, tag, C.pink, { left: stage.left, top: stage.top + 4 }));
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
    popIn(scene, node, { instant, delay: i * 18 });
  });
}

function drawMappedSentence(scene, stage, { instant }) {
  scene.frame.stage.add(addSectionTag(scene, "号码牌", C.gold, { left: stage.left, top: stage.top + 4 }));
  const tile = Math.min(46, Math.max(26, stage.w / 10));
  const chipH = tile * 1.28;
  const pos = flowPositions(CHARS.length, {
    y: stage.cy + 8,
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
  if (stage.h > 300) {
    scene.frame.stage.add(makeFocusPair(scene, stage, { instant }));
  }
}

function makeFocusPair(scene, stage, { instant }) {
  const tile = Math.min(52, stage.h * 0.18);
  const y = stage.top + tile * 0.7 + 18;
  const src = makeCharTile(scene, stage.cx - 70, y, "S", { width: tile, height: tile, seed: "S" });
  setTileActive(src, true);
  const chip = makeChip(scene, stage.cx + 70, y, {
    glyph: "S",
    id: 31,
    accent: C.teal,
    width: tile,
    height: tile * 1.15,
  });
  const arrow = makeIconCard(scene, stage.cx, y, {
    glyph: "→",
    label: "领牌",
    accent: C.coral,
    width: Math.min(88, stage.w * 0.2),
    height: Math.min(72, tile + 12),
  });
  popIn(scene, [src, arrow, chip], { instant });
  if (!instant) {
    playSfx(scene, "sfx-pop", 0.16);
    burstStars(scene, stage.cx + 70, y);
  }
  const box = scene.add.container(0, 0);
  box.add([src, arrow, chip]);
  return box;
}

function drawSixtyFive(scene, stage, { instant }) {
  const node = makeBigStat(scene, stage.cx, stage.cy - 8, {
    value: String(VOCAB_SIZE),
    label: "本局莎翁字符牌",
    width: Math.min(240, stage.w * 0.7),
    height: Math.min(130, Math.max(90, stage.h * 0.4)),
    accent: C.gold,
  });
  scene.frame.stage.add(node);
  popIn(scene, node, { instant });
  const tip = makeFactChip(scene, stage.cx, stage.bottom - 36, {
    value: "不是宇宙词表",
    label: "只数这套剧本里的字",
    tip: "去重以后 65 个字符。不是 GPT 的大词表。",
    accent: C.pink,
    width: Math.min(280, stage.w - 12),
    height: 52,
  });
  scene.frame.stage.add(tip);
  popIn(scene, tip, { instant, delay: 60 });
}

function drawScrolls(scene, stage, { instant }) {
  drawIconRow(scene, stage, { instant }, [
    { glyph: "练", label: "练习卷 九成", accent: C.coral },
    { glyph: "验", label: "验收卷 一成", accent: C.gold },
  ]);
  const tip = makeFactChip(scene, stage.cx, stage.bottom - 36, {
    value: "验收不是答题纸",
    label: "源码里叫 train.bin / val.bin",
    tip: `练习 ${DATASET.trainTokens.toLocaleString("zh-CN")} · 验收 ${DATASET.valTokens.toLocaleString("zh-CN")}。验收用来抽查，不把答案写在卷上。`,
    accent: C.pink,
    width: Math.min(320, stage.w - 12),
    height: 52,
  });
  scene.frame.stage.add(tip);
  popIn(scene, tip, { instant, delay: 80 });
}
