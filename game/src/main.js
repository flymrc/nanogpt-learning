import Phaser from "phaser";
import BootScene from "./scenes/BootScene.js";
import HomeScene from "./scenes/HomeScene.js";
import TitleScene from "./scenes/TitleScene.js";
import Level1Scene from "./scenes/Level1Scene.js";
import Level2Scene from "./scenes/Level2Scene.js";
import Level3Scene from "./scenes/Level3Scene.js";
import Level4Scene from "./scenes/Level4Scene.js";
import Level5Scene from "./scenes/Level5Scene.js";
import EndScene from "./scenes/EndScene.js";
import RagTitleScene from "./scenes/RagTitleScene.js";
import RagEndScene from "./scenes/RagEndScene.js";
import { Rag1Scene, Rag2Scene, Rag3Scene, Rag4Scene, Rag5Scene } from "./scenes/RagLevelScene.js";
import EmbedTitleScene from "./scenes/EmbedTitleScene.js";
import EmbedEndScene from "./scenes/EmbedEndScene.js";
import { Embed1Scene, Embed2Scene, Embed3Scene, Embed4Scene, Embed5Scene } from "./scenes/EmbedLevelScene.js";
import { applyMute, readMuted, unlockAudio } from "./audio/sound.js";
import { JA } from "./i18n/ja.js";
import { setLang, toggleLang } from "./i18n/locale.js";
import { ZH } from "./i18n/zh.js";
import { applyChromeCopy, bindVoiceNote } from "./ui/chrome.js";
import { mountCatalog } from "./ui/catalog.js";
import { mountGuide } from "./ui/guide.js";
import { mountMuteHud } from "./audio/mute-hud.js";
import { mountNotesHud } from "./ui/notes.js";
import { mountPseudoHud } from "./ui/pseudo.js";
import { mountTutorBook } from "./ui/textbook.js";
import { mountGameCursor } from "./ui/cursor.js";
import { mountTutorHost, syncTutorHost } from "./tutor/live2d-host.js";
import { cssViewportSize, displayRatio, gamePixelSize, syncRetinaCamera } from "./ui/dpr.js";
import { readSafeInsets } from "./ui/layout.js";
import { applyLayoutMode } from "./ui/mode.js";
import { LEVEL1_BEATS, LEVEL2_BEATS, LEVEL3_BEATS, LEVEL4_BEATS, LEVEL5_BEATS, PHASE_COUNT } from "./data/beats.js";
import { embedPagesFor } from "./i18n/embed/skeleton.js";
import { EMBED_JA } from "./i18n/embed/ja.js";
import { EMBED_ZH } from "./i18n/embed/zh.js";
import { ragPagesFor } from "./i18n/rag/skeleton.js";
import { RAG_JA } from "./i18n/rag/ja.js";
import { RAG_ZH } from "./i18n/rag/zh.js";
import { sceneProgressKey } from "./ui/catalog.js";

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
  scene: [
    BootScene,
    HomeScene,
    TitleScene,
    Level1Scene,
    Level2Scene,
    Level3Scene,
    Level4Scene,
    Level5Scene,
    EndScene,
    RagTitleScene,
    Rag1Scene,
    Rag2Scene,
    Rag3Scene,
    Rag4Scene,
    Rag5Scene,
    RagEndScene,
    EmbedTitleScene,
    Embed1Scene,
    Embed2Scene,
    Embed3Scene,
    Embed4Scene,
    Embed5Scene,
    EmbedEndScene,
  ],
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
  game.scale.updateBounds();
  game.scene.getScenes(true).forEach((scene) => syncRetinaCamera(scene, css.w, css.h, dpr));
}

function fontSample(...packs) {
  const chars = new Set();
  for (const pack of packs) {
    for (const value of Object.values(pack)) {
      if (typeof value !== "string") continue;
      for (const ch of value) {
        if (ch.trim()) chars.add(ch);
      }
    }
  }
  return [...chars].join("");
}

async function boot() {
  if (document.fonts?.ready) {
    const zhSample = fontSample(ZH, RAG_ZH, EMBED_ZH);
    const jaSample = fontSample(JA, RAG_JA, EMBED_JA);
    const both = fontSample(ZH, JA, RAG_ZH, RAG_JA, EMBED_ZH, EMBED_JA);
    const loads = document.fonts.load
      ? [
          document.fonts.load('700 32px "Noto Sans JP"', jaSample),
          document.fonts.load('500 28px "Noto Sans JP"', jaSample),
          document.fonts.load('400 48px "ZCOOL QingKe HuangYou"', zhSample),
          document.fonts.load('500 28px "Noto Sans SC"', both),
          document.fonts.load('700 32px "Noto Sans SC"', both),
          document.fonts.load('700 32px "Fredoka"', "All First"),
          document.fonts.load('500 28px "Noto Sans Symbols 2"', "␣↵□○"),
          document.fonts.load('500 28px "Noto Emoji"', "🍌🍎🔴🔵⭐"),
        ]
      : [];
    await Promise.race([
      Promise.allSettled([document.fonts.ready, ...loads]),
      new Promise((resolve) => window.setTimeout(resolve, 8000)),
    ]);
  }

  applyOuterViewport();
  applyLayoutMode();
  applyChromeCopy();
  bindVoiceNote();
  mountGuide();
  mountCatalog();
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
  const chrome = document.getElementById("mobile-chrome");
  if (chrome && typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => syncSize());
    observer.observe(chrome);
  }
  game.scale.on("resize", () => {
    const css = cssViewportSize();
    const dpr = displayRatio();
    game.scene.getScenes(true).forEach((scene) => syncRetinaCamera(scene, css.w, css.h, dpr));
  });
  const onLang = () => {
    applyLayoutMode();
    applyChromeCopy();
    syncSize();
    const scene = game.scene.getScenes(true)[0];
    if (!scene || scene.sys.settings.key === "Boot") return;
    game.registry.set("forceSpeak", true);
    const key = scene.sys.settings.key;
    if (/^(Level|Rag|Embed)[1-5]$/.test(key)) {
      const payload = { beat: scene.beat || 0, phase: scene.phase || 0 };
      game.registry.set(`${key.toLowerCase()}.progress`, payload);
      scene.scene.restart(payload);
      return;
    }
    scene.scene.restart();
  };
  window.addEventListener("nanogpt-lang", onLang);
  document.getElementById("lang-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const scene = game.scene.getScenes(true)[0];
    if (scene) unlockAudio(scene);
    toggleLang();
  });
  window.__nanoGPTSetLang = (next) => setLang(next);

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
      active.scene.start("Level1", { beat: 0, phase: 0 });
    } else if (active.sys.settings.key === "End") {
      active.scene.start("Title");
    }
    return active.sys.settings.key;
  };

  window.__nanoGPTSpine = {
    l1: LEVEL1_BEATS.length,
    l2: LEVEL2_BEATS.length,
    l3: LEVEL3_BEATS.length,
    l4: LEVEL4_BEATS.length,
    l5: LEVEL5_BEATS.length,
    phases: PHASE_COUNT,
  };

  window.__nanoGPTRagSpine = {
    l1: ragPagesFor(1).length,
    l2: ragPagesFor(2).length,
    l3: ragPagesFor(3).length,
    l4: ragPagesFor(4).length,
    l5: ragPagesFor(5).length,
    phases: PHASE_COUNT,
  };

  window.__nanoGPTEmbedSpine = {
    l1: embedPagesFor(1).length,
    l2: embedPagesFor(2).length,
    l3: embedPagesFor(3).length,
    l4: embedPagesFor(4).length,
    l5: embedPagesFor(5).length,
    phases: PHASE_COUNT,
  };

  window.__nanoGPTJump = (key, beat = 0, phase = 2) => {
    const payload = { beat, phase };
    const store = sceneProgressKey(key);
    if (store) game.registry.set(store, payload);
    const active = game.scene.getScenes(true)[0];
    active?.scene.start(key, payload);
    return key;
  };
}

boot();
