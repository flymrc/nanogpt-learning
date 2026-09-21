import Phaser from "phaser";
import { TITLE_BEAT } from "../data/beats.js";
import { cueVoice, unlockAudio } from "../audio/sound.js";
import { emitTutor } from "../tutor/bus.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { addFooterCta, addMuteToggle, bindAdvance, makeCharTile, paintBackdrop } from "../ui/components.js";
import { fitMeasure, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { C, displayText } from "../ui/theme.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    if (!this.game.registry.get("assetsReady")) {
      this.scene.start("Boot");
      return;
    }

    const shell = makeShell(this, { twoRow: false, headerH: 56 });
    const v = shell.v;
    paintBackdrop(this);
    addMuteToggle(this, shell);
    watchResize(this, { restart: true });

    const plan = layoutTitle(v, shell);
    const titles = plan.slots.titles;
    const titleSize = plan.titleSize;
    const title = this.add.text(v.cx, titles.top + titleSize * 0.55, "nanoGPT 闯关", displayText(titleSize)).setOrigin(0.5);
    title.setScale(0.84);
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 520, ease: "Back.Out" });

    this.add
      .text(v.cx, titles.bottom - titleSize * 0.35, "像课本一样，一步步讲清", displayText(Math.max(16, titleSize * 0.42), { color: C.tealCss }))
      .setOrigin(0.5);

    this.playPreview(v, plan);

    const mascot = plan.slots.mascot;
    const robotX = v.portrait ? v.left + 48 : v.left + 80;
    const robotY = mascot.cy;
    addRobot(this, robotX, robotY, { scale: plan.robotScale });
    addSpeechBubble(this, robotX + (v.portrait ? 140 : 156), robotY - 8, "从一条长纸带讲起！", {
      maxWidth: Math.min(v.compact ? 180 : 240, v.right - robotX - 80),
      fontSize: v.compact ? 18 : 24,
    });

    this.advance = () => {
      if (!this.game.registry.get("assetsReady")) return;
      unlockAudio(this);
      this.registry.remove("level1.progress");
      this.registry.remove("level2.progress");
      this.scene.start("Level1");
    };

    this.startBtn = addFooterCta(this, {
      shell,
      label: "开始",
      caption: "点一下",
      onClick: () => this.advance(),
    });
    bindAdvance(this, () => this.advance());

    cueVoice(this, "vo-title");
    emitTutor(TITLE_BEAT);
  }

  playPreview(v, plan) {
    const sample = ["S", "e", "c", "o", "n", "d"];
    const tile = plan.tile;
    const preview = plan.slots.preview;
    const stack = plan.stackPreview;
    const yChars = stack ? preview.top + tile / 2 + 4 : preview.cy;
    const gap = tile + 8;
    const fromX = v.cx - ((sample.length - 1) * gap) / 2;
    sample.forEach((ch, i) => {
      makeCharTile(this, fromX + i * gap, yChars, ch, {
        width: tile,
        height: tile,
        seed: ch,
      });
    });
    this.add
      .text(v.cx, stack ? preview.bottom - 8 : preview.bottom - 2, "一条长纸带", displayText(16, { color: C.muted }))
      .setOrigin(0.5);
  }
}

function layoutTitle(v, shell) {
  const landscapeShort = v.short && !v.portrait;
  const stackPreview = v.portrait && v.innerW < 520;
  const measured = fitMeasure(shell.content.h, (s) => {
    const titleSize = Math.min(v.portrait ? 48 : 56, v.innerW / (v.portrait ? 7.2 : 12)) * s;
    const tile = Math.max(36, Math.min(54, v.innerW / 10) * s);
    const titlesH = titleSize * 1.7;
    const previewH = stackPreview ? tile + 36 + tile * 1.3 : Math.max(tile * 1.35, 72);
    const mascotH = Math.round((landscapeShort ? 64 : v.portrait ? 96 : 80) * s);
    const gapY = Math.round(14 * s);
    const items = [
      { id: "titles", h: titlesH },
      { id: "preview", h: previewH },
      { id: "mascot", h: mascotH },
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
      titleSize,
      tile,
      stackPreview,
      robotScale: (landscapeShort ? 0.28 : v.short ? 0.32 : v.compact ? 0.38 : 0.46) * Math.min(1, s + 0.1),
    };
  });

  const stacked = stackSlots(measured.items, {
    top: shell.content.top,
    bottom: shell.content.bottom,
    gap: measured.gapY,
    justify: "distribute",
  });

  return { ...measured, slots: stacked.slots };
}
