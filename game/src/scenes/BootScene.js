import Phaser from "phaser";
import { applyMute, preloadAudio, readMuted } from "../audio/sound.js";
import { displayRatio } from "../ui/dpr.js";
import { getView, hideBootSplash, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { drawSticker } from "../ui/components.js";
import { t } from "../i18n/locale.js";
import { C, displayText, uiText } from "../ui/theme.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  init() {
    this.game.registry.set("assetsReady", false);
    this.progress = 0;
    this.ui = null;
  }

  preload() {
    this.buildLoader();
    hideBootSplash();
    watchResize(this, { restart: false });

    this.load.on("progress", (value) => this.setProgress(value));
    this.load.on("loaderror", (file) => {
      console.warn("asset failed", file?.key, file?.src);
    });

    const dpr = displayRatio();
    const svg = (w, h) => ({ width: Math.round(w * dpr), height: Math.round(h * dpr) });
    this.load.svg("deco-robot", "assets/robot.svg", svg(200, 228));
    this.load.svg("deco-robot-wow", "assets/robot-wow.svg", svg(200, 228));
    this.load.svg("deco-scroll", "assets/scroll.svg", svg(150, 170));
    this.load.svg("deco-star", "assets/star.svg", svg(64, 64));
    this.load.svg("deco-sparkle", "assets/sparkle.svg", svg(40, 40));
    this.load.svg("deco-badge", "assets/badge.svg", svg(80, 96));
    this.load.svg("deco-window", "assets/window-frame.svg", svg(120, 80));
    preloadAudio(this);
  }

  create() {
    this.setProgress(1);
    applyMute(this.game, readMuted());
    this.sound.pauseOnBlur = true;
    this.game.registry.set("assetsReady", true);
    this.time.delayedCall(220, () => this.scene.start("Title"));
  }

  relayout() {
    this.buildLoader();
    this.setProgress(this.progress ?? 0);
  }

  buildLoader() {
    const v = getView(this);
    if (this.ui?.root) {
      this.tweens.killTweensOf(this.ui.spinner);
      this.ui.root.destroy(true);
    }

    const root = this.add.container(0, 0);
    const bg = this.add.graphics();
    bg.fillGradientStyle(C.skyTop, C.skyTop, C.skyBot, C.skyBot, 1);
    bg.fillRect(0, 0, v.w, v.h);
    root.add(bg);

    const shell = makeShell(this, { header: false, footer: false, gap: 0 });
    const titleSize = Math.min(40, Math.max(24, v.innerW / 8));
    const items = [
      { id: "spin", h: 80 },
      { id: "title", h: titleSize + 8 },
      { id: "status", h: 28 },
      { id: "pct", h: 44 },
      { id: "bar", h: 36 },
      { id: "hint", h: 28 },
    ];
    const { slots } = stackSlots(items, {
      top: shell.content.top,
      bottom: shell.content.bottom,
      gap: v.short ? 10 : 14,
      justify: "center",
    });

    const cx = v.cx;
    const plate = this.add.graphics();
    drawSticker(plate, cx - 36, slots.spin.cy - 36, 72, 72, 24, C.cream);
    root.add(plate);

    const spinner = this.add.graphics();
    spinner.lineStyle(7, C.stroke, 1);
    spinner.beginPath();
    spinner.arc(0, 0, 18, 0.2, Math.PI * 1.4);
    spinner.strokePath();
    spinner.lineStyle(5, C.coral, 1);
    spinner.beginPath();
    spinner.arc(0, 0, 18, 0.2, Math.PI * 0.9);
    spinner.strokePath();
    spinner.setPosition(cx, slots.spin.cy);
    root.add(spinner);
    this.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 900,
      repeat: -1,
      ease: "Linear",
    });

    const title = this.add
      .text(cx, slots.title.cy, t("appTitle"), displayText(titleSize))
      .setOrigin(0.5);
    const status = this.add.text(cx, slots.status.cy, t("bootLoading"), uiText(18, { color: C.muted })).setOrigin(0.5);
    const percent = this.add.text(cx, slots.pct.cy, "0%", displayText(36)).setOrigin(0.5);
    root.add([title, status, percent]);

    const barW = Math.min(320, v.innerW - 24);
    const barH = 28;
    const barX = cx - barW / 2;
    const barY = slots.bar.cy - barH / 2;
    const barBg = this.add.graphics();
    drawSticker(barBg, barX, barY, barW, barH, 14, C.surface, { lineWidth: 5 });
    const barFill = this.add.graphics();
    root.add([barBg, barFill]);

    const hint = this.add.text(cx, slots.hint.cy, t("bootHint"), uiText(14, { color: C.muted })).setOrigin(0.5);
    root.add(hint);

    this.ui = { root, status, percent, barFill, barW, barH, barX, barY, spinner };
  }

  setProgress(value) {
    this.progress = value;
    if (!this.ui) this.buildLoader();
    const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
    this.ui.percent.setText(`${pct}%`);
    this.ui.status.setText(pct >= 100 ? t("bootReady") : t("bootLoading"));
    const { barFill, barW, barH, barX, barY } = this.ui;
    barFill.clear();
    const fillW = Math.max(0, (barW - 10) * (pct / 100));
    if (fillW > 0) {
      barFill.fillStyle(C.coral, 1);
      barFill.fillRoundedRect(barX + 5, barY + 5, fillW, barH - 10, 10);
    }
  }
}
