import { isWidePcTutor } from "../tutor/bus.js";
import { cssViewportSize, displayRatio, syncRetinaCamera } from "./dpr.js";
import { C } from "./theme.js";

export const TAP_MIN = 48;
export { cssViewportSize, displayRatio } from "./dpr.js";

/** Even gaps: 12–16 on phone, 12–24 on PC. */
export function lessonRhythm(v) {
  if (!isWidePcTutor()) return clamp(Math.round(14 * (v?.uiScale || 1)), 12, 16);
  return clamp(Math.round(16 * (v?.uiScale || 1)), 12, 24);
}

/** DOM 伪代码 / 详细笔记 / 看不懂？ / mute sit in the lesson column. */
export function hudReservePx(v) {
  if (!v || !isWidePcTutor()) return 148;
  return 440;
}

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

/** CSS-pixel viewport. Game backing-store size is this × devicePixelRatio. */
export function viewportSize() {
  return cssViewportSize();
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function getView(scene) {
  const dpr = scene.game?.registry.get("dpr") || displayRatio();
  const css = viewportSize();
  const w = Math.max(
    280,
    Math.round((scene.scale.width || css.w * dpr) / dpr),
  );
  const h = Math.max(
    280,
    Math.round((scene.scale.height || css.h * dpr) / dpr),
  );
  syncRetinaCamera(scene, w, h, dpr);
  const safe = scene.game?.registry.get("safeInsets") || readSafeInsets();
  const phone = !isWidePcTutor();
  const portrait = phone || h >= w * 0.92;
  const short = h < 640;
  const compact = phone || w < 720 || short;
  const padLeft = phone ? 12 : Math.max(16, safe.left + 10);
  const padRight = phone ? 12 : Math.max(16, safe.right + 10);
  const padTop = phone ? 10 : Math.max(10, safe.top + 8);
  const padBottom = phone ? Math.max(12, safe.bottom + 8) : Math.max(16, safe.bottom + 12);
  const innerW = Math.max(200, w - padLeft - padRight);
  const innerH = Math.max(200, h - padTop - padBottom);
  const uiScale = portrait
    ? Math.min(1.35, Math.max(0.78, Math.min(innerW / 390, innerH / 760)))
    : Math.min(1.25, Math.max(0.72, Math.min(innerW / 1100, innerH / 640)));

  return {
    w,
    h,
    cx: padLeft + innerW / 2,
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
    dpr,
  };
}

/** Axis-aligned band used by the header / content / footer shell. */
export function band(left, top, width, height) {
  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    w: width,
    h: height,
    cx: left + width / 2,
    cy: top + height / 2,
  };
}

/**
 * Flex-like page shell. Every scene places chrome in `header`, the CTA in
 * `footer`, and everything else in `content`. Positions come from the live
 * scale size, never from a single hardcoded aspect ratio.
 */
export function makeShell(scene, opts = {}) {
  const v = getView(scene);
  const twoRow = Boolean(opts.twoRow ?? (v.portrait && v.innerW < 540 && opts.header !== false));
  const headerH =
    opts.header === false
      ? 0
      : (opts.headerH ??
        clamp(Math.round((twoRow ? 92 : v.portrait ? 72 : 58) * v.uiScale), twoRow ? 80 : 52, twoRow ? 104 : 80));
  const wantFooter = opts.footer !== false;
  const footerH = wantFooter
    ? (opts.footerH ??
      clamp(Math.round((v.portrait ? 112 : v.short ? 88 : 100) * v.uiScale), 84, 128))
    : 0;
  const gap = opts.gap ?? lessonRhythm(v);
  const hudReserve = opts.hudReserve ?? hudReservePx(v);

  const header = headerH ? band(v.left, v.top, v.innerW, headerH) : band(v.left, v.top, v.innerW, 0);
  const footer = footerH ? band(v.left, v.bottom - footerH, v.innerW, footerH) : band(v.left, v.bottom, v.innerW, 0);
  const contentTop = header.bottom + (headerH ? gap : 0);
  const contentBottom = footer.top - (footerH ? gap : 0);
  const content = band(v.left, contentTop, v.innerW, Math.max(64, contentBottom - contentTop));

  return {
    v,
    header,
    content,
    footer,
    gap,
    hudReserve,
    twoRow,
    uiScale: v.uiScale,
  };
}

/** Vertical stack. If the items overflow the band, they shrink as a group. */
export function stackSlots(items, { top, bottom, gap = 10, justify = "start" } = {}) {
  const available = Math.max(0, bottom - top);
  const raw = items.reduce((sum, item) => sum + item.h, 0) + gap * Math.max(0, items.length - 1);
  const scale = raw > available ? available / Math.max(1, raw) : 1;
  const used =
    items.reduce((sum, item) => sum + item.h * scale, 0) + gap * scale * Math.max(0, items.length - 1);

  let y = top;
  if (justify === "center") y += (available - used) / 2;
  else if (justify === "end") y += available - used;
  else if (justify === "distribute" && items.length > 1 && scale >= 0.999) {
    const extra = (available - used) / (items.length + 1);
    y += extra;
    gap += extra;
  }

  const slots = {};
  items.forEach((item) => {
    const h = item.h * scale;
    slots[item.id] = { top: y, bottom: y + h, cy: y + h / 2, h, scale };
    y += h + gap * scale;
  });
  return { slots, scale, used, available };
}

/**
 * Re-measure a layout at smaller scales until it fits `availableH`.
 * `measureFn(scale)` must return `{ h, ...plan }` at that scale.
 */
export function fitMeasure(availableH, measureFn, { minScale = 0.7, maxScale = 1 } = {}) {
  let scale = maxScale;
  let plan = measureFn(scale);
  for (let i = 0; i < 6 && plan.h > availableH + 1 && scale > minScale + 0.001; i += 1) {
    scale = Math.max(minScale, scale * (availableH / Math.max(1, plan.h)) * 0.97);
    plan = measureFn(scale);
  }
  return { ...plan, scale };
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
      const dpr = scene.game?.registry.get("dpr") || displayRatio();
      const prev = scene.registry.get("_viewSize") || { w: 0, h: 0 };
      const next = {
        w: Math.round(gameSize.width / dpr),
        h: Math.round(gameSize.height / dpr),
      };
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
  const dpr = scene.game?.registry.get("dpr") || displayRatio();
  scene.registry.set("_viewSize", {
    w: Math.round(scene.scale.width / dpr),
    h: Math.round(scene.scale.height / dpr),
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
  const tileH = Math.max(32, tileW * (maxH / maxW));
  return {
    tileW,
    tileH,
    gapX,
    font: Math.max(13, Math.round(tileW * 0.4)),
  };
}

export function paintFill(scene, color = C.page) {
  const v = getView(scene);
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRect(0, 0, v.w, v.h);
  return g;
}
