import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import Level1Scene from "./scenes/Level1Scene.js";
import Level2Scene from "./scenes/Level2Scene.js";
import EndScene from "./scenes/EndScene.js";
import { cssViewportSize, displayRatio, gamePixelSize, syncRetinaCamera } from "./ui/dpr.js";
import { readSafeInsets } from "./ui/layout.js";

const startCss = cssViewportSize();
const startDpr = displayRatio();
const startGame = gamePixelSize(startCss, startDpr);

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: startGame.w,
  height: startGame.h,
  backgroundColor: "#f3ebe0",
  antialias: true,
  roundPixels: false,
  audio: {
    disableWebAudio: false,
  },
  scale: {
    // NONE + our own resize: RESIZE would reset the canvas to CSS pixels
    // and throw away the retina backing store.
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: startGame.w,
    height: startGame.h,
    zoom: 1 / startDpr,
    autoRound: true,
    expandParent: false,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: "high-performance",
  },
  scene: [BootScene, TitleScene, Level1Scene, Level2Scene, EndScene],
};

function applyGameSize(game) {
  const css = cssViewportSize();
  const dpr = displayRatio();
  const next = gamePixelSize(css, dpr);
  game.registry.set("dpr", dpr);
  const zoom = 1 / dpr;
  if (Math.abs(game.scale.zoom - zoom) > 0.001) {
    game.scale.setZoom(zoom);
  }
  if (Math.abs(next.w - game.scale.width) >= 2 || Math.abs(next.h - game.scale.height) >= 2) {
    game.scale.resize(next.w, next.h);
  }
  const canvas = game.canvas;
  if (canvas) {
    canvas.style.width = `${css.w}px`;
    canvas.style.height = `${css.h}px`;
  }
  game.scene.getScenes(true).forEach((scene) => syncRetinaCamera(scene, css.w, css.h, dpr));
}

async function boot() {
  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => window.setTimeout(resolve, 2000)),
    ]);
  }
  const game = new Phaser.Game(config);
  game.registry.set("dpr", startDpr);
  game.registry.set("safeInsets", readSafeInsets());
  game.registry.set("assetsReady", false);
  window.__nanoGPTGame = game;

  const shell = document.getElementById("game-shell");
  const syncSize = () => {
    const css = cssViewportSize();
    const vv = window.visualViewport;
    if (shell) {
      shell.style.width = `${css.w}px`;
      shell.style.height = `${css.h}px`;
      if (vv) {
        shell.style.left = `${Math.round(vv.offsetLeft)}px`;
        shell.style.top = `${Math.round(vv.offsetTop)}px`;
      }
    }
    game.registry.set("safeInsets", readSafeInsets());
    applyGameSize(game);
  };
  syncSize();
  game.scale.on("resize", () => {
    const css = cssViewportSize();
    const dpr = displayRatio();
    game.scene.getScenes(true).forEach((scene) => syncRetinaCamera(scene, css.w, css.h, dpr));
  });
  window.addEventListener("resize", syncSize);
  window.visualViewport?.addEventListener("resize", syncSize);
  window.visualViewport?.addEventListener("scroll", syncSize);

  window.__nanoGPTHiDPI = () => {
    const canvas = game.canvas;
    return {
      dpr: displayRatio(),
      css: cssViewportSize(),
      scale: { w: game.scale.width, h: game.scale.height, zoom: game.scale.zoom },
      canvas: {
        width: canvas?.width,
        height: canvas?.height,
        styleWidth: canvas?.style.width,
        styleHeight: canvas?.style.height,
      },
    };
  };

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
