import { isWidePcTutor } from "../tutor/bus.js";

/**
 * PC only. The Live2D canvas is the full parchment (no sidebar clip).
 * `tutorFigurePx` is how wide her drawing is allowed to be.
 * `tutorHangPx` is how far that drawing may cover the lesson.
 * `tutorLanePx` is the right padding that keeps widgets off her torso.
 */
export function tutorFigurePx() {
  if (typeof window === "undefined" || !isWidePcTutor()) return 0;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fullH = Math.max(320, h - 12);
  const naturalW = fullH * 0.72;
  return Math.round(Math.min(w * 0.46, Math.max(480, naturalW)));
}

export function tutorHangPx() {
  const figure = tutorFigurePx();
  if (!figure) return 0;
  return Math.min(120, Math.round(figure * 0.18));
}

export function tutorLanePx() {
  return Math.max(0, tutorFigurePx() - tutorHangPx());
}
