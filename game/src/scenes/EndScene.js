import Phaser from "phaser";
import { REAL_BATCH, REAL_BLOCK, VOCAB_SIZE } from "../data/facts.js";
import { addAdvanceHint, createButton, makePanel, paintBackdrop } from "../ui/components.js";
import { C, H, W, uiText } from "../ui/theme.js";

export default class EndScene extends Phaser.Scene {
  constructor() {
    super("End");
  }

  create() {
    paintBackdrop(this);

    this.add
      .text(W / 2, 72, "结算", uiText(18, { color: C.tealCss }))
      .setOrigin(0.5);
    const title = this.add
      .text(W / 2, 118, "本局钉死的契约", uiText(40, { fontStyle: "700" }))
      .setOrigin(0.5);
    title.setScale(0.92);
    this.tweens.add({ targets: title, scale: 1, duration: 360, ease: "Back.Out" });

    const cards = [
      {
        title: "1 · prepare",
        body: `字符 → 整数 id（stoi）。词表大小 = 唯一字符数 = ${VOCAB_SIZE}。写出 train.bin / val.bin / meta.pkl。`,
      },
      {
        title: "2 · get_batch",
        body: `x = data[i : i+T]，y = data[i+1 : i+1+T]。y 是 next-token。正式 T=${REAL_BLOCK}，batch=${REAL_BATCH}。`,
      },
      {
        title: "3 · 训练目标",
        body: `用 x[t] 预测 y[t]。每个位置 ${VOCAB_SIZE} 类，F.cross_entropy 对齐标签。本游戏没有训练模型。`,
      },
    ];

    cards.forEach((card, i) => {
      const panel = makePanel(this, W / 2, 230 + i * 118, 980, 100);
      panel.setAlpha(0);
      panel.x -= 30;
      panel.add(
        this.add
          .text(-460, -24, card.title, uiText(20, { color: C.goldCss, fontStyle: "700" }))
          .setOrigin(0, 0.5),
      );
      panel.add(
        this.add
          .text(-460, 14, card.body, uiText(18, { wordWrap: { width: 900 } }))
          .setOrigin(0, 0.5),
      );
      this.tweens.add({
        targets: panel,
        alpha: 1,
        x: W / 2,
        delay: 40 + i * 70,
        duration: 280,
        ease: "Cubic.Out",
      });
    });

    createButton(this, W / 2 - 170, H - 88, "再玩一次", () => {
      this.scene.start("Title");
    }, { width: 220 });

    const stub = createButton(
      this,
      W / 2 + 170,
      H - 88,
      "第 3 关 · Attention",
      () => {
        this.toast();
      },
      { width: 280, fill: C.surface2, textColor: C.muted, fontSize: 18 },
    );
    stub.setAlpha(0.92);

    addAdvanceHint(this, "即将推出：Embedding / Causal Attention（对照 model.py）");
  }

  toast() {
    if (this.toastLabel) {
      this.tweens.killTweensOf(this.toastLabel);
      this.toastLabel.destroy();
    }
    this.toastLabel = this.add
      .text(W / 2, H - 148, "下一关还在路上，先把 (x, y) 契约记牢就好。", uiText(18, { color: C.goldCss }))
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: this.toastLabel,
      alpha: 1,
      y: H - 158,
      duration: 220,
      hold: 1600,
      yoyo: true,
    });
  }
}
