import Phaser from "phaser";
import { cueVoice, unlockAudio } from "../audio/sound.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { addMuteToggle, bindAdvance, createButton, makeCharTile, makeChip, paintBackdrop } from "../ui/components.js";
import { TAP_MIN, getView, watchResize } from "../ui/layout.js";
import { C, displayText, stickerColor } from "../ui/theme.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    if (!this.game.registry.get("assetsReady")) {
      this.scene.start("Boot");
      return;
    }

    const v = getView(this);
    paintBackdrop(this);
    addMuteToggle(this);
    watchResize(this, { restart: true });

    const titleSize = Math.min(v.portrait ? 48 : 64, v.innerW / (v.portrait ? 7.2 : 12));
    const titleY = v.portrait ? v.padTop + v.innerH * 0.12 : v.padTop + v.innerH * 0.16;
    const title = this.add.text(v.cx, titleY, "nanoGPT 闯关", displayText(titleSize)).setOrigin(0.5);
    title.setScale(0.84);
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 520, ease: "Back.Out" });

    this.add
      .text(v.cx, titleY + titleSize * 0.9, "字符变数字", displayText(Math.max(18, titleSize * 0.42), { color: C.tealCss }))
      .setOrigin(0.5);

    this.playPreview(v);

    const robotY = v.portrait ? v.bottom - (v.short ? 148 : v.compact ? 200 : 180) : v.bottom - (v.short ? 86 : 130);
    const robotX = v.portrait ? v.left + 52 : v.left + 86;
    addRobot(this, robotX, robotY, { scale: v.short ? 0.32 : v.compact ? 0.38 : 0.46 });
    addSpeechBubble(this, robotX + (v.portrait ? 150 : 164), robotY - (v.portrait ? 64 : 72), "一起闯关吧！", {
      maxWidth: v.compact ? 180 : 260,
    });

    this.advance = () => {
      if (!this.game.registry.get("assetsReady")) return;
      unlockAudio(this);
      this.registry.remove("level1.progress");
      this.registry.remove("level2.progress");
      this.scene.start("Level1");
    };

    const btnW = Math.min(300, v.innerW - 24);
    const btnH = Math.max(TAP_MIN + 8, v.compact ? 64 : 74);
    const btnY = v.bottom - (v.short && !v.portrait ? 40 : 56);
    const startBtn = createButton(this, v.cx, btnY, "开始", () => this.advance(), {
      width: btnW,
      height: btnH,
      fontSize: v.compact ? 26 : 28,
    });
    startBtn.setDepth(20);
    this.startBtn = startBtn;
    bindAdvance(this, () => this.advance());

    cueVoice(this, "vo-title");
  }

  playPreview(v) {
    const sample = ["S", "e", "c"];
    const ids = [31, 43, 41];
    const tile = Math.max(44, Math.min(54, v.innerW / 10));
    const stack = v.portrait && v.innerW < 520;

    if (stack) {
      const yChars = v.padTop + v.innerH * 0.34;
      const yChips = yChars + tile + 56;
      const fromX = v.cx - tile - 8;
      sample.forEach((ch, i) => {
        makeCharTile(this, fromX + i * (tile + 8), yChars, ch, {
          width: tile,
          height: tile,
          seed: ch,
        });
      });
      this.add.text(v.cx, (yChars + yChips) / 2, "↓", displayText(32, { color: C.coralCss })).setOrigin(0.5);
      this.spawnFlyers(sample, ids, fromX, yChars, fromX, yChips, tile);
      return;
    }

    const y = v.portrait ? v.padTop + v.innerH * 0.4 : v.h * 0.52;
    const fromX = v.cx - tile * 3.4;
    const toX = v.cx + tile * 1.1;
    sample.forEach((ch, i) => {
      makeCharTile(this, fromX + i * (tile + 10), y, ch, { width: tile, height: tile, seed: ch });
    });
    this.add.text(v.cx, y, "→", displayText(36, { color: C.coralCss })).setOrigin(0.5);
    this.spawnFlyers(sample, ids, fromX, y, toX, y, tile);
  }

  spawnFlyers(sample, ids, fromX, fromY, toX, toY, tile) {
    const gap = tile + (toY === fromY ? 10 : 8);
    sample.forEach((ch, i) => {
      this.time.delayedCall(280 + i * 280, () => {
        const flyer = makeCharTile(this, fromX + i * gap, fromY, ch, {
          width: tile - 6,
          height: tile - 6,
          seed: ch,
        });
        this.tweens.add({
          targets: flyer,
          x: toX + i * gap,
          y: toY,
          scale: 0.2,
          duration: 360,
          ease: "Cubic.In",
          onComplete: () => {
            flyer.destroy();
            const chip = makeChip(this, toX + i * gap, toY, {
              glyph: ch,
              id: ids[i],
              accent: stickerColor(ch),
              width: tile,
              height: tile * 1.3,
            });
            chip.setScale(0.5);
            this.tweens.add({ targets: chip, scale: 1, duration: 200, ease: "Back.Out" });
          },
        });
      });
    });
  }
}
