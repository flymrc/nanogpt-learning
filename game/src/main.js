import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import Level1Scene from "./scenes/Level1Scene.js";
import Level2Scene from "./scenes/Level2Scene.js";
import EndScene from "./scenes/EndScene.js";
import { H, W } from "./ui/theme.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#f3ebe0",
  audio: {
    disableWebAudio: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: W,
    height: H,
  },
  scene: [BootScene, TitleScene, Level1Scene, Level2Scene, EndScene],
};

async function boot() {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const game = new Phaser.Game(config);
  window.__nanoGPTGame = game;
  window.__nanoGPTAdvance = () => {
    const active = game.scene.getScenes(true)[0];
    if (!active) return null;
    if (typeof active.advance === "function") {
      active.advance();
    } else if (active.sys.settings.key === "Title") {
      active.scene.start("Level1");
    } else if (active.sys.settings.key === "End") {
      active.scene.start("Title");
    }
    return active.sys.settings.key;
  };
}

boot();
