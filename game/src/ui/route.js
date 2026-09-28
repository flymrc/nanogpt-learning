/** Lesson scenes that can be opened from a hash or a query string. */
const LESSON_SCENES = new Set(["Title", "End", "Level1", "Level2", "Level3", "Level4", "Level5"]);
const STORE_KEY = "nanogpt-lesson";

function finite(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function readSavedLesson() {
  try {
    const data = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    if (!LESSON_SCENES.has(data?.scene)) return null;
    return {
      scene: data.scene,
      beat: finite(data.beat) ?? 0,
      phase: finite(data.phase) ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Root with no lesson token opens Home.
 * `#Level2/1/2` and `?scene=Level2&beat=1&phase=2` open that page.
 * A scene token without a beat restores the last visit to that scene.
 */
export function readEntryTarget() {
  if (typeof location === "undefined") return null;
  const params = new URLSearchParams(location.search);
  const hash = decodeURIComponent(location.hash.replace(/^#/, "").replace(/^\//, ""));
  const [hashScene, hashBeat, hashPhase] = hash.split(/[/?]/);
  const scene = params.get("scene") || hashScene || "";
  if (!LESSON_SCENES.has(scene)) return null;
  let beat = finite(params.get("beat"));
  let phase = finite(params.get("phase"));
  if (beat == null) beat = finite(hashBeat);
  if (phase == null) phase = finite(hashPhase);
  const saved = readSavedLesson();
  if (beat == null && saved?.scene === scene) beat = saved.beat;
  if (phase == null && saved?.scene === scene) phase = saved.phase;
  return { scene, beat: beat ?? 0, phase: phase ?? 0 };
}

export function rememberLesson(sceneKey, beat = 0, phase = 0) {
  if (!LESSON_SCENES.has(sceneKey) || typeof location === "undefined") return;
  const payload = { scene: sceneKey, beat, phase };
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode */
  }
  const nextHash = `#${sceneKey}/${beat}/${phase}`;
  if (location.hash === nextHash) return;
  history.replaceState(history.state, "", `${location.pathname}${location.search}${nextHash}`);
}

export function clearLessonRoute() {
  if (typeof location === "undefined") return;
  const params = new URLSearchParams(location.search);
  params.delete("scene");
  params.delete("beat");
  params.delete("phase");
  const search = params.toString();
  const hashBody = decodeURIComponent(location.hash.replace(/^#/, ""));
  const hashScene = hashBody.split(/[/?]/)[0];
  const keepHash = hashBody && !LESSON_SCENES.has(hashScene) ? `#${hashBody}` : "";
  const next = `${location.pathname}${search ? `?${search}` : ""}${keepHash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next !== current) history.replaceState(history.state, "", next);
}
