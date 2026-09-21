/** Cap DPR so a 3x phone does not allocate a huge WebGL buffer. */
export const MAX_DPR = 3;

export function displayRatio() {
  if (typeof window === "undefined") return 1;
  const raw = Number(window.devicePixelRatio);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(MAX_DPR, Math.max(1, raw));
}

/** CSS-pixel viewport (what fingers and `100dvh` see). */
export function cssViewportSize() {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  const w = Math.round(vv?.width ?? window.innerWidth);
  const h = Math.round(vv?.height ?? window.innerHeight);
  return {
    w: Math.max(280, w),
    h: Math.max(280, h),
  };
}

/** Phaser game / canvas backing-store size in device pixels. */
export function gamePixelSize(css = cssViewportSize(), dpr = displayRatio()) {
  return {
    w: Math.max(280, Math.round(css.w * dpr)),
    h: Math.max(280, Math.round(css.h * dpr)),
    cssW: css.w,
    cssH: css.h,
    dpr,
  };
}

/**
 * Map a CSS-pixel world through a dpr-zoomed camera so layout code can
 * keep thinking in CSS pixels while the canvas buffer is retina-sized.
 */
export function syncRetinaCamera(scene, cssW, cssH, dpr = displayRatio()) {
  const cam = scene?.cameras?.main;
  if (!cam) return;
  if (cam.zoom !== dpr) cam.setZoom(dpr);
  cam.centerOn(cssW / 2, cssH / 2);
}

/** SVGs are loaded at CSS size × DPR; divide so on-screen size stays in CSS px. */
export function textureScale(cssScale, dpr = displayRatio()) {
  return cssScale / dpr;
}

export function pointerToCss(scene, pointer) {
  const cam = scene?.cameras?.main;
  if (cam && typeof cam.getWorldPoint === "function") {
    const pt = cam.getWorldPoint(pointer.x, pointer.y);
    return { x: pt.x, y: pt.y };
  }
  const dpr = scene.game?.registry.get("dpr") || displayRatio();
  return { x: pointer.x / dpr, y: pointer.y / dpr };
}
