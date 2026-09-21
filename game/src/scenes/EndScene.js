import Phaser from "phaser";
import { END_BEAT } from "../data/beats.js";
import { cueVoice } from "../audio/sound.js";
import { emitTutor } from "../tutor/bus.js";
import {
  addMuteToggle,
  createButton,
  drawSticker,
  paintBackdrop,
  showTooltip,
  spawnConfetti,
} from "../ui/components.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { textureScale } from "../ui/dpr.js";
import { TAP_MIN, clamp, fitMeasure, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { C, displayText, uiText } from "../ui/theme.js";

export default class EndScene extends Phaser.Scene {
  constructor() {
    super("End");
  }

  create() {
    const shell = makeShell(this, { twoRow: false, headerH: 56 });
    const v = shell.v;
    this.shell = shell;
    paintBackdrop(this);
    spawnConfetti(this);
    watchResize(this, { restart: true });
    addMuteToggle(this, shell);
    cueVoice(this, "vo-clear");
    emitTutor(END_BEAT);

    const plan = layoutEnd(v, shell);
    const hero = plan.slots.hero;

    const robotX = v.portrait ? v.cx : v.left + 80;
    const robotY = v.portrait ? hero.top + plan.robotH / 2 : hero.cy;
    addRobot(this, robotX, robotY, { scale: plan.robotScale, mood: "wow" });
    addSpeechBubble(
      this,
      v.portrait ? v.cx + 8 : robotX + 150,
      v.portrait ? robotY + plan.robotH * 0.42 : hero.top + 28,
      "通关啦！",
      { pointer: v.portrait ? "none" : "left", fontSize: v.compact ? 20 : 26, maxWidth: 200 },
    );

    const titleY = v.portrait ? hero.bottom - plan.titleSize * 0.55 : hero.cy + 10;
    this.add.text(v.cx, titleY, "通关！", displayText(plan.titleSize)).setOrigin(0.5);

    const cards = [
      {
        icon: "deco-badge",
        fallback: "带",
        title: "台词拉成纸带",
        caption: "一字一号，65 张牌",
        tip: "先拉纸带，再领号码。号码只是座位号。本局只有这套莎翁字符。",
        accent: C.teal,
      },
      {
        icon: "deco-window",
        fallback: "卷",
        title: "练习卷和验收卷",
        caption: "验收不是答题纸",
        tip: "九成练习、一成抽查。源码里叫 train.bin / val.bin。",
        accent: C.blue,
      },
      {
        icon: "deco-star",
        fallback: "空",
        title: "剪一段来填空",
        caption: "错题分取平均",
        tip: "y 只放在评分桌。评分看真答案被押了多少。本游戏没有训练，也不编造分数。",
        accent: C.gold,
      },
    ];

    const cardBand = plan.slots.cards;
    const cardW = plan.cardW;
    const cardH = plan.cardH;
    const stack = plan.stackCards;

    cards.forEach((card, i) => {
      const x = stack ? v.cx : v.cx + (i - 1) * Math.min(cardW + 16, v.innerW / 3 + 8);
      const y = stack ? cardBand.top + cardH / 2 + i * (cardH + plan.cardGap) : cardBand.cy;
      const panel = this.add.container(x, y);
      const g = this.add.graphics();
      drawSticker(g, -cardW / 2, -cardH / 2, cardW, cardH, 22, C.surface);
      panel.add(g);

      const iconX = stack ? -cardW / 2 + 46 : 0;
      const iconY = stack ? 0 : -cardH * 0.28;
      if (this.textures.exists(card.icon)) {
        panel.add(
          this.add
            .image(iconX, iconY, card.icon)
            .setScale(
              textureScale(card.icon === "deco-star" ? (stack ? 0.5 : 0.62) : stack ? 0.46 : 0.64),
            ),
        );
      } else {
        panel.add(this.add.text(iconX, iconY, card.fallback, displayText(28)).setOrigin(0.5));
      }
      const textX = stack ? 28 : 0;
      panel.add(this.add.text(textX, stack ? -14 : cardH * 0.12, card.title, displayText(stack ? 18 : 22)).setOrigin(0.5));
      panel.add(
        this.add
          .text(textX, stack ? 14 : cardH * 0.34, card.caption, uiText(13, { color: C.muted }))
          .setOrigin(0.5),
      );

      panel.setSize(cardW, cardH);
      panel.setInteractive(
        new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Phaser.Geom.Rectangle.Contains,
      );
      panel.on("pointerdown", (pointer, _lx, _ly, event) => {
        event?.stopPropagation?.();
        showTooltip(this, x, Math.max(shell.content.top + 20, y - cardH / 2 - 12), card.tip);
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

    const btnW = Math.min(168, (shell.footer.w - 16) / 2);
    const btnH = clamp(shell.footer.h - 24, TAP_MIN, 68);
    const btnY = shell.footer.cy;
    createButton(this, shell.footer.cx - btnW / 2 - 8, btnY, "再玩", () => {
      this.scene.start("Title");
    }, { width: btnW, height: btnH });

    const stub = createButton(
      this,
      shell.footer.cx + btnW / 2 + 8,
      btnY,
      "下一关",
      () => this.toast(),
      { width: btnW, height: btnH, fill: C.surface2 },
    );
    stub.setAlpha(0.95);
  }

  toast() {
    const v = this.shell ? this.shell.v : makeShell(this).v;
    showTooltip(this, v.cx, this.shell.footer.top - 24, "Attention 还在路上");
  }
}

function layoutEnd(v, shell) {
  const landscapeShort = v.short && !v.portrait;
  const stackCards = v.portrait;
  const measured = fitMeasure(shell.content.h, (s) => {
    const titleSize = (v.compact ? 36 : 52) * s;
    const robotScale = (v.compact ? 0.36 : 0.48) * Math.min(1, s + 0.08);
    const robotH = 200 * robotScale;
    const heroH = v.portrait ? robotH + 36 + titleSize : Math.max(robotH, titleSize + 24);
    const cardW = stackCards ? Math.min(300, v.innerW - 8) : Math.min(280, (v.innerW - 24) / 3);
    const cardGap = Math.round(10 * s);
    const cardH = stackCards
      ? clamp((shell.content.h - heroH - 24) / 3 - cardGap, 72, 112)
      : clamp(140 * s, 88, 160);
    const cardsH = stackCards ? cardH * 3 + cardGap * 2 : cardH;
    const gapY = Math.round(12 * s);
    const items = [
      { id: "hero", h: heroH },
      { id: "cards", h: cardsH },
    ];
    const stacked = stackSlots(items, {
      top: 0,
      bottom: items.reduce((sum, it) => sum + it.h, 0) + gapY,
      gap: gapY,
      justify: "start",
    });
    return {
      h: stacked.used,
      items,
      gapY,
      titleSize,
      robotScale,
      robotH,
      cardW,
      cardH,
      cardGap,
      stackCards,
    };
  });

  const stacked = stackSlots(measured.items, {
    top: shell.content.top,
    bottom: shell.content.bottom,
    gap: measured.gapY,
    justify: landscapeShort ? "center" : "distribute",
  });

  return { ...measured, slots: stacked.slots };
}
