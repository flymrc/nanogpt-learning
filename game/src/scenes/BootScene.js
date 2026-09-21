import Phaser from "phaser";
import { C, H, W, displayText } from "../ui/theme.js";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x8ed8ff, 0x8ed8ff, 0xffe0c8, 0xffd6e8, 1);
    g.fillRect(0, 0, W, H);
    this.add.text(W / 2, H / 2, "…", displayText(48, { color: C.text })).setOrigin(0.5);

    this.load.svg("deco-robot", "assets/robot.svg", { width: 200, height: 228 });
    this.load.svg("deco-robot-wow", "assets/robot-wow.svg", { width: 200, height: 228 });
    this.load.svg("deco-scroll", "assets/scroll.svg", { width: 150, height: 170 });
    this.load.svg("deco-star", "assets/star.svg", { width: 64, height: 64 });
    this.load.svg("deco-cloud", "assets/cloud.svg", { width: 180, height: 90 });
    this.load.svg("deco-sparkle", "assets/sparkle.svg", { width: 40, height: 40 });
    this.load.svg("deco-badge", "assets/badge.svg", { width: 80, height: 96 });
    this.load.svg("deco-window", "assets/window-frame.svg", { width: 120, height: 80 });
  }

  create() {
    this.scene.start("Title");
  }
}
