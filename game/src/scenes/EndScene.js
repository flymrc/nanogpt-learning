import Phaser from "phaser";
import { REAL_BATCH, REAL_BLOCK, VOCAB_SIZE } from "../data/facts.js";
import { cueVoice } from "../audio/sound.js";
import {
  addMuteToggle,
  createButton,
  drawSticker,
  paintBackdrop,
  showTooltip,
  spawnConfetti,
} from "../ui/components.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { C, H, W, displayText, uiText } from "../ui/theme.js";

export default class EndScene extends Phaser.Scene {
  constructor() {
    super("End");
  }

  create() {
    paintBackdrop(this);
    spawnConfetti(this);

    addRobot(this, 88, 168, { scale: 0.52, mood: "wow" });
    addSpeechBubble(this, 250, 78, "通关啦！", { pointer: "left" });
    addMuteToggle(this);
    cueVoice(this, "vo-clear");

    this.add.text(W / 2, 286, "通关！", displayText(56)).setOrigin(0.5);

    const cards = [
      {
        icon: "deco-badge",
        fallback: "Aa",
        title: "字符变 ID",
        caption: "词表就是 65",
        chip: String(VOCAB_SIZE),
        tip: "prepare.py：字符 → id，写出 train.bin / val.bin / meta.pkl",
        accent: C.teal,
      },
      {
        icon: "deco-window",
        fallback: "▭",
        title: "窗口右移",
        caption: "y 是下一位",
        chip: "x → y",
        tip: `x = data[i:i+T]，y = data[i+1:i+1+T]。正式 T=${REAL_BLOCK}，batch=${REAL_BATCH}`,
        accent: C.blue,
      },
      {
        icon: "deco-star",
        fallback: "★",
        title: "预测下一位",
        caption: "65 类对齐",
        chip: `${VOCAB_SIZE}类`,
        tip: "F.cross_entropy 对齐 y[t]。本游戏没有训练模型。",
        accent: C.gold,
      },
    ];

    cards.forEach((card, i) => {
      const x = 250 + i * 390;
      const panel = this.add.container(x, 430);
      const g = this.add.graphics();
      drawSticker(g, -160, -88, 320, 176, 26, C.surface);
      panel.add(g);

      if (this.textures.exists(card.icon)) {
        panel.add(this.add.image(0, -46, card.icon).setScale(card.icon === "deco-star" ? 0.7 : 0.72));
      } else {
        panel.add(this.add.text(0, -46, card.fallback, displayText(36)).setOrigin(0.5));
      }
      panel.add(this.add.text(0, 18, card.title, displayText(26)).setOrigin(0.5));
      panel.add(this.add.text(0, 50, card.caption, uiText(16, { color: C.muted })).setOrigin(0.5));

      panel.setSize(320, 176);
      panel.setInteractive(new Phaser.Geom.Rectangle(-160, -88, 320, 176), Phaser.Geom.Rectangle.Contains);
      panel.on("pointerdown", (pointer, _lx, _ly, event) => {
        event?.stopPropagation?.();
        showTooltip(this, x, 320, card.tip);
      });

      panel.setAlpha(0);
      panel.y += 18;
      this.tweens.add({
        targets: panel,
        alpha: 1,
        y: 430,
        delay: 80 + i * 90,
        duration: 280,
        ease: "Back.Out",
      });
    });

    createButton(this, W / 2 - 170, H - 72, "再玩", () => {
      this.scene.start("Title");
    }, { width: 220, height: 68 });

    const stub = createButton(
      this,
      W / 2 + 170,
      H - 72,
      "下一关",
      () => this.toast(),
      { width: 220, height: 68, fill: C.surface2 },
    );
    stub.setAlpha(0.95);
  }

  toast() {
    showTooltip(this, W / 2, H - 150, "Attention 还在路上");
  }
}
