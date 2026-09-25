import { applyLayoutMode } from "../ui/mode.js";
import { renderTutorBook } from "../ui/textbook.js";
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
let bootPromise = null;
let bootGen = 0;
let lookHook = null;
const lookTarget = { x: 0, y: 0 };
const lookCurrent = { x: 0, y: 0 };
let lookLastMs = 0;
let reserveLock = false;
let dprWatch = null;

const FIT_MARGIN_X = 14;
const FIT_MARGIN_TOP = 10;
const FIT_MARGIN_BOTTOM = 6;

function displayDpr() {
  const raw = Number(window.devicePixelRatio);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(2, raw);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
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

/** One host canvas only — drop ghost canvases left by a leaked Pixi app. */
function ensureTutorCanvas() {
  const stage = document.getElementById("tutor-stage");
  if (!stage) return null;
  let canvas = document.getElementById("tutor-canvas");
  for (const node of [...stage.querySelectorAll("canvas")]) {
    if (!canvas) canvas = node;
    if (node !== canvas) node.remove();
  }
  if (canvas && !canvas.id) canvas.id = "tutor-canvas";
  if (canvas && canvas.parentElement !== stage) stage.appendChild(canvas);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "tutor-canvas";
    stage.appendChild(canvas);
  }
  canvas.hidden = false;
  return canvas;
}

export function mountTutorHost() {
  if (!started) {
    started = true;
    window.addEventListener("resize", () => {
      window.clearTimeout(window.__nanoGPTTutorResize);
      window.__nanoGPTTutorResize = window.setTimeout(syncTutorLayout, 160);
    });
    window.addEventListener("orientationchange", () => syncTutorLayout());
    window.visualViewport?.addEventListener("resize", () => {
      window.clearTimeout(window.__nanoGPTTutorResize);
      window.__nanoGPTTutorResize = window.setTimeout(syncTutorLayout, 160);
    });
    globalThis.screen?.orientation?.addEventListener?.("change", () => syncTutorLayout());
    watchDevicePixelRatio();
    window.addEventListener("nanogpt-voice", (event) => {
      setTalking(Boolean(event.detail?.playing));
    });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    unsubTutor = onTutor((beat) => applyBeat(beat));
  }
  syncTutorLayout();
}

/** Resize / layout only — never starts a second boot while one is in flight. */
export function syncTutorHost() {
  syncTutorLayout();
}

function syncTutorLayout() {
  applyLayoutMode();
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
  if (pixiApp) {
    resizePixi();
  } else {
    ensureLive2d();
  }
}

function ensureLive2d() {
  if (pixiApp || bootPromise || !isWidePcTutor()) return;
  const gen = bootGen;
  bootPromise = bootLive2d()
    .catch((err) => {
      console.warn("Live2D unavailable, using static tutor", err);
      if (isWidePcTutor()) showStaticFallback();
    })
    .finally(() => {
      bootPromise = null;
      // A teardown aborted this attempt (orientation / gate flip). Retry once eligible.
      if (!pixiApp && isWidePcTutor() && bootGen !== gen) {
        ensureLive2d();
      }
    });
}

async function bootLive2d() {
  const gen = bootGen;
  if (pixiApp) return;

  await loadFirstScript(CUBISM_CORE);
  await loadScript(PIXI_SRC);
  await loadScript(LIVE2D_SRC);
  if (stale(gen)) return;

  const PIXI = window.PIXI;
  if (!PIXI?.Application || !PIXI.live2d?.Live2DModel) {
    throw new Error("pixi-live2d-display did not attach");
  }

  const canvas = ensureTutorCanvas();
  const stage = document.getElementById("tutor-stage");
  const dock = document.getElementById("tutor-dock");
  if (!canvas || !stage || !dock || stale(gen) || pixiApp) return;

  const box = stageBox();
  if (PIXI.settings) {
    PIXI.settings.FILTER_RESOLUTION = box.dpr;
    PIXI.settings.ROUND_PIXELS = false;
  }

  const app = new PIXI.Application({
    view: canvas,
    width: box.w,
    height: box.h,
    resolution: box.dpr,
    // We own CSS size. autoDensity + width:100% stretched a 2× buffer.
    autoDensity: false,
    // Cubism already AAs mesh edges; WebGL MSAA + transparent blend
    // drew a second halo around hair / collar / eyes.
    antialias: false,
    transparent: true,
    backgroundColor: 0x000000,
    backgroundAlpha: 0,
    clearBeforeRender: true,
    powerPreference: "high-performance",
  });
  if (stale(gen)) {
    destroyPixiApp(app);
    return;
  }
  pixiApp = app;
  if (pixiApp.renderer) pixiApp.renderer.backgroundAlpha = 0;
  lastBufferKey = `${box.w}x${box.h}@${box.dpr}`;
  applyCanvasPixels(pixiApp, canvas, box);
  canvas.style.background = "transparent";

  let loaded = null;
  try {
    loaded = await PIXI.live2d.Live2DModel.from(modelUrl(), {
      autoInteract: false,
      autoUpdate: true,
    });
  } catch (err) {
    if (bootGen === gen) {
      destroyPixiApp(pixiApp);
      pixiApp = null;
    }
    throw err;
  }

  if (stale(gen) || pixiApp !== app) {
    loaded?.destroy?.();
    if (pixiApp === app) {
      destroyPixiApp(app);
      pixiApp = null;
    }
    return;
  }

  clearStageModels(pixiApp);
  model = loaded;
  pixiApp.stage.addChild(model);
  model.interactive = true;
  model.anchor.set(0.5, 0.12);
  placeModel();
  attachLookHook(model);
  model.on("hit", () => playMood("react"));
  model.on("pointertap", (event) => {
    const global = event?.data?.global;
    if (global) model.tap(global.x, global.y);
    else playMood("react");
  });

  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(() => resizePixi());
  resizeObserver.observe(stage);
  if (!model.__visW) {
    requestAnimationFrame(() => placeModel());
  }
  applyBeat(currentTutor());
  installDebugProbe();
}

function stale(gen) {
  return gen !== bootGen || !isWidePcTutor();
}

function destroyPixiApp(app) {
  if (!app) return;
  try {
    clearStageModels(app);
    app.destroy(false, { children: true, texture: false, baseTexture: false });
  } catch {
    /* already torn down */
  }
}

function clearStageModels(app) {
  const stage = app?.stage;
  if (!stage) return;
  for (const child of [...stage.children]) {
    stage.removeChild(child);
    try {
      child.destroy?.({ children: true });
    } catch {
      /* ignore */
    }
  }
}

function modelUrl() {
  // Vite serves /public at site root. Prefer that over the import.meta URL
  // which can point at /src during dev.
  return `${import.meta.env.BASE_URL}assets/live2d/Hiyori/Hiyori.model3.json`;
}

function resizePixi() {
  if (!pixiApp) return;
  if (!ensureTutorCanvas()) return;
  placeModel();
}

/** Visible mesh box at scale 1. The layout canvas is taller than the drawn girl. */
function visibleMeshSize(host) {
  if (host.__visW && host.__visH) return { w: host.__visW, h: host.__visH };
  const sx = Math.abs(host.scale?.x || 1) || 1;
  const sy = Math.abs(host.scale?.y || 1) || 1;
  const bounds = host.getBounds?.();
  if (!bounds || !(bounds.width > 8) || !(bounds.height > 8)) return null;
  host.__visW = bounds.width / sx;
  host.__visH = bounds.height / sy;
  return { w: host.__visW, h: host.__visH };
}

function watchDevicePixelRatio() {
  dprWatch?.removeEventListener?.("change", onDprChange);
  const raw = Number(window.devicePixelRatio);
  const dpr = Number.isFinite(raw) && raw > 0 ? raw : 1;
  dprWatch = window.matchMedia(`(resolution: ${dpr}dppx)`);
  dprWatch.addEventListener?.("change", onDprChange);
}

function onDprChange() {
  watchDevicePixelRatio();
  syncTutorLayout();
}

function publishTutorReserve() {
  if (reserveLock) return;
  const canvas = document.getElementById("tutor-canvas");
  if (!canvas || canvas.dataset.fitted !== "1") return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 8 || rect.left < 8) return;
  const reserve = Math.ceil(window.innerWidth - rect.left + 16);
  if (reserve < 120 || reserve > window.innerWidth * 0.55) return;
  const prev = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tutor-reserve")) || 0;
  if (Math.abs(reserve - prev) < 8) return;
  reserveLock = true;
  try {
    document.documentElement.style.setProperty("--tutor-reserve", `${reserve}px`);
    window.dispatchEvent(new Event("resize"));
  } finally {
    reserveLock = false;
  }
}

/**
 * Fill the right-hand panel: visible mesh scaled to the panel height,
 * limited by the panel width, centered, and standing on the bottom edge.
 */
function placeModel() {
  if (!pixiApp || !model) return;
  const dock = stageBox();
  if (dock.w < 40 || dock.h < 40) return;
  const canvas = ensureTutorCanvas();
  if (!canvas) return;
  canvas.dataset.fitted = "";

  applyCanvasPixels(pixiApp, canvas, dock);
  canvas.style.left = "0px";
  canvas.style.top = "0px";

  const mesh = visibleMeshSize(model);
  if (!mesh) {
    model.__fitTries = (model.__fitTries || 0) + 1;
    if (model.__fitTries < 40) requestAnimationFrame(() => placeModel());
    return;
  }

  const availW = Math.max(48, dock.w - FIT_MARGIN_X * 2);
  const availH = Math.max(48, dock.h - FIT_MARGIN_TOP - FIT_MARGIN_BOTTOM);
  const scale = Math.min(availH / mesh.h, availW / mesh.w);
  model.anchor.set(0.5, 0.5);
  model.scale.set(scale);
  model.x = dock.w / 2;
  model.y = dock.h / 2;

  let bounds = model.getBounds?.();
  if (!bounds || !(bounds.width > 8) || !(bounds.height > 8)) return;
  const targetCx = dock.w / 2;
  const targetBottom = dock.h - FIT_MARGIN_BOTTOM;
  model.x += targetCx - (bounds.x + bounds.width / 2);
  model.y += targetBottom - (bounds.y + bounds.height);
  bounds = model.getBounds?.();
  if (!bounds || !(bounds.width > 8) || !(bounds.height > 8)) return;

  if (bounds.x < FIT_MARGIN_X) model.x += FIT_MARGIN_X - bounds.x;
  if (bounds.x + bounds.width > dock.w - FIT_MARGIN_X) {
    model.x -= bounds.x + bounds.width - (dock.w - FIT_MARGIN_X);
  }
  if (bounds.y < FIT_MARGIN_TOP) model.y += FIT_MARGIN_TOP - bounds.y;
  bounds = model.getBounds?.();
  if (!bounds || !(bounds.width > 8) || !(bounds.height > 8)) return;

  const pad = 2;
  const left = Math.max(0, Math.floor(bounds.x - pad));
  const top = Math.max(0, Math.floor(bounds.y - pad));
  const width = Math.min(dock.w - left, Math.ceil(bounds.width + pad * 2));
  const height = Math.min(dock.h - top, Math.ceil(bounds.height + pad * 2));
  if (width < 40 || height < 40) return;

  model.x = Math.round(model.x - left);
  model.y = Math.round(model.y - top);
  lastBufferKey = `fit-${width}x${height}@${dock.dpr}`;
  applyCanvasPixels(pixiApp, canvas, { w: width, h: height, dpr: dock.dpr });
  canvas.style.left = `${left}px`;
  canvas.style.top = `${top}px`;
  canvas.dataset.fitted = "1";
  publishTutorReserve();
}

function teardownLive2d() {
  bootGen += 1;
  talking = false;
  detachLookHook();
  lookTarget.x = 0;
  lookTarget.y = 0;
  lookCurrent.x = 0;
  lookCurrent.y = 0;
  lookLastMs = 0;
  if (mouthRaf) {
    cancelAnimationFrame(mouthRaf);
    mouthRaf = 0;
  }
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (model) {
    try {
      model.destroy();
    } catch {
      /* ignore */
    }
    model = null;
  }
  if (pixiApp) {
    destroyPixiApp(pixiApp);
    pixiApp = null;
  }
  lastBufferKey = "";
  ensureTutorCanvas();
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
  renderTutorBook(beat);
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

/**
 * Eyes / head follow the pointer over the whole wide page.
 * Idle motions would otherwise own ParamAngle*; we overwrite those
 * after each motion update so the face clearly tracks the cursor.
 */
function onPointerMove(event) {
  if (!model || !pixiApp || !isWidePcTutor()) return;
  const canvas = pixiApp.view;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return;
  const bounds = model.getBounds?.();
  const faceX = bounds ? rect.left + bounds.x + bounds.width * 0.5 : rect.right - 180;
  const faceY = bounds ? rect.top + bounds.y + Math.min(bounds.height * 0.16, 200) : rect.top + 160;
  const reachX = Math.max(220, window.innerWidth * 0.28);
  const reachY = Math.max(180, window.innerHeight * 0.32);
  lookTarget.x = clamp((event.clientX - faceX) / reachX, -1, 1);
  lookTarget.y = clamp((faceY - event.clientY) / reachY, -1, 1);
}

function onPointerDown(event) {
  if (!model || !isWidePcTutor()) return;
  const target = event.target;
  if (target?.closest?.("button, a, input, #pc-chrome, #notes-overlay, #lesson-book-overlay, #pseudo-overlay")) return;
  if (!tutorContainsClient(event.clientX, event.clientY)) return;
  playMood("react");
}

function tutorContainsClient(x, y) {
  if (!model || !pixiApp || !isWidePcTutor()) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const canvas = pixiApp.view;
  const bounds = model.getBounds?.();
  if (!canvas || !bounds || bounds.width < 8) return false;
  const rect = canvas.getBoundingClientRect();
  const px = x - rect.left;
  const py = y - rect.top;
  // Hit the visible body, not the transparent padding around the mesh.
  const insetX = bounds.width * 0.3;
  const insetY = bounds.height * 0.04;
  return (
    px >= bounds.x + insetX &&
    px <= bounds.x + bounds.width - insetX &&
    py >= bounds.y + insetY &&
    py <= bounds.y + bounds.height - insetY
  );
}

if (typeof window !== "undefined") {
  window.__nanoGPTTutorContains = tutorContainsClient;
}

function attachLookHook(host) {
  detachLookHook();
  const im = host?.internalModel;
  if (!im || typeof im.on !== "function") return;
  im.focusController?.focus?.(0, 0, true);
  lookHook = () => applyLookOverwrite();
  im.on("afterMotionUpdate", lookHook);
}

function detachLookHook() {
  const im = model?.internalModel;
  if (lookHook && im && typeof im.off === "function") {
    im.off("afterMotionUpdate", lookHook);
  }
  lookHook = null;
}

function applyLookOverwrite() {
  const im = model?.internalModel;
  const core = im?.coreModel;
  if (!core) return;
  const now = performance.now();
  const dt = lookLastMs ? Math.min(48, now - lookLastMs) : 16;
  lookLastMs = now;
  const k = 1 - Math.exp(-dt / 80);
  lookCurrent.x += (lookTarget.x - lookCurrent.x) * k;
  lookCurrent.y += (lookTarget.y - lookCurrent.y) * k;
  const x = lookCurrent.x;
  const y = lookCurrent.y;
  // Official path: updateFocus() adds focus * 30 to head / eyes after this hook.
  im.focusController?.focus?.(x, y, true);
  try {
    core.setParameterValueById?.("ParamAngleX", x * 24);
    core.setParameterValueById?.("ParamAngleY", y * 16);
    core.setParameterValueById?.("ParamAngleZ", x * y * -12);
    core.setParameterValueById?.("ParamEyeBallX", x);
    core.setParameterValueById?.("ParamEyeBallY", y);
    core.setParameterValueById?.("ParamBodyAngleX", x * 12);
    core.setParameterValueById?.("ParamBodyAngleY", y * 5);
  } catch {
    /* optional Cubism ids */
  }
}

function installDebugProbe() {
  window.__nanoGPTTutorHiDPI = () => {
    const canvas = document.getElementById("tutor-canvas");
    const stage = document.getElementById("tutor-stage");
    const dock = document.getElementById("tutor-dock");
    const canvases = stage ? [...stage.querySelectorAll("canvas")] : [];
    const kids = pixiApp?.stage?.children || [];
    const box = stageBox();
    return {
      box,
      canvasCount: canvases.length,
      stageChildren: kids.length,
      modelCount: kids.filter((child) => child?.internalModel).length,
      look: { target: { ...lookTarget }, current: { ...lookCurrent } },
      params: (() => {
        const core = model?.internalModel?.coreModel;
        const read = (id) => {
          try {
            return core?.getParameterValueById?.(id) ?? null;
          } catch {
            return null;
          }
        };
        return {
          angleX: read("ParamAngleX"),
          angleY: read("ParamAngleY"),
          eyeX: read("ParamEyeBallX"),
          eyeY: read("ParamEyeBallY"),
        };
      })(),
      canvas: canvas
        ? {
            width: canvas.width,
            height: canvas.height,
            styleWidth: canvas.style.width,
            styleHeight: canvas.style.height,
            ratio: canvas.width / Math.max(1, canvas.clientWidth),
          }
        : null,
      dockBorder: dock ? getComputedStyle(dock).borderLeftWidth : "",
      place: model
        ? {
            x: model.x,
            y: model.y,
            scale: model.scale?.x,
            bounds: (() => {
              const b = model.getBounds?.();
              return b ? { x: b.x, y: b.y, w: b.width, h: b.height } : null;
            })(),
            slot: { w: box.w, h: box.h },
          }
        : null,
    };
  };
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
