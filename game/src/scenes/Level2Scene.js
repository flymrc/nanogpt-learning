import Phaser from "phaser";
import {
  DEMO_BLOCK,
  DEMO_IDS,
  DEMO_NEXT_CHAR,
  DEMO_SNIPPET,
  DEMO_STREAM,
  DEMO_Y_IDS,
  REAL_BATCH,
  REAL_BLOCK,
  TOKENS_PER_ITER,
  VOCAB_SIZE,
  displayGlyph,
} from "../data/facts.js";
import { cueVoice } from "../audio/sound.js";
import {
  addChrome,
  addFooterCta,
  addSectionTag,
  bindAdvance,
  highlightChip,
  makeChip,
  makeFactChip,
  makePairBoard,
  makeTag,
  makeWindowFrame,
  paintBackdrop,
} from "../ui/components.js";
import { addRobot, addSpeechBubble, setSpeech } from "../ui/mascot.js";
import { fitMeasure, makeShell, stackSlots, tokenMetrics, watchResize } from "../ui/layout.js";
import { C } from "../ui/theme.js";

const STREAM = DEMO_STREAM;
const PAIR_STEPS = [0, 1, 2, 15];
const CHARS = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)];

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  create() {
    const shell = makeShell(this);
    const v = shell.v;
    this.view = v;
    this.shell = shell;
    paintBackdrop(this);
    addChrome(this, { level: 2, total: 2, title: v.compact ? "窗口与 xy" : "窗口与 (x, y)", shell });

    const plan = layoutLevel2(v, shell);
    this.layout = plan;
    this.metrics = plan.metrics;
    this.streamPos = plan.streamPos;
    this.xPos = plan.xPos;
    this.yPos = plan.yPos;

    const mascot = plan.slots.mascot;
    const robotX = v.left + (v.compact ? 32 : 52);
    const robotY = mascot.cy;
    addRobot(this, robotX, robotY, { scale: plan.robotScale });
    this.speech = addSpeechBubble(
      this,
      robotX + (v.compact ? 114 : 146),
      robotY - 6,
      "先框住 x",
      { maxWidth: Math.min(v.compact ? 160 : 220, v.right - robotX - 70), fontSize: v.compact ? 18 : 24 },
    );
    cueVoice(this, "vo-level2");

    addSectionTag(this, "带", C.violet, { left: v.left, top: plan.slots.stream.top });
    this.streamChips = STREAM.map((id, i) =>
      makeChip(this, plan.streamPos[i].x, plan.streamPos[i].y, {
        glyph: displayGlyph(CHARS[i]),
        id,
        accent: C.violet,
        width: plan.metrics.tileW,
        height: plan.metrics.tileH,
      }),
    );

    const first = plan.streamPos[0];
    const last = plan.streamPos[DEMO_BLOCK - 1];
    this.winW = last.x - first.x + plan.metrics.tileW + 8;
    this.winH = plan.metrics.tileH + 20;
    this.winStartX = (first.x + last.x) / 2;
    this.winY = first.y;
    this.window = makeWindowFrame(this, this.winStartX, this.winY, this.winW, this.winH, C.blue);
    this.window.setAlpha(0);

    addSectionTag(this, "x", C.blue, { left: v.left, top: plan.slots.xRow.top });
    addSectionTag(this, "y", C.gold, { left: v.left, top: plan.slots.yRow.top });

    this.xRow = [];
    this.yRow = [];

    this.pairBoard = makePairBoard(this, v.cx, plan.slots.dock.cy, {
      width: Math.min(420, v.innerW - 16),
      height: plan.pairH,
    });

    this.nextBtn = addFooterCta(this, {
      shell,
      label: "下一步",
      caption: "点一下",
      onClick: () => this.advance(),
    });

    this.phase = 0;
    this.busy = false;
    this.done = false;

    bindAdvance(this, () => this.advance());
    watchResize(this, {
      restart: true,
      persist: () => {
        this.registry.set("level2.progress", { phase: this.phase, done: this.done });
      },
    });

    const saved = this.registry.get("level2.progress");
    if (saved) {
      this.registry.remove("level2.progress");
      this.restoreProgress(saved);
    }
  }

  restoreProgress(saved) {
    const phase = saved.phase || 0;
    if (phase >= 1) this.showXWindow({ instant: true });
    if (phase >= 2) this.showYShift({ instant: true });
    if (phase >= 3) this.playPairs({ instant: true });
    if (phase >= 4 || saved.done) this.showLossChips({ instant: true });
    this.phase = phase;
    this.done = Boolean(saved.done || phase >= 4);
    this.busy = false;
  }

  advance() {
    if (this.busy) return;
    if (this.done) {
      this.registry.remove("level2.progress");
      this.scene.start("End");
      return;
    }
    const phases = [
      () => this.showXWindow(),
      () => this.showYShift(),
      () => this.playPairs(),
      () => this.showLossChips(),
    ];
    phases[this.phase]();
    this.phase += 1;
  }

  showXWindow({ instant = false } = {}) {
    this.busy = !instant;
    setSpeech(this.speech, "先框住 x");
    this.window.setAlpha(instant ? 1 : 0);
    this.window.setScale(instant ? 1 : 0.86);
    this.tweens.add({
      targets: this.window,
      alpha: 1,
      scale: 1,
      duration: instant ? 0 : 260,
      ease: "Back.Out",
    });

    this.streamChips.forEach((chip, i) => chip.setAlpha(i < DEMO_BLOCK ? 1 : 0.28));

    DEMO_IDS.forEach((id, i) => {
      const chip = makeChip(this, this.streamPos[i].x, this.streamPos[i].y, {
        glyph: displayGlyph([...DEMO_SNIPPET][i]),
        id,
        accent: C.blue,
        width: this.metrics.tileW,
        height: this.metrics.tileH,
      });
      chip.setAlpha(instant ? 1 : 0.15);
      this.xRow.push(chip);
      this.tweens.add({
        targets: chip,
        x: this.xPos[i].x,
        y: this.xPos[i].y,
        alpha: 1,
        delay: instant ? 0 : 90 + i * 26,
        duration: instant ? 0 : 360,
        ease: "Cubic.Out",
      });
    });

    this.time.delayedCall(instant ? 0 : 90 + DEMO_BLOCK * 26 + 360, () => {
      this.busy = false;
    });
  }

  showYShift({ instant = false } = {}) {
    this.busy = !instant;
    setSpeech(this.speech, "y 往右挪");
    if (!instant) cueVoice(this, "vo-shift");

    const shiftX = this.streamPos[1].x - this.streamPos[0].x;
    this.window.recolor(C.gold);
    this.streamChips.forEach((chip, i) => chip.setAlpha(i >= 1 && i <= DEMO_BLOCK ? 1 : 0.28));
    this.tweens.add({
      targets: this.window,
      x: this.winStartX + shiftX,
      duration: instant ? 0 : 460,
      ease: "Cubic.InOut",
      onComplete: () => {
        const tagX = Math.min(this.view.right - 24, this.window.x + this.winW / 2 + 28);
        const plus = makeTag(this, tagX, this.winY, "+1", C.gold);
        plus.setScale(instant ? 1 : 0.4);
        this.tweens.add({ targets: plus, scale: 1.05, duration: instant ? 0 : 220, ease: "Back.Out" });
      },
    });

    DEMO_Y_IDS.forEach((id, i) => {
      const srcIndex = i + 1;
      const chip = makeChip(this, this.streamPos[srcIndex].x, this.streamPos[srcIndex].y, {
        glyph: displayGlyph(CHARS[srcIndex]),
        id,
        accent: C.gold,
        width: this.metrics.tileW,
        height: this.metrics.tileH,
      });
      chip.setAlpha(instant ? 1 : 0.15);
      this.yRow.push(chip);
      this.tweens.add({
        targets: chip,
        x: this.yPos[i].x,
        y: this.yPos[i].y,
        alpha: 1,
        delay: instant ? 0 : 120 + i * 26,
        duration: instant ? 0 : 360,
        ease: "Cubic.Out",
      });
    });

    this.time.delayedCall(instant ? 0 : 120 + DEMO_BLOCK * 26 + 360, () => {
      this.busy = false;
    });
  }

  playPairs({ instant = false } = {}) {
    this.busy = !instant;
    setSpeech(this.speech, "预测下一位");
    this.pairBoard.setAlpha(1);

    if (instant) {
      const t = PAIR_STEPS[PAIR_STEPS.length - 1];
      const xCh = displayGlyph([...DEMO_SNIPPET][t]);
      const yCh = displayGlyph(CHARS[t + 1]);
      this.pairBoard.show(xCh, yCh, `${DEMO_IDS[t]} → ${DEMO_Y_IDS[t]}`);
      this.busy = false;
      return;
    }

    const run = (k) => {
      if (k >= PAIR_STEPS.length) {
        this.busy = false;
        return;
      }
      const t = PAIR_STEPS[k];
      this.xRow.forEach((chip, i) => highlightChip(this, chip, i === t));
      this.yRow.forEach((chip, i) => highlightChip(this, chip, i === t));
      this.streamChips.forEach((chip, i) => highlightChip(this, chip, i === t || i === t + 1));

      const xCh = displayGlyph([...DEMO_SNIPPET][t]);
      const yCh = displayGlyph(CHARS[t + 1]);
      this.pairBoard.show(xCh, yCh, `${DEMO_IDS[t]} → ${DEMO_Y_IDS[t]}`);
      this.time.delayedCall(680, () => run(k + 1));
    };
    run(0);
  }

  showLossChips({ instant = false } = {}) {
    this.busy = !instant;
    this.xRow.forEach((chip) => highlightChip(this, chip, false));
    this.yRow.forEach((chip) => highlightChip(this, chip, false));
    this.streamChips.forEach((chip) => highlightChip(this, chip, false));
    setSpeech(this.speech, "65 类对齐");
    this.pairBoard.hide();

    const facts = [
      {
        value: String(VOCAB_SIZE),
        label: "类预测",
        tip: "每个位置对 65 类做 F.cross_entropy",
        accent: C.coral,
      },
      {
        value: `(${REAL_BATCH},${REAL_BLOCK})`,
        label: "正式形状",
        tip: "演示窗口是 16；正式 block=256、batch=64",
        accent: C.blue,
      },
      {
        value: String(TOKENS_PER_ITER),
        label: "tokens/iter",
        tip: "单卡 64×256，本关不训练、不编造 loss",
        accent: C.gold,
      },
    ];

    const v = this.view;
    const dock = this.layout.slots.dock;
    const fw = this.layout.factW;
    const fh = this.layout.factH;
    const oneRow = this.layout.factsOneRow;

    facts.forEach((fact, i) => {
      const x = oneRow ? v.cx + (i - 1) * (fw + 10) : v.cx;
      const y = oneRow ? dock.cy : dock.top + fh / 2 + i * (fh + 8);
      const chip = makeFactChip(this, x, y, { ...fact, width: fw, height: fh });
      chip.setAlpha(0);
      chip.y += instant ? 0 : 20;
      this.tweens.add({
        targets: chip,
        alpha: 1,
        y,
        delay: instant ? 0 : i * 80,
        duration: instant ? 0 : 280,
        ease: "Back.Out",
      });
    });

    this.time.delayedCall(instant ? 0 : 360, () => {
      this.nextBtn.setLabel("走起");
      this.nextBtn.setCaption("看契约");
      this.children.bringToTop(this.nextBtn);
      this.done = true;
      this.busy = false;
    });
  }
}

function layoutLevel2(v, shell) {
  const landscapeShort = v.short && !v.portrait;
  const measured = fitMeasure(shell.content.h, (s) => {
    const metrics = tokenMetrics(STREAM.length, v.innerW, {
      maxW: (landscapeShort ? 28 : v.short ? 32 : v.compact ? 36 : 54) * s,
      maxH: (landscapeShort ? 38 : v.short ? 44 : v.compact ? 50 : 72) * s,
      minW: 18,
      gap: (v.compact ? 3 : 6) * s,
    });
    const tagH = Math.round(26 * s);
    const mascotH = Math.round((landscapeShort ? 50 : v.short ? 62 : 74) * s);
    const streamH = tagH + 8 + metrics.tileH + 10;
    const rowH = tagH + 8 + metrics.tileH;
    const factW = Math.min(v.portrait ? 220 : 260, (v.innerW - 24) / (v.portrait && v.innerW < 360 ? 1 : 3));
    const factsOneRow = factW * 3 + 20 <= v.innerW;
    const factH = Math.round((v.short ? 60 : v.compact ? 68 : 82) * s);
    const pairH = Math.max(72, Math.min(108, Math.min(420, v.innerW - 16) * 0.28) * s);
    const dockH = factsOneRow ? Math.max(pairH, factH) : Math.max(pairH, factH * 3 + 16);
    const gapY = Math.round((landscapeShort ? 8 : 12) * s);
    const items = [
      { id: "mascot", h: mascotH },
      { id: "stream", h: streamH },
      { id: "xRow", h: rowH },
      { id: "yRow", h: rowH },
      { id: "dock", h: dockH },
    ];
    const stacked = stackSlots(items, {
      top: 0,
      bottom: items.reduce((sum, it) => sum + it.h, 0) + gapY * (items.length - 1),
      gap: gapY,
      justify: "start",
    });
    return {
      h: stacked.used,
      items,
      gapY,
      metrics,
      tagH,
      factW,
      factH,
      pairH,
      factsOneRow,
      robotScale: (landscapeShort ? 0.22 : v.short ? 0.26 : v.compact ? 0.3 : 0.38) * Math.min(1, s + 0.15),
    };
  });

  const stacked = stackSlots(measured.items, {
    top: shell.content.top,
    bottom: shell.content.bottom,
    gap: measured.gapY,
    justify: v.portrait ? "distribute" : "center",
  });

  const streamY = stacked.slots.stream.top + measured.tagH + 8 + measured.metrics.tileH / 2;
  const xY = stacked.slots.xRow.top + measured.tagH + 8 + measured.metrics.tileH / 2;
  const yY = stacked.slots.yRow.top + measured.tagH + 8 + measured.metrics.tileH / 2;
  const total = STREAM.length * measured.metrics.tileW + (STREAM.length - 1) * measured.metrics.gapX;
  const startX = v.cx - total / 2 + measured.metrics.tileW / 2;
  const streamPos = STREAM.map((_, i) => ({
    x: startX + i * (measured.metrics.tileW + measured.metrics.gapX),
    y: streamY,
  }));

  return {
    ...measured,
    slots: stacked.slots,
    streamPos,
    xPos: streamPos.slice(0, DEMO_BLOCK).map((p) => ({ x: p.x, y: xY })),
    yPos: streamPos.slice(1, DEMO_BLOCK + 1).map((p) => ({ x: p.x, y: yY })),
  };
}
