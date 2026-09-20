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
  addCaption,
  addHeader,
  bindAdvance,
  createButton,
  highlightChip,
  makeChip,
  makePanel,
  paintBackdrop,
  rowPositions,
  setCaption,
} from "../ui/components.js";
import { C, H, W, monoText, uiText } from "../ui/theme.js";

const STREAM = DEMO_STREAM;
const PAIR_STEPS = [0, 1, 2, 15];

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  create() {
    paintBackdrop(this);
    addHeader(this, { level: 2, total: 2, title: "窗口与 (x, y)（get_batch）" });

    this.caption = addCaption(
      this,
      "train.bin 是一条超长整数带。get_batch 随机抽起点 i，切出长度为 block_size 的窗口。",
    );

    this.add
      .text(
        64,
        164,
        `演示切片：笔记中 train.bin i=1000，block=${DEMO_BLOCK}（正式 config 是 ${REAL_BLOCK}）`,
        uiText(16, { color: C.muted }),
      )
      .setOrigin(0, 0.5);

    const streamPos = rowPositions(STREAM.length, 228, 58, 6);
    this.streamPos = streamPos;
    this.streamChips = STREAM.map((id, i) => {
      const ch = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)][i];
      return makeChip(this, streamPos[i].x, streamPos[i].y, {
        glyph: displayGlyph(ch),
        id,
        accent: C.violet,
        width: 58,
        height: 72,
      });
    });

    this.windowRect = this.add.graphics();
    this.windowRect.setAlpha(0);

    this.xLabel = this.add
      .text(this.streamPos[0].x - 50, 328, "x", monoText(22, { color: C.blueCss, fontStyle: "700" }))
      .setOrigin(0.5)
      .setAlpha(0);
    this.yLabel = this.add
      .text(this.streamPos[1].x - 50, 428, "y", monoText(22, { color: C.goldCss, fontStyle: "700" }))
      .setOrigin(0.5)
      .setAlpha(0);

    this.xRow = [];
    this.yRow = [];
    this.xPos = this.streamPos.slice(0, DEMO_BLOCK).map((p) => ({ x: p.x, y: 328 }));
    this.yPos = this.streamPos.slice(1, DEMO_BLOCK + 1).map((p) => ({ x: p.x, y: 428 }));

    this.pairCaption = this.add
      .text(W / 2, 500, "", uiText(18, { color: C.goldCss }))
      .setOrigin(0.5);

    this.nextBtn = createButton(this, W - 180, H - 68, "下一步", () => this.advance(), {
      width: 200,
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

    const phases = [
      () => this.showXWindow(),
      () => this.showYShift(),
      () => this.playPairs(),
      () => this.showLossPanel(),
    ];
    phases[this.phase]();
    this.phase += 1;
  }

  showXWindow() {
    this.busy = true;
    setCaption(
      this.caption,
      `x = data[i : i + block]。演示长度 ${DEMO_BLOCK}；正式 block_size = ${REAL_BLOCK}，batch_size = ${REAL_BATCH}。`,
    );

    const first = this.streamPos[0];
    const last = this.streamPos[DEMO_BLOCK - 1];
    const left = first.x - 34;
    const right = last.x + 34;
    const top = first.y - 44;
    const height = 88;

    this.windowRect.clear();
    this.windowRect.fillStyle(C.blue, 0.1);
    this.windowRect.fillRoundedRect(left, top, right - left, height, 12);
    this.windowRect.lineStyle(3, C.blue, 1);
    this.windowRect.strokeRoundedRect(left, top, right - left, height, 12);
    this.windowRect.setAlpha(0);
    this.tweens.add({ targets: this.windowRect, alpha: 1, duration: 240 });

    DEMO_IDS.forEach((id, i) => {
      const ch = [...DEMO_SNIPPET][i];
      const chip = makeChip(this, this.streamPos[i].x, this.streamPos[i].y, {
        glyph: displayGlyph(ch),
        id,
        accent: C.blue,
        width: 58,
        height: 72,
      });
      chip.setAlpha(0.2);
      this.xRow.push(chip);
      this.tweens.add({
        targets: chip,
        x: this.xPos[i].x,
        y: this.xPos[i].y,
        alpha: 1,
        delay: 80 + i * 28,
        duration: 380,
        ease: "Cubic.Out",
      });
    });

    this.tweens.add({
      targets: this.xLabel,
      alpha: 1,
      duration: 240,
      delay: 200,
    });

    this.time.delayedCall(80 + DEMO_BLOCK * 28 + 380, () => {
      this.busy = false;
    });
  }

  showYShift() {
    this.busy = true;
    setCaption(
      this.caption,
      "y = data[i+1 : i+1+block]。相对 x 整体右移 1；最后一格来自窗口外的下一个字符。",
    );

    const first = this.streamPos[1];
    const last = this.streamPos[DEMO_BLOCK];
    const left = first.x - 34;
    const right = last.x + 34;
    this.tweens.add({ targets: this.windowRect, alpha: 0.35, duration: 200 });
    this.yWindow = this.add.graphics();
    this.yWindow.fillStyle(C.gold, 0.1);
    this.yWindow.fillRoundedRect(left, first.y - 36, right - left, 88, 12);
    this.yWindow.lineStyle(3, C.gold, 1);
    this.yWindow.strokeRoundedRect(left, first.y - 36, right - left, 88, 12);
    this.yWindow.setAlpha(0);
    this.tweens.add({ targets: this.yWindow, alpha: 1, duration: 240 });

    DEMO_Y_IDS.forEach((id, i) => {
      const ch = [...(DEMO_SNIPPET.slice(1) + DEMO_NEXT_CHAR)][i];
      const srcIndex = i + 1;
      const chip = makeChip(this, this.streamPos[srcIndex].x, this.streamPos[srcIndex].y, {
        glyph: displayGlyph(ch),
        id,
        accent: C.gold,
        width: 58,
        height: 72,
      });
      chip.setAlpha(0.2);
      this.yRow.push(chip);
      this.tweens.add({
        targets: chip,
        x: this.yPos[i].x,
        y: this.yPos[i].y,
        alpha: 1,
        delay: 80 + i * 28,
        duration: 380,
        ease: "Cubic.Out",
      });
    });

    this.tweens.add({ targets: this.yLabel, alpha: 1, duration: 240, delay: 200 });

    this.time.delayedCall(80 + DEMO_BLOCK * 28 + 380, () => {
      this.busy = false;
    });
  }

  playPairs() {
    this.busy = true;
    setCaption(this.caption, "训练目标 = 用 x[t] 预测 y[t]（下一个字符）。");

    const run = (k) => {
      if (k >= PAIR_STEPS.length) {
        this.pairCaption.setText("整段 y 就是 x 向后错一位：Second Citizen:↵  →  econd Citizen:↵W");
        this.busy = false;
        return;
      }
      const t = PAIR_STEPS[k];
      this.xRow.forEach((chip, i) => highlightChip(this, chip, i === t));
      this.yRow.forEach((chip, i) => highlightChip(this, chip, i === t));
      this.streamChips.forEach((chip, i) => highlightChip(this, chip, i === t || i === t + 1));

      const xCh = displayGlyph([...DEMO_SNIPPET][t]);
      const yCh = displayGlyph([...(DEMO_SNIPPET.slice(1) + DEMO_NEXT_CHAR)][t]);
      this.pairCaption.setText(`t=${t}　x[${t}]=${DEMO_IDS[t]}「${xCh}」　→　预测　y[${t}]=${DEMO_Y_IDS[t]}「${yCh}」`);

      this.time.delayedCall(700, () => run(k + 1));
    };
    run(0);
  }

  showLossPanel() {
    this.busy = true;
    this.xRow.forEach((chip) => highlightChip(this, chip, false));
    this.yRow.forEach((chip) => highlightChip(this, chip, false));
    this.streamChips.forEach((chip) => highlightChip(this, chip, false));

    setCaption(
      this.caption,
      `每个位置做 ${VOCAB_SIZE} 类预测，F.cross_entropy 对齐 y[t]。此处不展开 Attention。`,
    );

    this.pairCaption.setText("");
    const panel = makePanel(this, 500, 538, 880, 132);
    panel.setAlpha(0);
    panel.y += 20;
    panel.setDepth(5);

    const lines = [
      { t: "训练接口", c: C.tealCss },
      { t: `logits, loss = model(x, y)　·　最后一维 = vocab_size = ${VOCAB_SIZE}`, c: C.text },
      { t: `正式形状 (batch, block) = (${REAL_BATCH}, ${REAL_BLOCK})　·　单卡每 iter ${TOKENS_PER_ITER} tokens`, c: C.text },
      { t: "本关不训练、不编造 loss。Attention 是下一步如何从 x 算出表示。", c: C.muted },
    ];
    lines.forEach((line, i) => {
      panel.add(
        this.add
          .text(-420, -46 + i * 28, line.t, uiText(i === 0 ? 18 : 16, { color: line.c, fontStyle: i === 0 ? "700" : "400" }))
          .setOrigin(0, 0.5),
      );
    });

    this.tweens.add({
      targets: panel,
      alpha: 1,
      y: 538,
      duration: 360,
      ease: "Cubic.Out",
      onComplete: () => {
        this.nextBtn.setLabel("明白了");
        this.hint.setText("点「明白了」查看本局契约");
        this.children.bringToTop(this.nextBtn);
        this.children.bringToTop(this.hint);
        this.done = true;
        this.busy = false;
      },
    });
  }
}
