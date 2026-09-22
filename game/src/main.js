import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import TitleScene from "./scenes/TitleScene.js";
import Level1Scene from "./scenes/Level1Scene.js";
import Level2Scene from "./scenes/Level2Scene.js";
import Level3Scene from "./scenes/Level3Scene.js";
import EndScene from "./scenes/EndScene.js";
import { applyMute, readMuted } from "./audio/sound.js";
import { mountMuteHud } from "./audio/mute-hud.js";
import { mountNotesHud } from "./ui/notes.js";
import { mountPseudoHud } from "./ui/pseudo.js";
import { mountTutorBook } from "./ui/textbook.js";
import { mountGameCursor } from "./ui/cursor.js";
import { mountTutorHost, syncTutorHost } from "./tutor/live2d-host.js";
import { cssViewportSize, displayRatio, gamePixelSize, syncRetinaCamera } from "./ui/dpr.js";
import { readSafeInsets } from "./ui/layout.js";
import { applyLayoutMode } from "./ui/mode.js";
import { LEVEL1_BEATS, LEVEL2_BEATS, LEVEL3_BEATS, PHASE_COUNT } from "./data/beats.js";

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
  scene: [BootScene, TitleScene, Level1Scene, Level2Scene, Level3Scene, EndScene],
};

function applyOuterViewport() {
  const layout = document.getElementById("app-layout");
  const vv = window.visualViewport;
  if (!layout) return;
  if (vv) {
    layout.style.width = `${Math.round(vv.width)}px`;
    layout.style.height = `${Math.round(vv.height)}px`;
    layout.style.left = `${Math.round(vv.offsetLeft)}px`;
    layout.style.top = `${Math.round(vv.offsetTop)}px`;
  } else {
    layout.style.width = "";
    layout.style.height = "";
    layout.style.left = "";
    layout.style.top = "";
  }
}

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

  applyOuterViewport();
  applyLayoutMode();
  const bootCss = cssViewportSize();
  const bootDpr = displayRatio();
  const bootGame = gamePixelSize(bootCss, bootDpr);
  config.width = bootGame.w;
  config.height = bootGame.h;
  config.scale.width = bootGame.w;
  config.scale.height = bootGame.h;
  config.scale.zoom = 1 / bootDpr;

  mountMuteHud(() => window.__nanoGPTGame);
  mountNotesHud();
  mountPseudoHud();
  mountTutorBook();
  mountTutorHost();

  const game = new Phaser.Game(config);
  game.registry.set("dpr", bootDpr);
  game.registry.set("safeInsets", readSafeInsets());
  game.registry.set("assetsReady", false);
  applyMute(game, readMuted());
  window.__nanoGPTGame = game;
  mountGameCursor(() => window.__nanoGPTGame);

  const syncSize = () => {
    applyOuterViewport();
    applyLayoutMode();
    syncTutorHost();
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

  window.__nanoGPTSpine = {
    l1: LEVEL1_BEATS.length,
    l2: LEVEL2_BEATS.length,
    l3: LEVEL3_BEATS.length,
    phases: PHASE_COUNT,
  };

  window.__nanoGPTJump = (key, beat = 0, phase = 2) => {
    if (key === "Level1") game.registry.set("level1.progress", { beat, phase });
    if (key === "Level2") game.registry.set("level2.progress", { beat, phase });
    if (key === "Level3") game.registry.set("level3.progress", { beat, phase });
    const active = game.scene.getScenes(true)[0];
    active?.scene.start(key);
    return key;
  };
}

boot();
