import Phaser from "phaser";
import { CHARSET, displayGlyph } from "../data/facts.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { createButton, makeCharTile, makeChip, paintBackdrop } from "../ui/components.js";
import { C, W, displayText, stickerColor } from "../ui/theme.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    paintBackdrop(this);
    this.spawnStickerLetters();

    addRobot(this, 190, 300, { scale: 1.05 });
    addSpeechBubble(this, 400, 168, "一起闯关吧！");

    const title = this.add.text(W / 2 + 80, 236, "nanoGPT 闯关", displayText(72)).setOrigin(0.5);
    title.setScale(0.84);
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 520, ease: "Back.Out" });

    this.add.text(W / 2 + 80, 300, "字符变数字", displayText(28, { color: C.tealCss })).setOrigin(0.5);

    this.playPreview();

    this.advance = () => this.scene.start("Level1");
    createButton(this, W / 2 + 80, 572, "开始", () => this.advance(), { width: 280, height: 74 });

    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("Level1"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Level1"));
  }

  spawnStickerLetters() {
    const printable = [...CHARSET].filter((ch) => ch !== "\n");
    for (let i = 0; i < 10; i += 1) {
      const ch = printable[(i * 9) % printable.length];
      const tile = makeCharTile(
        this,
        70 + Math.random() * (W - 140),
        40 + Math.random() * (H - 90),
        displayGlyph(ch),
        { width: 48, height: 48, seed: ch },
      );
      tile.setAlpha(0.22);
      tile.setDepth(-1);
      this.tweens.add({
        targets: tile,
        y: tile.y + (i % 2 === 0 ? 22 : -22),
        angle: i % 2 === 0 ? 8 : -8,
        duration: 2600 + i * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }

  playPreview() {
    const sample = ["S", "e", "c"];
    const ids = [31, 43, 41];
    const y = 400;
    const fromX = W / 2 - 20;
    const toX = W / 2 + 250;

    const tiles = sample.map((ch, i) =>
      makeCharTile(this, fromX + i * 66, y, ch, { width: 54, height: 54, seed: ch }),
    );
    this.add.text(fromX + 212, y, "→", displayText(36, { color: C.coralCss })).setOrigin(0.5);

    const run = () => {
      sample.forEach((ch, i) => {
        this.time.delayedCall(i * 260, () => {
          const flyer = makeCharTile(this, tiles[i].x, tiles[i].y, ch, {
            width: 48,
            height: 48,
            seed: ch,
          });
          this.tweens.add({
            targets: flyer,
            x: toX + i * 66,
            scale: 0.2,
            duration: 360,
            ease: "Cubic.In",
            onComplete: () => {
              flyer.destroy();
              const chip = makeChip(this, toX + i * 66, y, {
                glyph: ch,
                id: ids[i],
                accent: stickerColor(ch),
                width: 54,
                height: 72,
              });
              chip.setScale(0.5);
              this.tweens.add({
                targets: chip,
                scale: 1,
                duration: 180,
                ease: "Back.Out",
                hold: 700,
                onComplete: () => {
                  this.tweens.add({
                    targets: chip,
                    alpha: 0,
                    duration: 160,
                    onComplete: () => chip.destroy(),
                  });
                },
              });
            },
          });
        });
      });
    };
    run();
    this.time.addEvent({ delay: 2400, loop: true, callback: run });
  }
}
