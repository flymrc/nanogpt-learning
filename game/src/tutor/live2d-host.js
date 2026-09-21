import { currentTutor, isWidePcTutor, onTutor } from "./bus.js";

const CUBISM_CORE = [
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
  "https://cdn.jsdelivr.net/npm/live2dcubismcore@1.0.2/live2dcubismcore.min.js",
];
const PIXI_SRC = "https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js";
const LIVE2D_SRC = "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js";

let pixiApp = null;
let model = null;
let mouthRaf = 0;
let talking = false;
let resizeObserver = null;
let unsubTutor = null;
let started = false;
let lastBufferKey = "";

function displayDpr() {
  const raw = Number(window.devicePixelRatio);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(2, raw);
}

function stageBox() {
  const stage = document.getElementById("tutor-stage");
  return {
    w: Math.max(1, Math.round(stage?.clientWidth || 280)),
    h: Math.max(1, Math.round(stage?.clientHeight || 400)),
    dpr: displayDpr(),
  };
}

/**
 * Backing store = CSS × DPR; CSS size is set in px (not 100%).
 * Stretching a 1× buffer (or a 2× buffer by a third factor) is what
 * haloed Hiyori's outlines on retina.
 */
function applyCanvasPixels(app, canvas, box) {
  const { w, h, dpr } = box;
  if (app.renderer.resolution !== dpr) {
    app.renderer.resolution = dpr;
  }
  app.renderer.resize(w, h);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
    app.renderer.resize(w, h);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
}

export function mountTutorHost() {
  syncTutorLayout();
  if (!started) {
    started = true;
    window.addEventListener("resize", () => {
      window.clearTimeout(window.__nanoGPTTutorResize);
      window.__nanoGPTTutorResize = window.setTimeout(syncTutorLayout, 160);
    });
    window.addEventListener("nanogpt-voice", (event) => {
      setTalking(Boolean(event.detail?.playing));
    });
    unsubTutor = onTutor((beat) => applyBeat(beat));
  }
}

function syncTutorLayout() {
  const layout = document.getElementById("app-layout");
  const dock = document.getElementById("tutor-dock");
  if (!layout || !dock) return;

  const eligible = isWidePcTutor();
  layout.classList.toggle("is-wide", eligible);
  dock.hidden = !eligible;

  if (!eligible) {
    teardownLive2d();
    return;
  }

  fillBubble(currentTutor());
  if (!pixiApp) {
    bootLive2d().catch((err) => {
      console.warn("Live2D unavailable, using static tutor", err);
      showStaticFallback();
    });
  } else {
    resizePixi();
  }
}

async function bootLive2d() {
  const canvas = document.getElementById("tutor-canvas");
  const stage = document.getElementById("tutor-stage");
  const dock = document.getElementById("tutor-dock");
  if (!canvas || !stage || !dock || pixiApp) return;

  await loadFirstScript(CUBISM_CORE);
  await loadScript(PIXI_SRC);
  await loadScript(LIVE2D_SRC);

  const PIXI = window.PIXI;
  if (!PIXI?.Application || !PIXI.live2d?.Live2DModel) {
    throw new Error("pixi-live2d-display did not attach");
  }

  const box = stageBox();
  if (PIXI.settings) {
    PIXI.settings.FILTER_RESOLUTION = box.dpr;
    PIXI.settings.ROUND_PIXELS = false;
  }

  pixiApp = new PIXI.Application({
    view: canvas,
    width: box.w,
    height: box.h,
    resolution: box.dpr,
    // We own CSS size. autoDensity + width:100% stretched a 2× buffer.
    autoDensity: false,
    // Cubism already AAs mesh edges; WebGL MSAA + transparent blend
    // drew a second halo around hair / collar / eyes.
    antialias: false,
    backgroundColor: 0xf3ebe0,
    backgroundAlpha: 1,
    clearBeforeRender: true,
    powerPreference: "high-performance",
  });
  lastBufferKey = `${box.w}x${box.h}@${box.dpr}`;
  applyCanvasPixels(pixiApp, canvas, box);

  model = await PIXI.live2d.Live2DModel.from(modelUrl(), {
    autoInteract: false,
    autoUpdate: true,
  });
  try {
    model.internalModel?.renderer?.setIsPremultipliedAlpha?.(true);
  } catch {
    /* optional Cubism hook */
  }
  pixiApp.stage.addChild(model);
  model.anchor.set(0.5, 0.12);
  placeModel();
  model.on("hit", () => playMood("react"));

  resizeObserver = new ResizeObserver(() => resizePixi());
  resizeObserver.observe(stage);
  applyBeat(currentTutor());
  window.__nanoGPTTutorHiDPI = () => {
    const box = stageBox();
    return {
      box,
      canvas: {
        width: canvas.width,
        height: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
        ratio: canvas.width / Math.max(1, canvas.clientWidth),
      },
      dockBorder: getComputedStyle(dock).borderLeftWidth,
    };
  };
}

function modelUrl() {
  // Vite serves /public at site root. Prefer that over the import.meta URL
  // which can point at /src during dev.
  return `${import.meta.env.BASE_URL}assets/live2d/Hiyori/Hiyori.model3.json`;
}

function resizePixi() {
  if (!pixiApp) return;
  const canvas = document.getElementById("tutor-canvas");
  if (!canvas) return;
  const box = stageBox();
  const key = `${box.w}x${box.h}@${box.dpr}`;
  if (key !== lastBufferKey) {
    lastBufferKey = key;
    applyCanvasPixels(pixiApp, canvas, box);
  }
  placeModel();
}

function placeModel() {
  if (!pixiApp || !model) return;
  const { w, h } = stageBox();
  if (w < 40 || h < 40) return;
  // Crop to the face / upper body so the tutor is actually visible
  // beside the lesson, not a floating torso.
  const scale = Math.min(w / 1050, h / 820);
  model.anchor.set(0.5, 0.1);
  model.scale.set(scale);
  model.x = w * 0.5;
  model.y = Math.max(4, h * 0.04);
}

function teardownLive2d() {
  talking = false;
  if (mouthRaf) {
    cancelAnimationFrame(mouthRaf);
    mouthRaf = 0;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (model) {
    model.destroy();
    model = null;
  }
  if (pixiApp) {
    pixiApp.destroy(false, { children: true, texture: false, baseTexture: false });
    pixiApp = null;
  }
  lastBufferKey = "";
}

function applyBeat(beat) {
  fillBubble(beat);
  if (!beat) return;
  playMood(beat.mood || "talk");
  if (beat.vo) setTalking(true);
}

function playMood(mood) {
  if (!model) return;
  try {
    if (mood === "point" || mood === "react") {
      model.motion("TapBody");
    } else {
      model.motion("Idle");
    }
  } catch {
    /* motion names differ across models */
  }
}

function setTalking(on) {
  talking = on;
  if (on) startMouth();
  if (!on && model) {
    try {
      model.internalModel?.coreModel?.setParameterValueById?.("ParamMouthOpenY", 0);
    } catch {
      /* ignore */
    }
  }
}

function startMouth() {
  if (mouthRaf) return;
  const tick = () => {
    mouthRaf = 0;
    if (!talking || !model) return;
    const open = 0.15 + Math.abs(Math.sin(performance.now() / 90)) * 0.75;
    try {
      model.internalModel?.coreModel?.setParameterValueById?.("ParamMouthOpenY", open);
    } catch {
      /* ignore */
    }
    mouthRaf = requestAnimationFrame(tick);
  };
  mouthRaf = requestAnimationFrame(tick);
}

function fillBubble(beat) {
  const purpose = document.getElementById("tutor-purpose");
  const caption = document.getElementById("tutor-caption");
  const step = document.getElementById("tutor-step");
  if (!purpose || !caption) return;
  if (!beat) {
    purpose.textContent = "点下一步，我跟着讲";
    caption.textContent = "这一步在干什么";
    if (step) step.textContent = "";
    return;
  }
  purpose.textContent = beat.purpose || "";
  caption.textContent = beat.caption || "";
  if (step) {
    step.textContent =
      typeof beat.index === "number" && typeof beat.total === "number"
        ? `${beat.index + 1} / ${beat.total}`
        : "";
  }
}

function showStaticFallback() {
  const canvas = document.getElementById("tutor-canvas");
  if (canvas) canvas.hidden = true;
  const dock = document.getElementById("tutor-dock");
  if (!dock || dock.querySelector(".tutor-fallback")) return;
  const img = document.createElement("img");
  img.className = "tutor-fallback";
  img.alt = "卡通助教";
  img.src = `${import.meta.env.BASE_URL}assets/robot.svg`;
  dock.appendChild(img);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-lib="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.dataset.lib = src;
    el.onload = () => {
      el.dataset.loaded = "1";
      resolve();
    };
    el.onerror = () => reject(new Error(`script failed: ${src}`));
    document.head.appendChild(el);
  });
}

async function loadFirstScript(urls) {
  let last;
  for (const src of urls) {
    try {
      await loadScript(src);
      if (window.Live2DCubismCore) return;
    } catch (err) {
      last = err;
    }
  }
  throw last || new Error("Cubism core missing");
}

void unsubTutor;
