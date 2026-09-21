import { isWidePcTutor } from "../tutor/bus.js";

/**
 * PC parchment composition.
 *
 * The lesson used to pad itself as if a tutor column were reserved on the
 * right. After the dock became a transparent overlay, that pad left the
 * cards on the far left and Hiyori on the window edge. One geometry now
 * places the lesson and her body as a single group centered on the page.
 * Mobile never calls this: every export returns 0.
 *
 * `figure` is only the Live2D scale cap (full-height body, wide transparent
 * canvas). `figureCenter` is where the visible mesh sits.
 */

const BODY_W = 176;
const OVERLAP = 56;

export function pcComposition(width, height) {
  if (typeof window === "undefined" || !isWidePcTutor()) return null;
  const w = Math.max(320, Math.round(width || window.innerWidth));
  const h = Math.max(320, Math.round(height || window.innerHeight));

  const column = Math.round(Math.min(1040, Math.max(760, w * 0.62)));
  const groupW = column + BODY_W - OVERLAP;
  let left = Math.round(w / 2 - groupW / 2);
  left = Math.max(40, left);
  let right = left + column;
  let figureCenter = Math.round(right - OVERLAP + BODY_W / 2);

  const minRight = 108;
  const bodyRight = figureCenter + BODY_W / 2;
  if (bodyRight > w - minRight) {
    const shift = bodyRight - (w - minRight);
    left -= shift;
    right -= shift;
    figureCenter -= shift;
  }
  if (left < 40) {
    const shift = 40 - left;
    left += shift;
    right += shift;
    figureCenter += shift;
  }

  const fullH = Math.max(320, h - 12);
  const figure = Math.round(Math.min(w * 0.46, Math.max(480, fullH * 0.72)));
  const hang = Math.round(Math.min(110, OVERLAP + 28));
  const buttonsRight = Math.round(figureCenter - 124);
  const buttonsLeft = buttonsRight - 276;
  const chromeRight = Math.max(16, w - buttonsRight);
  const hud = Math.round(Math.min(column * 0.46, Math.max(168, right - buttonsLeft + 16)));

  return {
    w,
    h,
    left: Math.round(left),
    right: Math.round(right),
    column: Math.round(right - left),
    figure,
    figureCenter: Math.round(figureCenter),
    hang,
    chromeRight,
    buttonsLeft: Math.round(buttonsLeft),
    hud,
  };
}

export function tutorFigurePx() {
  return pcComposition()?.figure ?? 0;
}

export function tutorHangPx() {
  return pcComposition()?.hang ?? 0;
}

/** Extra right pad beyond the small safe inset. Prefer pcComposition(). */
export function tutorLanePx() {
  const comp = pcComposition();
  if (!comp) return 0;
  return Math.max(0, comp.w - comp.right);
}

export function tutorChromeInsetPx() {
  return pcComposition()?.chromeRight ?? 0;
}

/** CSS x where parchment clicks must not advance (the button cluster). */
export function tutorClickGuardLeft(view) {
  const comp = pcComposition(view?.w, view?.h);
  if (!comp) return Number.POSITIVE_INFINITY;
  return comp.buttonsLeft - 8;
}
