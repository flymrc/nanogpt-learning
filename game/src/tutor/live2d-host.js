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

const FIT_PAD_X = 8;
const FIT_PAD_TOP = 8;
const FIT_PAD_BOTTOM = 6;
const FIT_RIGHT_GAP = 6;
const RESERVE_EXTRA = 16;
/**
 * On main, before this fit, the tutor canvas was width-capped near 300px
 * and `--tutor-reserve` stayed 334. The lesson column was
 * min(1160, viewport − 334). Never go narrower than that.
 */
const MAIN_TUTOR_RESERVE = 334;
/** Visible mesh height is always this fraction of the side panel. */
const HEIGHT_RATIO = 0.9;
/**
 * Extra pixels in the hide check so ceil() cannot slip the lesson
 * under its minimum. The girl is not scaled down to absorb it.
 */
const RESERVE_FUDGE = 2;
/** Once hidden, stay hidden until the spare reserve grows by this much. */
const SHOW_SLACK = 32;
/** Shown stays shown while spare reserve is at least this (px). */
const SHOW_FLOOR = 0;
/** True while the girl is on screen. Hysteresis reads this, not the DOM. */
let tutorOpen = true;

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

  if (!eligible) {
    dock.hidden = true;
    tutorOpen = true;
    delete document.documentElement.dataset.tutor;
    setTutorReserve(0);
    teardownLive2d();
    return;
  }

  fillBubble(currentTutor());
  if (!pixiApp || !model) {
    dock.hidden = false;
    ensureLive2d();
    return;
  }
  placeModel();
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
  if (!model.__mesh) {
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

function lessonFloorPx(viewportW) {
  return Math.min(1160, viewportW - MAIN_TUTOR_RESERVE);
}

function lessonFullPx(viewportW) {
  return Math.min(1160, viewportW);
}

/** Reserve the 90% panel needs: mesh width + pads + gap + lesson margin. */
function neededReservePx(aspect, panelH) {
  const meshW = HEIGHT_RATIO * panelH * aspect;
  const canvasW = Math.ceil(meshW + FIT_PAD_X * 2);
  return canvasW + FIT_RIGHT_GAP + RESERVE_EXTRA + RESERVE_FUDGE;
}

function decideShow(open, spare) {
  if (open) return spare >= SHOW_FLOOR;
  return spare >= SHOW_SLACK;
}

function computeTutorGate(aspect) {
  const vw = window.innerWidth;
  const panelH = window.innerHeight;
  const lessonMin = lessonFloorPx(vw);
  const lessonFull = lessonFullPx(vw);
  const maxReserve = Math.max(0, vw - lessonMin);
  const neededReserve = aspect > 0 ? neededReservePx(aspect, panelH) : 0;
  const spare = maxReserve - neededReserve;
  const known = aspect > 0;
  return {
    open: tutorOpen,
    aspect: known ? aspect : 0,
    neededReserve,
    maxReserve,
    spare,
    heightRatio: HEIGHT_RATIO,
    slack: SHOW_SLACK,
    showFloor: SHOW_FLOOR,
    lessonMin,
    lessonFull,
    panelH,
    show: known ? decideShow(tutorOpen, spare) : tutorOpen,
  };
}

function readTutorReserve() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--tutor-reserve").trim();
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function setTutorReserve(reserve) {
  if (reserveLock) return;
  const next = Math.max(0, Math.round(reserve));
  const prev = readTutorReserve();
  const tol = next === 0 ? 0.5 : 8;
  if (prev != null && Math.abs(next - prev) < tol) return;
  reserveLock = true;
  try {
    document.documentElement.style.setProperty("--tutor-reserve", `${next}px`);
    window.dispatchEvent(new Event("resize"));
  } finally {
    reserveLock = false;
  }
}

function concealTutor() {
  const dock = document.getElementById("tutor-dock");
  const canvas = document.getElementById("tutor-canvas");
  if (dock) dock.hidden = true;
  if (canvas) {
    canvas.hidden = true;
    canvas.dataset.fitted = "";
  }
  document.documentElement.dataset.tutor = "hidden";
  setTutorReserve(0);
}

function revealTutorDock() {
  const dock = document.getElementById("tutor-dock");
  const canvas = document.getElementById("tutor-canvas");
  if (dock) dock.hidden = false;
  if (canvas) canvas.hidden = false;
  document.documentElement.dataset.tutor = "shown";
}

function drawableName(id) {
  if (id == null) return "";
  if (typeof id === "string") return id;
  return String(id.s || id.id || id._id || "");
}

/**
 * Tight box of visible drawables, in the model's canvas pixels.
 * getBounds() is the texture box (wide transparent padding). Hiyori's
 * drawn mesh is much narrower than that box.
 */
function measureVisibleMesh(host) {
  if (host.__mesh) return host.__mesh;
  const im = host.internalModel;
  const core = im?.coreModel;
  if (!core?.getDrawableCount || !im.getDrawableVertices) return null;
  const canvasW = im.width || 0;
  const canvasH = im.height || 0;
  const count = core.getDrawableCount();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let used = 0;
  for (let index = 0; index < count; index += 1) {
    if (typeof core.getDrawableDynamicFlagIsVisible === "function" && !core.getDrawableDynamicFlagIsVisible(index)) continue;
    const opacity = typeof core.getDrawableOpacity === "function" ? core.getDrawableOpacity(index) : 1;
    if (!(opacity > 0.05)) continue;
    const name = drawableName(core.getDrawableId?.(index));
    if (/hit/i.test(name)) continue;
    let verts;
    try {
      verts = im.getDrawableVertices(index);
    } catch {
      continue;
    }
    if (!verts || verts.length < 4) continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < verts.length; k += 2) {
      const x = verts[k];
      const y = verts[k + 1];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
    if (!(x1 > x0) || !(y1 > y0)) continue;
    if (canvasW > 32 && canvasH > 32 && x1 - x0 > canvasW * 0.92 && y1 - y0 > canvasH * 0.92) continue;
    if (x0 < minX) minX = x0;
    if (y0 < minY) minY = y0;
    if (x1 > maxX) maxX = x1;
    if (y1 > maxY) maxY = y1;
    used += 1;
  }
  if (used < 4 || !(maxX > minX + 8) || !(maxY > minY + 8)) return null;
  const mesh = { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, used };
  if (canvasW > 32 && mesh.w > canvasW * 1.02) return null;
  if (canvasH > 32 && mesh.h > canvasH * 1.02) return null;
  host.__mesh = mesh;
  return mesh;
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
  const canvas = document.getElementById("tutor-canvas");
  if (!canvas || canvas.hidden || canvas.dataset.fitted !== "1") return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return;
  const reserve = Math.ceil(window.innerWidth - rect.left + RESERVE_EXTRA);
  if (reserve < 48 || reserve > window.innerWidth * 0.72) return;
  setTutorReserve(reserve);
}

/**
 * Visible mesh is always 90% of the side panel, feet near the bottom,
 * centered in a canvas that is only as wide as that mesh. If that canvas
 * would push the lesson under its main-era minimum, hide the panel
 * instead of scaling the girl down.
 */
function placeModel() {
  if (!pixiApp || !model || !isWidePcTutor()) return;
  const canvas = ensureTutorCanvas();
  if (!canvas) return;

  const mesh = measureVisibleMesh(model);
  if (!mesh) {
    model.__fitTries = (model.__fitTries || 0) + 1;
    if (model.__fitTries < 40) requestAnimationFrame(() => placeModel());
    return;
  }

  const aspect = mesh.w / mesh.h;
  const gate = computeTutorGate(aspect);
  if (!decideShow(tutorOpen, gate.spare)) {
    tutorOpen = false;
    concealTutor();
    return;
  }

  tutorOpen = true;
  revealTutorDock();
  const dockEl = document.getElementById("tutor-dock");
  const dockRect = dockEl?.getBoundingClientRect();
  if (!dockRect || dockRect.width < 40 || dockRect.height < 40) {
    requestAnimationFrame(() => placeModel());
    return;
  }

  const panelH = dockRect.height;
  const scale = (HEIGHT_RATIO * panelH) / mesh.h;
  const meshW = mesh.w * scale;
  const meshH = mesh.h * scale;
  const canvasW = Math.max(48, Math.ceil(meshW + FIT_PAD_X * 2));
  const canvasH = Math.max(48, Math.ceil(meshH + FIT_PAD_TOP + FIT_PAD_BOTTOM));
  const left = Math.round(dockRect.width - FIT_RIGHT_GAP - canvasW);
  const top = Math.round(panelH - FIT_PAD_BOTTOM - meshH - FIT_PAD_TOP);
  const dpr = displayDpr();

  model.anchor.set(0, 0);
  model.scale.set(scale);
  model.x = Math.round(FIT_PAD_X - mesh.minX * scale);
  model.y = Math.round(FIT_PAD_TOP - mesh.minY * scale);

  lastBufferKey = `fit-${canvasW}x${canvasH}@${dpr}`;
  applyCanvasPixels(pixiApp, canvas, { w: canvasW, h: canvasH, dpr });
  canvas.style.left = `${left}px`;
  canvas.style.top = `${top}px`;
  canvas.dataset.fitted = "1";
  canvas.dataset.widthLimited = "0";
  model.__visible = {
    x: FIT_PAD_X,
    y: FIT_PAD_TOP,
    w: meshW,
    h: meshH,
    aspect,
  };
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
  window.__nanoGPTTutorGate = () => {
    const mesh = model?.__mesh;
    const aspect = mesh && mesh.h > 0 ? mesh.w / mesh.h : 0;
    return {
      ...computeTutorGate(aspect),
      reserve: readTutorReserve(),
      tutor: document.documentElement.dataset.tutor || "",
    };
  };
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
            bounds: model.__visible
              ? { x: model.__visible.x, y: model.__visible.y, w: model.__visible.w, h: model.__visible.h }
              : null,
            meshAspect: model.__visible?.aspect ?? null,
            widthLimited: false,
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
