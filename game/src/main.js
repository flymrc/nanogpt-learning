import Phaser from "phaser";
import TitleScene from "./scenes/TitleScene.js";
import Level1Scene from "./scenes/Level1Scene.js";
import Level2Scene from "./scenes/Level2Scene.js";
import EndScene from "./scenes/EndScene.js";
import { C, H, W } from "./ui/theme.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: C.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H,
  },
  scene: [TitleScene, Level1Scene, Level2Scene, EndScene],
};

async function boot() {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  // eslint-disable-next-line no-new
  new Phaser.Game(config);
}

boot();
