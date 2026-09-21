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
  addAdvanceHint,
  addHeader,
  addMuteToggle,
  bindAdvance,
  createButton,
  highlightChip,
  makeChip,
  makeFactChip,
  makePairBoard,
  makeTag,
  makeWindowFrame,
  paintBackdrop,
} from "../ui/components.js";
import { addRobot, addSpeechBubble, setSpeech } from "../ui/mascot.js";
import { TAP_MIN, getView, tokenMetrics, watchResize } from "../ui/layout.js";
import { C } from "../ui/theme.js";

const STREAM = DEMO_STREAM;
const PAIR_STEPS = [0, 1, 2, 15];
const CHARS = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)];

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  create() {
    const v = getView(this);
    this.view = v;
    paintBackdrop(this);
    addHeader(this, { level: 2, total: 2, title: v.compact ? "窗口与 xy" : "窗口与 (x, y)" });

    const robotX = v.left + (v.compact ? 36 : 56);
    const robotY = v.padTop + (v.short ? 90 : v.compact ? 118 : 164);
    addRobot(this, robotX, robotY, { scale: v.short ? 0.26 : v.compact ? 0.3 : 0.38 });
    this.speech = addSpeechBubble(this, robotX + (v.compact ? 140 : 150), robotY - (v.compact ? 30 : 46), "先框住 x", {
      maxWidth: v.compact ? 160 : 220,
    });
    addMuteToggle(this);
    cueVoice(this, "vo-level2");

    const metrics = tokenMetrics(STREAM.length, v.innerW, {
      maxW: v.short ? 32 : v.compact ? 36 : 54,
      maxH: v.short ? 42 : v.compact ? 48 : 72,
      minW: 20,
      gap: v.compact ? 3 : 6,
    });
    this.metrics = metrics;
    const streamY = v.padTop + v.innerH * (v.portrait ? 0.22 : 0.26);
    makeTag(this, v.left + 36, streamY - metrics.tileH * 0.7, "带", C.violet);

    const total = STREAM.length * metrics.tileW + (STREAM.length - 1) * metrics.gapX;
    const startX = v.cx - total / 2 + metrics.tileW / 2;
    this.streamPos = STREAM.map((_, i) => ({
      x: startX + i * (metrics.tileW + metrics.gapX),
      y: streamY,
    }));
    this.streamChips = STREAM.map((id, i) =>
      makeChip(this, this.streamPos[i].x, this.streamPos[i].y, {
        glyph: displayGlyph(CHARS[i]),
        id,
        accent: C.violet,
        width: metrics.tileW,
        height: metrics.tileH,
      }),
    );

    const first = this.streamPos[0];
    const last = this.streamPos[DEMO_BLOCK - 1];
    this.winW = last.x - first.x + metrics.tileW + 8;
    this.winH = metrics.tileH + 28;
    this.winStartX = (first.x + last.x) / 2;
    this.winY = first.y;
    this.window = makeWindowFrame(this, this.winStartX, this.winY, this.winW, this.winH, C.blue);
    this.window.setAlpha(0);

    this.shiftTag = this.add.container(0, 0);
    this.shiftTag.setAlpha(0);

    const xY = streamY + metrics.tileH + (v.short ? 36 : v.portrait ? 56 : 72);
    const yY = xY + metrics.tileH + (v.short ? 36 : v.portrait ? 52 : 72);
    makeTag(this, v.left + 36, xY - metrics.tileH * 0.55, "x", C.blue);
    makeTag(this, v.left + 36, yY - metrics.tileH * 0.55, "y", C.gold);

    this.xRow = [];
    this.yRow = [];
    this.xPos = this.streamPos.slice(0, DEMO_BLOCK).map((p) => ({ x: p.x, y: xY }));
    this.yPos = this.streamPos.slice(1, DEMO_BLOCK + 1).map((p) => ({ x: p.x, y: yY }));

    const pairY = Math.min(v.bottom - 118, yY + metrics.tileH + (v.short ? 36 : 48));
    this.pairBoard = makePairBoard(this, v.cx, pairY);

    const btnW = Math.min(v.portrait ? v.innerW - 20 : 220, 280);
    const btnH = Math.max(TAP_MIN, 60);
    this.nextBtn = createButton(
      this,
      v.portrait ? v.cx : v.right - btnW / 2,
      v.bottom - 36,
      "下一步",
      () => this.advance(),
      { width: btnW, height: btnH },
    );
    this.nextBtn.setDepth(20);
    this.hint = addAdvanceHint(this);
    this.hint.setDepth(20);

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
        const plus = makeTag(this, this.window.x + this.winW / 2 + 28, this.winY, "+1", C.gold);
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
    const stackFacts = v.portrait && v.innerW < 420;
    const fw = stackFacts ? Math.min(260, v.innerW - 16) : Math.min(260, (v.innerW - 24) / 3);
    const fh = v.short ? 62 : v.compact ? 70 : 86;
    const baseY = v.bottom - (stackFacts ? 210 : 118);

    facts.forEach((fact, i) => {
      const x = stackFacts ? v.cx : v.cx + (i - 1) * (fw + 10);
      const y = stackFacts ? baseY + i * (fh + 8) : baseY;
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
      this.hint.setText("看契约");
      this.children.bringToTop(this.nextBtn);
      this.children.bringToTop(this.hint);
      this.done = true;
      this.busy = false;
    });
  }
}
