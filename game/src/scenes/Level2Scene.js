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
import {
  addAdvanceHint,
  addHeader,
  bindAdvance,
  createButton,
  highlightChip,
  makeChip,
  makeFactChip,
  makePairBoard,
  makeTag,
  makeWindowFrame,
  paintBackdrop,
  rowPositions,
} from "../ui/components.js";
import { addRobot, addSpeechBubble, setSpeech } from "../ui/mascot.js";
import { C, H, W } from "../ui/theme.js";

const STREAM = DEMO_STREAM;
const PAIR_STEPS = [0, 1, 2, 15];
const CHARS = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)];

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  create() {
    paintBackdrop(this);
    addHeader(this, { level: 2, total: 2, title: "窗口与 (x, y)" });

    addRobot(this, 86, 162, { scale: 0.55 });
    this.speech = addSpeechBubble(this, 300, 128, "先框住 x");

    makeTag(this, 96, 214, "带", C.violet);
    const streamPos = rowPositions(STREAM.length, 268, 56, 6);
    this.streamPos = streamPos;
    this.streamChips = STREAM.map((id, i) =>
      makeChip(this, streamPos[i].x, streamPos[i].y, {
        glyph: displayGlyph(CHARS[i]),
        id,
        accent: C.violet,
        width: 54,
        height: 72,
      }),
    );

    const first = streamPos[0];
    const last = streamPos[DEMO_BLOCK - 1];
    this.winW = last.x - first.x + 62;
    this.winH = 100;
    this.winStartX = (first.x + last.x) / 2;
    this.winY = first.y;
    this.window = makeWindowFrame(this, this.winStartX, this.winY, this.winW, this.winH, C.blue);
    this.window.setAlpha(0);

    this.shiftTag = this.add.container(0, 0);
    this.shiftTag.setAlpha(0);

    makeTag(this, 96, 348, "x", C.blue);
    makeTag(this, 96, 448, "y", C.gold);

    this.xRow = [];
    this.yRow = [];
    this.xPos = streamPos.slice(0, DEMO_BLOCK).map((p) => ({ x: p.x, y: 368 }));
    this.yPos = streamPos.slice(1, DEMO_BLOCK + 1).map((p) => ({ x: p.x, y: 468 }));

    this.pairBoard = makePairBoard(this, W / 2, 560);

    this.nextBtn = createButton(this, W - 170, H - 64, "下一步", () => this.advance(), {
      width: 220,
      height: 64,
    });
    this.nextBtn.setDepth(20);
    this.hint = addAdvanceHint(this);
    this.hint.setDepth(20);

    this.phase = 0;
    this.busy = false;
    this.done = false;

    bindAdvance(this, () => this.advance());
  }

  advance() {
    if (this.busy) return;
    if (this.done) {
      this.scene.start("End");
      return;
    }
    const phases = [() => this.showXWindow(), () => this.showYShift(), () => this.playPairs(), () => this.showLossChips()];
    phases[this.phase]();
    this.phase += 1;
  }

  showXWindow() {
    this.busy = true;
    setSpeech(this.speech, "先框住 x");
    this.window.setAlpha(0);
    this.window.setScale(0.86);
    this.tweens.add({ targets: this.window, alpha: 1, scale: 1, duration: 260, ease: "Back.Out" });

    this.streamChips.forEach((chip, i) => chip.setAlpha(i < DEMO_BLOCK ? 1 : 0.28));

    DEMO_IDS.forEach((id, i) => {
      const chip = makeChip(this, this.streamPos[i].x, this.streamPos[i].y, {
        glyph: displayGlyph([...DEMO_SNIPPET][i]),
        id,
        accent: C.blue,
        width: 54,
        height: 72,
      });
      chip.setAlpha(0.15);
      this.xRow.push(chip);
      this.tweens.add({
        targets: chip,
        x: this.xPos[i].x,
        y: this.xPos[i].y,
        alpha: 1,
        delay: 90 + i * 26,
        duration: 360,
        ease: "Cubic.Out",
      });
    });

    this.time.delayedCall(90 + DEMO_BLOCK * 26 + 360, () => {
      this.busy = false;
    });
  }

  showYShift() {
    this.busy = true;
    setSpeech(this.speech, "y 往右挪");

    const shiftX = this.streamPos[1].x - this.streamPos[0].x;
    this.window.recolor(C.gold);
    this.streamChips.forEach((chip, i) => chip.setAlpha(i >= 1 && i <= DEMO_BLOCK ? 1 : 0.28));
    this.tweens.add({
      targets: this.window,
      x: this.winStartX + shiftX,
      duration: 460,
      ease: "Cubic.InOut",
      onComplete: () => {
        const plus = makeTag(this, this.window.x + this.winW / 2 + 42, this.winY, "+1", C.gold);
        plus.setScale(0.4);
        this.tweens.add({ targets: plus, scale: 1.05, duration: 220, ease: "Back.Out" });
      },
    });

    DEMO_Y_IDS.forEach((id, i) => {
      const srcIndex = i + 1;
      const chip = makeChip(this, this.streamPos[srcIndex].x, this.streamPos[srcIndex].y, {
        glyph: displayGlyph(CHARS[srcIndex]),
        id,
        accent: C.gold,
        width: 54,
        height: 72,
      });
      chip.setAlpha(0.15);
      this.yRow.push(chip);
      this.tweens.add({
        targets: chip,
        x: this.yPos[i].x,
        y: this.yPos[i].y,
        alpha: 1,
        delay: 120 + i * 26,
        duration: 360,
        ease: "Cubic.Out",
      });
    });

    this.time.delayedCall(120 + DEMO_BLOCK * 26 + 360, () => {
      this.busy = false;
    });
  }

  playPairs() {
    this.busy = true;
    setSpeech(this.speech, "预测下一位");
    this.pairBoard.setAlpha(1);

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

  showLossChips() {
    this.busy = true;
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

    facts.forEach((fact, i) => {
      const chip = makeFactChip(this, 230 + i * 300, 562, { ...fact, width: 260, height: 86 });
      chip.setAlpha(0);
      chip.y += 20;
      this.tweens.add({
        targets: chip,
        alpha: 1,
        y: 562,
        delay: i * 80,
        duration: 280,
        ease: "Back.Out",
      });
    });

    this.time.delayedCall(360, () => {
      this.nextBtn.setLabel("走起");
      this.hint.setText("看契约");
      this.children.bringToTop(this.nextBtn);
      this.children.bringToTop(this.hint);
      this.done = true;
      this.busy = false;
    });
  }
}
