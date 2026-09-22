const MUTE_KEY = "nanogpt-game-muted";

export const AUDIO_KEYS = [
  "bgm",
  "vo-title",
  "vo-level1",
  "vo-map",
  "vo-reuse",
  "vo-level2",
  "vo-shift",
  "vo-next",
  "vo-loss",
  "vo-clear",
  "sfx-tap",
  "sfx-pop",
];

let startTimer = 0;

export function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode / quota */
  }
}

export function applyMute(game, muted) {
  writeMuted(muted);
  if (game?.sound) game.sound.mute = muted;
  game?.registry?.set("muted", muted);
  if (muted) cancelSpeech();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nanogpt-mute", { detail: { muted: Boolean(muted) } }));
  }
}

export function preloadAudio(scene) {
  AUDIO_KEYS.forEach((key) => {
    scene.load.audio(key, [`audio/${key}.ogg`, `audio/${key}.mp3`]);
  });
}

/** Resume AudioContext on the current user gesture. Do not start clips here. */
export function unlockAudioContext(game) {
  if (!game?.sound) return;
  if (game.sound.locked) {
    game.sound.unlock();
  }
}

/**
 * Unlock Web Audio, then start BGM/VO on the next macrotask so the click
 * frame only flips mute / paints UI.
 */
export function unlockAudio(scene) {
  const game = scene.game;
  unlockAudioContext(game);
  if (!game.registry.get("audioUnlocked")) {
    game.registry.set("audioUnlocked", true);
  }
  deferAudioStart(scene);
}

function deferAudioStart(scene) {
  if (startTimer) return;
  startTimer = window.setTimeout(() => {
    startTimer = 0;
    ensureBgm(scene);
    flushVoice(scene);
    flushNarration(scene);
  }, 0);
}

export function ensureBgm(scene) {
  const game = scene.game;
  if (game.registry.get("bgm")) return;
  if (!game.cache.audio.exists("bgm")) return;
  const bgm = game.sound.add("bgm", { loop: true, volume: 0.26 });
  bgm.play();
  game.registry.set("bgm", bgm);
}

export function cueVoice(scene, key) {
  scene.game.registry.set("pendingVoice", key);
  if (scene.game.registry.get("audioUnlocked")) {
    flushVoice(scene);
  }
}

export function flushVoice(scene) {
  const key = scene.game.registry.get("pendingVoice");
  if (!key) return;
  scene.game.registry.set("pendingVoice", null);
  speak(scene, key);
}

export function speak(scene, key) {
  if (!scene.cache.audio.exists(key)) return;
  stopTts();
  const game = scene.game;
  const prev = game.registry.get("voice");
  if (prev) {
    prev.stop();
    prev.destroy();
  }
  const bgm = game.registry.get("bgm");
  if (bgm) bgm.setVolume(0.1);
  const voice = game.sound.add(key, { volume: 0.9 });
  voice.once("complete", () => {
    if (game.registry.get("voice") === voice) {
      game.registry.set("voice", null);
    }
    if (bgm && bgm.isPlaying) bgm.setVolume(0.26);
    voice.destroy();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nanogpt-voice", { detail: { playing: false, key } }));
    }
  });
  voice.play();
  game.registry.set("voice", voice);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nanogpt-voice", { detail: { playing: true, key } }));
  }
}

export function playSfx(scene, key = "sfx-tap", volume = 0.3) {
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume });
}

let lastNarration = {
  text: "",
  lang: "zh-CN",
  playing: false,
  source: "none",
  kind: "",
  id: "",
  muted: false,
  queued: false,
};

function publishNarration(detail) {
  lastNarration = { ...lastNarration, ...detail };
  if (typeof window === "undefined") return;
  window.__nanoGPTNarration = () => ({ ...lastNarration });
  window.dispatchEvent(new CustomEvent("nanogpt-narration", { detail: { ...lastNarration } }));
}

if (typeof window !== "undefined") {
  window.__nanoGPTNarration = () => ({ ...lastNarration });
}

export function cueNarration(scene, payload) {
  const next = {
    text: String(payload?.text || ""),
    lang: payload?.lang || "zh-CN",
    clip: payload?.clip || null,
    kind: payload?.kind || "beat",
    id: payload?.id || "",
  };
  scene?.game?.registry?.set("pendingNarration", next);
  publishNarration({
    ...next,
    playing: false,
    queued: true,
    muted: readMuted(),
    source: next.clip ? "clip" : "speech",
  });
  if (readMuted()) return;
  if (scene?.game?.registry?.get("audioUnlocked")) flushNarration(scene);
}

export function flushNarration(scene) {
  const next = scene?.game?.registry?.get("pendingNarration");
  if (!next || readMuted()) return;
  scene.game.registry.set("pendingNarration", null);
  if (next.clip && scene.cache?.audio?.exists(next.clip)) {
    stopTts();
    speak(scene, next.clip);
    publishNarration({ ...next, playing: true, queued: false, muted: false, source: "clip" });
    return;
  }
  speakSynthesis(scene, next);
}

export function cancelSpeech() {
  stopTts();
  publishNarration({ playing: false, queued: false });
}

function stopTts() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* no speech engine */
  }
}

function speakSynthesis(scene, payload) {
  const game = scene.game;
  const prev = game.registry.get("voice");
  if (prev) {
    prev.stop();
    prev.destroy();
    game.registry.set("voice", null);
  }
  stopTts();
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth || !payload.text) {
    publishNarration({ ...payload, playing: false, queued: false, muted: readMuted(), source: "none" });
    return;
  }
  const bgm = game.registry.get("bgm");
  if (bgm) bgm.setVolume(0.1);
  const utter = new SpeechSynthesisUtterance(payload.text);
  utter.lang = payload.lang || "zh-CN";
  const voice = pickVoice(utter.lang);
  if (voice) utter.voice = voice;
  const restore = () => {
    if (bgm && bgm.isPlaying) bgm.setVolume(0.26);
    publishNarration({ ...payload, playing: false, queued: false, source: "speech", muted: readMuted() });
  };
  utter.onend = restore;
  utter.onerror = restore;
  try {
    synth.speak(utter);
    publishNarration({ ...payload, playing: true, queued: false, muted: false, source: "speech" });
  } catch {
    restore();
  }
}

function pickVoice(lang) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const pref = String(lang || "").toLowerCase().slice(0, 2);
  return voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith(pref)) || null;
}
