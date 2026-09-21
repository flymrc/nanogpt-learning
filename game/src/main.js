import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import Level1Scene from "./scenes/Level1Scene.js";
import Level2Scene from "./scenes/Level2Scene.js";
import EndScene from "./scenes/EndScene.js";
import { readSafeInsets, viewportSize } from "./ui/layout.js";

const startSize = viewportSize();

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: startSize.w,
  height: startSize.h,
  backgroundColor: "#f3ebe0",
  audio: {
    disableWebAudio: false,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: startSize.w,
    height: startSize.h,
    expandParent: false,
    resizeInterval: 80,
  },
  scene: [BootScene, TitleScene, Level1Scene, Level2Scene, EndScene],
};

async function boot() {
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 2000)),
    ]);
  }
  const game = new Phaser.Game(config);
  game.registry.set("safeInsets", readSafeInsets());
  game.registry.set("assetsReady", false);
  window.__nanoGPTGame = game;

  const shell = document.getElementById("game-shell");
  const syncSize = () => {
    const { w, h } = viewportSize();
    const vv = window.visualViewport;
    if (shell) {
      shell.style.width = `${w}px`;
      shell.style.height = `${h}px`;
      if (vv) {
        shell.style.left = `${Math.round(vv.offsetLeft)}px`;
        shell.style.top = `${Math.round(vv.offsetTop)}px`;
      }
    }
    game.registry.set("safeInsets", readSafeInsets());
    if (Math.abs(w - game.scale.width) >= 2 || Math.abs(h - game.scale.height) >= 2) {
      game.scale.resize(w, h);
    }
  };
  syncSize();
  window.addEventListener("resize", syncSize);
  window.visualViewport?.addEventListener("resize", syncSize);
  window.visualViewport?.addEventListener("scroll", syncSize);

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
