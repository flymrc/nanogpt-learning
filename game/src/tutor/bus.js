const listeners = new Set();

export function onTutor(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitTutor(payload) {
  const beat = payload || null;
  if (typeof window !== "undefined") {
    window.__nanoGPTTutor = beat;
  }
  listeners.forEach((fn) => {
    try {
      fn(beat);
    } catch (err) {
      console.warn("tutor listener failed", err);
    }
  });
}

export function currentTutor() {
  return typeof window !== "undefined" ? window.__nanoGPTTutor || null : null;
}

export function isWidePcTutor() {
  if (typeof window === "undefined") return false;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w < 1024) return false;
  if (h >= w) return false;
  if (/Android|iPhone|iPod|Mobile/i.test(navigator.userAgent)) return false;
  return true;
}
