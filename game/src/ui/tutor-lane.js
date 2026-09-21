import { isWidePcTutor } from "../tutor/bus.js";

/**
 * The tutor is a slot inside #pc-stage, not a viewport overlay.
 * `tutorHangPx` only keeps the step counter off the few pixels where
 * she overlaps the lesson card. It is not a right-lane reservation.
 */
export function tutorHangPx() {
  if (typeof window === "undefined" || !isWidePcTutor()) return 0;
  return 36;
}

/** CSS x inside the lesson shell where parchment clicks must not advance. */
export function tutorClickGuardLeft(view) {
  if (!view || !isWidePcTutor()) return Number.POSITIVE_INFINITY;
  return view.right - 300;
}
