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
import { TAP_MIN, getView, watchResize } from "../ui/layout.js";
import { C, displayText, uiText } from "../ui/theme.js";

export default class EndScene extends Phaser.Scene {
  constructor() {
    super("End");
  }

  create() {
    const v = getView(this);
    paintBackdrop(this);
    spawnConfetti(this);
    watchResize(this, { restart: true });

    const robotX = v.portrait ? v.cx : v.left + 88;
    const robotY = v.portrait ? v.padTop + 110 : v.padTop + (v.short ? 86 : 140);
    addRobot(this, robotX, robotY, { scale: v.compact ? 0.4 : 0.52, mood: "wow" });
    addSpeechBubble(
      this,
      v.portrait ? v.cx + 8 : robotX + 162,
      v.portrait ? robotY + 78 : 78,
      "通关啦！",
      { pointer: v.portrait ? "none" : "left" },
    );
    addMuteToggle(this);
    cueVoice(this, "vo-clear");

    const titleY = v.portrait ? robotY + 130 : v.padTop + v.innerH * 0.28;
    this.add.text(v.cx, titleY, "通关！", displayText(v.compact ? 40 : 56)).setOrigin(0.5);

    const cards = [
      {
        icon: "deco-badge",
        fallback: "Aa",
        title: "字符变 ID",
        caption: "词表就是 65",
        tip: "prepare.py：字符 → id，写出 train.bin / val.bin / meta.pkl",
        accent: C.teal,
      },
      {
        icon: "deco-window",
        fallback: "▭",
        title: "窗口右移",
        caption: "y 是下一位",
        tip: `x = data[i:i+T]，y = data[i+1:i+1+T]。正式 T=${REAL_BLOCK}，batch=${REAL_BATCH}`,
        accent: C.blue,
      },
      {
        icon: "deco-star",
        fallback: "★",
        title: "预测下一位",
        caption: "65 类对齐",
        tip: "F.cross_entropy 对齐 y[t]。本游戏没有训练模型。",
        accent: C.gold,
      },
    ];

    const cardW = v.portrait ? Math.min(300, v.innerW - 12) : Math.min(320, (v.innerW - 24) / 3);
    const cardH = v.portrait ? 112 : v.short ? 120 : 176;
    const stack = v.portrait;
    const startY = stack ? titleY + 90 : v.bottom - cardH / 2 - 84;

    cards.forEach((card, i) => {
      const x = stack ? v.cx : v.cx + (i - 1) * Math.min(390, v.innerW / 3 + 20);
      const y = stack ? startY + i * (cardH + 12) : startY;
      const panel = this.add.container(x, y);
      const g = this.add.graphics();
      drawSticker(g, -cardW / 2, -cardH / 2, cardW, cardH, 22, C.surface);
      panel.add(g);

      const iconX = stack ? -cardW / 2 + 46 : 0;
      const iconY = stack ? 0 : -46;
      if (this.textures.exists(card.icon)) {
        panel.add(
          this.add
            .image(iconX, iconY, card.icon)
            .setScale(card.icon === "deco-star" ? (stack ? 0.55 : 0.7) : stack ? 0.5 : 0.72),
        );
      } else {
        panel.add(this.add.text(iconX, iconY, card.fallback, displayText(32)).setOrigin(0.5));
      }
      const textX = stack ? 28 : 0;
      panel.add(this.add.text(textX, stack ? -16 : 18, card.title, displayText(stack ? 20 : 26)).setOrigin(0.5));
      panel.add(
        this.add
          .text(textX, stack ? 16 : 50, card.caption, uiText(14, { color: C.muted }))
          .setOrigin(0.5),
      );

      panel.setSize(cardW, cardH);
      panel.setInteractive(
        new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Phaser.Geom.Rectangle.Contains,
      );
      panel.on("pointerdown", (pointer, _lx, _ly, event) => {
        event?.stopPropagation?.();
        showTooltip(this, x, y - cardH / 2 - 12, card.tip);
      });

      panel.setAlpha(0);
      panel.y += 18;
      this.tweens.add({
        targets: panel,
        alpha: 1,
        y,
        delay: 80 + i * 90,
        duration: 280,
        ease: "Back.Out",
      });
    });

    const btnW = Math.min(200, (v.innerW - 16) / 2);
    const btnH = Math.max(TAP_MIN, 60);
    const btnY = v.bottom - 36;
    createButton(this, v.cx - btnW / 2 - 8, btnY, "再玩", () => {
      this.scene.start("Title");
    }, { width: btnW, height: btnH });

    const stub = createButton(
      this,
      v.cx + btnW / 2 + 8,
      btnY,
      "下一关",
      () => this.toast(),
      { width: btnW, height: btnH, fill: C.surface2 },
    );
    stub.setAlpha(0.95);
  }

  toast() {
    const v = getView(this);
    showTooltip(this, v.cx, v.bottom - 110, "Attention 还在路上");
  }
}
