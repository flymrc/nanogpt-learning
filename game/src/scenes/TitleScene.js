import Phaser from "phaser";
import { CHARSET, displayGlyph } from "../data/facts.js";
import { addAdvanceHint, createButton, paintBackdrop } from "../ui/components.js";
import { C, H, W, monoText, uiText } from "../ui/theme.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    paintBackdrop(this);
    this.spawnDriftChars();

    this.add
      .text(W / 2, 118, "依据 karpathy/nanoGPT · shakespeare_char", uiText(18, { color: C.tealCss }))
      .setOrigin(0.5);

    const title = this.add
      .text(W / 2, 210, "nanoGPT 闯关", uiText(72, { fontStyle: "700" }))
      .setOrigin(0.5);
    title.setAlpha(0);
    title.setScale(0.86);
    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: 1,
      duration: 520,
      ease: "Back.Out",
    });

    this.add
      .text(
        W / 2,
        300,
        "把密密的笔记变成可点的动画：字符 → id，再看 get_batch 如何切出 (x, y)",
        uiText(22, { color: C.muted, align: "center", wordWrap: { width: 900 } }),
      )
      .setOrigin(0.5);

    const card = this.add.container(W / 2, 430);
    const g = this.add.graphics();
    g.fillStyle(C.surface, 0.95);
    g.lineStyle(2, C.stroke, 1);
    g.fillRoundedRect(-420, -70, 840, 140, 16);
    g.strokeRoundedRect(-420, -70, 840, 140, 16);
    const lines = [
      "路径：字符级莎士比亚（不用 GPT-2 BPE）",
      "第 1 关 prepare.py · 第 2 关 get_batch / next-token / cross_entropy",
      "本游戏只演示契约，不训练真实模型，也不编造 loss",
    ];
    lines.forEach((line, i) => {
      card.add(
        this.add
          .text(0, -36 + i * 36, line, uiText(18, { color: C.text, align: "center" }))
          .setOrigin(0.5),
      );
    });
    card.addAt(g, 0);

    createButton(this, W / 2, 580, "开始", () => {
      this.scene.start("Level1");
    }, { width: 240, height: 58 });

    addAdvanceHint(this, "空格也可开始 · 全程点击推进");

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Level1"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Level1"));
  }

  spawnDriftChars() {
    const printable = [...CHARSET].filter((ch) => ch !== "\n");
    for (let i = 0; i < 14; i += 1) {
      const ch = printable[(i * 7) % printable.length];
      const t = this.add
        .text(
          80 + Math.random() * (W - 160),
          40 + Math.random() * (H - 80),
          displayGlyph(ch),
          monoText(28, { color: C.violetCss }),
        )
        .setAlpha(0.14)
        .setOrigin(0.5);

      this.tweens.add({
        targets: t,
        y: t.y + (Math.random() > 0.5 ? 36 : -36),
        alpha: { from: 0.08, to: 0.2 },
        duration: 2800 + Math.random() * 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }
}
