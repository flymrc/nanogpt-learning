import { isWidePcTutor } from "../tutor/bus.js";

/**
 * PC parchment composition.
 *
 * `left`/`right` are the lesson column (the same band as the phase card).
 * Hiyori is placed in the right portion of that band. Her x is an offset
 * from `right`, never from the viewport edge, so she moves when the column
 * moves. Mobile never calls this: every export returns 0.
 *
 * `figure` is only the Live2D scale cap. `figureCenter` is the visible mesh.
 */

const BODY_W = 176;
const OVERLAP = 56;
/** Gap between her right side and the lesson column's right edge. */
const FIGURE_INSET = 20;

export function pcComposition(width, height) {
  if (typeof window === "undefined" || !isWidePcTutor()) return null;
  const w = Math.max(320, Math.round(width || window.innerWidth));
  const h = Math.max(320, Math.round(height || window.innerHeight));

  const column = Math.round(Math.min(1040, Math.max(760, w * 0.62)));
  const groupW = column + BODY_W - OVERLAP;
  let left = Math.round(w / 2 - groupW / 2);
  left = Math.max(40, left);
  const right = left + column;

  // Inside the lesson column, against its right edge. Not window.right.
  let figureCenter = Math.round(right - FIGURE_INSET - BODY_W / 2);
  const minCenter = Math.round(left + BODY_W / 2 + 12);
  const maxCenter = Math.round(right - BODY_W / 2 - 8);
  figureCenter = Math.max(minCenter, Math.min(maxCenter, figureCenter));

  const fullH = Math.max(320, h - 12);
  const figure = Math.round(Math.min(w * 0.46, Math.max(480, fullH * 0.72)));
  const bodyLeft = figureCenter - BODY_W / 2;
  const hang = Math.round(Math.min(200, Math.max(48, right - bodyLeft + 16)));
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
