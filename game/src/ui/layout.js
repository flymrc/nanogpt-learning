import { C } from "./theme.js";

export const TAP_MIN = 48;

export function readSafeInsets() {
  if (typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const probe = document.getElementById("safe-probe");
  if (!probe) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const cs = getComputedStyle(probe);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

export function viewportSize() {
  const vv = window.visualViewport;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  return {
    w: Math.max(280, w),
    h: Math.max(280, h),
  };
}

export function getView(scene) {
  const w = Math.max(280, Math.round(scene.scale.width || viewportSize().w));
  const h = Math.max(280, Math.round(scene.scale.height || viewportSize().h));
  const safe = scene.game?.registry.get("safeInsets") || readSafeInsets();
  const portrait = h >= w * 0.92;
  const short = h < 640;
  const compact = w < 720 || short;
  const padLeft = Math.max(14, safe.left + 10);
  const padRight = Math.max(14, safe.right + 10);
  const padTop = Math.max(10, safe.top + 8);
  const padBottom = Math.max(14, safe.bottom + 10);
  const innerW = Math.max(200, w - padLeft - padRight);
  const innerH = Math.max(200, h - padTop - padBottom);
  const uiScale = portrait
    ? Math.min(1.35, Math.max(0.78, Math.min(innerW / 390, innerH / 760)))
    : Math.min(1.25, Math.max(0.72, Math.min(innerW / 1100, innerH / 640)));

  return {
    w,
    h,
    cx: w / 2,
    cy: h / 2,
    portrait,
    compact,
    short,
    padLeft,
    padRight,
    padTop,
    padBottom,
    left: padLeft,
    right: w - padRight,
    top: padTop,
    bottom: h - padBottom,
    innerW,
    innerH,
    uiScale,
    safe,
  };
}

export function scaled(scene, size) {
  return Math.round(size * getView(scene).uiScale);
}

export function hideBootSplash() {
  const el = document.getElementById("boot-splash");
  if (!el) return;
  el.classList.add("is-hidden");
  window.setTimeout(() => el.remove(), 320);
}

export function watchResize(scene, { restart = false, persist } = {}) {
  let timer = 0;
  const handle = (gameSize) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!scene.sys.isActive()) return;
      const prev = scene.registry.get("_viewSize") || { w: 0, h: 0 };
      const next = { w: Math.round(gameSize.width), h: Math.round(gameSize.height) };
      const dw = Math.abs(next.w - prev.w);
      const dh = Math.abs(next.h - prev.h);
      const flipped = prev.w && prev.h && next.w > next.h !== prev.w > prev.h;
      if (dw < 28 && dh < 28 && !flipped) return;
      scene.registry.set("_viewSize", next);
      if (restart) {
        persist?.();
        scene.scene.restart();
        return;
      }
      if (typeof scene.relayout === "function") {
        scene.relayout(getView(scene));
      }
    }, 160);
  };
  scene.registry.set("_viewSize", {
    w: Math.round(scene.scale.width),
    h: Math.round(scene.scale.height),
  });
  scene.scale.on("resize", handle);
  scene.events.once("shutdown", () => {
    scene.scale.off("resize", handle);
    window.clearTimeout(timer);
  });
}

export function flowPositions(count, { y, tileW, tileH, gapX, gapY, innerW, cx }) {
  const need = (cols) => cols * tileW + Math.max(0, cols - 1) * gapX;
  let cols = count;
  while (cols > 1 && need(cols) > innerW) cols -= 1;
  cols = Math.max(1, cols);
  const rows = Math.ceil(count / cols);
  return Array.from({ length: count }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const colsInRow = Math.min(cols, count - r * cols);
    const rowStart = cx - need(colsInRow) / 2 + tileW / 2;
    return {
      x: rowStart + c * (tileW + gapX),
      y: y + r * (tileH + gapY),
      cols,
      rows,
    };
  });
}

export function tokenMetrics(count, innerW, { maxW = 62, maxH = 82, minW = 24, gap = 6 } = {}) {
  const gapX = Math.max(3, Math.min(gap, 8));
  let tileW = maxW;
  const total = (tw) => count * tw + Math.max(0, count - 1) * gapX;
  if (total(tileW) > innerW) {
    tileW = Math.max(minW, (innerW - Math.max(0, count - 1) * gapX) / count);
  }
  const tileH = Math.max(30, tileW * (maxH / maxW));
  return {
    tileW,
    tileH,
    gapX,
    font: Math.max(11, Math.round(tileW * 0.4)),
  };
}

export function paintFill(scene, color = C.page) {
  const v = getView(scene);
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(0, 0, v.w, v.h);
  return g;
}
