import Phaser from "phaser";
import { END_BEAT } from "../data/beats.js";
import { syncPseudo } from "../ui/pseudo.js";
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
import { isWidePcTutor } from "../tutor/bus.js";
import { TAP_MIN, clamp, fitMeasure, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { syncMobileChrome } from "../ui/mode.js";
import { C, displayText, uiText } from "../ui/theme.js";

export default class EndScene extends Phaser.Scene {
  constructor() {
    super("End");
  }

  create() {
    const phone = !isWidePcTutor();
    const shell = makeShell(this, phone ? { header: false } : { twoRow: false, headerH: 56 });
    const v = shell.v;
    this.shell = shell;
    paintBackdrop(this);
    spawnConfetti(this);
    watchResize(this, { restart: true });
    if (phone) syncMobileChrome({ title: "通关！" });
    addMuteToggle(this, shell);
    cueVoice(this, "vo-clear");
    emitTutor(END_BEAT);
    syncPseudo(END_BEAT);

    const plan = layoutEnd(v, shell);
    const hero = plan.slots.hero;

    const robotX = v.portrait ? v.cx : v.left + 80;
    const robotY = v.portrait ? hero.top + plan.robotH / 2 : hero.cy;
    addRobot(this, robotX, robotY, { scale: plan.robotScale, mood: "wow" });
    addSpeechBubble(
      this,
      v.portrait ? v.cx + 8 : robotX + 150,
      v.portrait ? robotY + plan.robotH * 0.42 : hero.top + 28,
      "通关啦",
      { pointer: v.portrait ? "none" : "left", fontSize: v.compact ? 20 : 26, maxWidth: 200 },
    );

    const titleY = v.portrait ? hero.bottom - plan.titleSize * 0.55 : hero.cy + 10;
    this.add.text(v.cx, titleY, "通关！", displayText(plan.titleSize)).setOrigin(0.5);

    const cards = [
      {
        icon: "deco-badge",
        fallback: "带",
        title: "台词拉成纸带",
        caption: "一字一格，再领号码",
        tip: "先把台词拉成纸带。每个字符一张号码牌。号码只是座位号。这一课只有 65 张。",
        accent: C.teal,
      },
      {
        icon: "deco-window",
        fallback: "移",
        title: "右移一格来猜",
        caption: "罚分只看平均",
        tip: "看见这张，猜右边那张。y 只放在评分桌上。猜错罚分不在这里编造数字。",
        accent: C.blue,
      },
      {
        icon: "deco-star",
        fallback: "空",
        title: "只看左边",
        caption: "提问、遮罩、加总",
        tip: "每一格回头看自己和左边。右边盖住。按重量把内容加回来。",
        accent: C.violet,
      },
      {
        icon: "deco-scroll",
        fallback: "训",
        title: "按罚分改一笔",
        caption: "验收更好才存档",
        tip: "一批窗口：往前算，记罚分，往回传，AdamW 改一笔。遮罩不动。采样还没写。",
        accent: C.gold,
      },
    ];

    const cardBand = plan.slots.cards;
    const cardW = plan.cardW;
    const cardH = plan.cardH;
    const stack = plan.stackCards;

    cards.forEach((card, i) => {
      const pitch = Math.min(cardW + 12, (v.innerW - 8) / cards.length);
      const x = stack ? v.cx : v.cx + (i - (cards.length - 1) / 2) * pitch;
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
              textureScale(card.icon === "deco-star" ? (stack ? 0.42 : 0.5) : stack ? 0.4 : 0.52),
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
      "采样",
      () => this.toast(),
      { width: btnW, height: btnH, fill: C.surface2 },
    );
    stub.setAlpha(0.95);
  }

  toast() {
    const v = this.shell ? this.shell.v : makeShell(this).v;
    showTooltip(this, v.cx, this.shell.footer.top - 24, "采样还没写");
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
    const cardCount = 4;
    const cardW = stackCards ? Math.min(300, v.innerW - 8) : Math.min(220, (v.innerW - 36) / cardCount);
    const cardGap = Math.round(10 * s);
    const cardH = stackCards
      ? clamp((shell.content.h - heroH - 24) / cardCount - cardGap, 68, 96)
      : clamp(128 * s, 88, 150);
    const cardsH = stackCards ? cardH * cardCount + cardGap * (cardCount - 1) : cardH;
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
