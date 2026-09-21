import Phaser from "phaser";
import { cueVoice, unlockAudio } from "../audio/sound.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { addMuteToggle, createButton, makeCharTile, makeChip, paintBackdrop } from "../ui/components.js";
import { C, W, displayText, stickerColor } from "../ui/theme.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    paintBackdrop(this);

    addRobot(this, 86, 540, { scale: 0.46 });
    addSpeechBubble(this, 250, 468, "一起闯关吧！");

    const title = this.add.text(W / 2, 168, "nanoGPT 闯关", displayText(72)).setOrigin(0.5);
    title.setScale(0.84);
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 520, ease: "Back.Out" });

    this.add.text(W / 2, 232, "字符变数字", displayText(28, { color: C.tealCss })).setOrigin(0.5);

    this.playPreview();

    this.advance = () => {
      unlockAudio(this);
      this.scene.start("Level1");
    };
    createButton(this, W / 2, 572, "开始", () => this.advance(), { width: 280, height: 74 });
    addMuteToggle(this);
    cueVoice(this, "vo-title");

    this.input.keyboard?.once("keydown-SPACE", () => this.advance());
    this.input.keyboard?.once("keydown-ENTER", () => this.advance());
  }

  playPreview() {
    const sample = ["S", "e", "c"];
    const ids = [31, 43, 41];
    const y = 380;
    const fromX = W / 2 - 196;
    const toX = W / 2 + 70;

    const tiles = sample.map((ch, i) =>
      makeCharTile(this, fromX + i * 66, y, ch, { width: 54, height: 54, seed: ch }),
    );
    this.add.text(W / 2, y, "→", displayText(36, { color: C.coralCss })).setOrigin(0.5);

    sample.forEach((ch, i) => {
      this.time.delayedCall(280 + i * 280, () => {
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
            this.tweens.add({ targets: chip, scale: 1, duration: 200, ease: "Back.Out" });
          },
        });
      });
    });
  }
}
