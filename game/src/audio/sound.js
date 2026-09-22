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
  speakGen += 1;
  heldUtterance = null;
  stopEngine();
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
  missingVoice: false,
  voiceName: "",
};

const VOICE_WAIT_MS = 800;
let cachedVoices = [];
let speakGen = 0;
let heldUtterance = null;
let voiceWatchInstalled = false;
let jaRetry = null;

function traceSpeech(entry) {
  if (typeof window === "undefined") return;
  if (!Array.isArray(window.__nanoGPTSpeechLog)) window.__nanoGPTSpeechLog = [];
  window.__nanoGPTSpeechLog.push({ t: Date.now(), ...entry });
}

function synthOf() {
  return typeof window === "undefined" ? null : window.speechSynthesis || null;
}

function normalizeLang(lang) {
  return String(lang || "").toLowerCase().replace(/_/g, "-");
}

function rememberVoices(list) {
  if (list?.length) cachedVoices = Array.from(list);
  return cachedVoices;
}

function currentVoices() {
  const synth = synthOf();
  if (!synth?.getVoices) return cachedVoices;
  try {
    return rememberVoices(synth.getVoices());
  } catch {
    return cachedVoices;
  }
}

function installVoiceWatch() {
  if (voiceWatchInstalled) return;
  const synth = synthOf();
  if (!synth) return;
  voiceWatchInstalled = true;
  currentVoices();
  synth.addEventListener?.("voiceschanged", () => {
    currentVoices();
    const job = jaRetry;
    if (!job || job.gen !== speakGen || readMuted()) return;
    if (!pickVoice(job.payload.lang)) return;
    jaRetry = null;
    speakSynthesis(job.scene, job.payload);
  });
}

function awaitVoices() {
  installVoiceWatch();
  if (currentVoices().length) return Promise.resolve(cachedVoices);
  const synth = synthOf();
  if (!synth) return Promise.resolve([]);
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener?.("voiceschanged", onChange);
      resolve(currentVoices());
    };
    const onChange = () => {
      if (currentVoices().length) finish();
    };
    synth.addEventListener?.("voiceschanged", onChange);
    window.setTimeout(finish, VOICE_WAIT_MS);
  });
}

function pickVoice(lang) {
  const tag = normalizeLang(lang);
  const pref = tag.slice(0, 2);
  if (!pref) return null;
  const matches = currentVoices().filter((voice) => normalizeLang(voice.lang).startsWith(pref));
  if (!matches.length) return null;
  const rank = (voice) => {
    const name = String(voice.name || "").toLowerCase();
    const vlang = normalizeLang(voice.lang);
    let score = vlang === tag ? 100 : tag && vlang.startsWith(tag) ? 80 : 40;
    if (voice.localService) score += 10;
    if (voice.default) score += 1;
    if (pref === "ja") {
      if (name.includes("google") && (name.includes("日本") || name.includes("ja"))) score += 30;
      if (/kyoko|otoya|nanami|haruka|sayaka|ichiro|mizuki|nozomi/.test(name)) score += 18;
    }
    return score;
  };
  return matches.slice().sort((a, b) => rank(b) - rank(a) || String(a.name).localeCompare(String(b.name)))[0];
}

function stopEngine() {
  const synth = synthOf();
  if (!synth) return;
  try {
    synth.cancel();
    traceSpeech({ op: "cancel" });
  } catch {
    /* no speech engine */
  }
}

function stopClip(scene) {
  const prev = scene?.game?.registry?.get("voice");
  if (!prev) return;
  prev.stop();
  prev.destroy();
  scene.game.registry.set("voice", null);
}

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
    missingVoice: false,
    voiceName: "",
  });
  if (readMuted()) return;
  if (scene?.game?.registry?.get("audioUnlocked")) flushNarration(scene);
}

export function flushNarration(scene) {
  const next = scene?.game?.registry?.get("pendingNarration");
  if (!next || readMuted()) return;
  scene.game.registry.set("pendingNarration", null);
  if (next.clip && scene.cache?.audio?.exists(next.clip)) {
    speak(scene, next.clip);
    publishNarration({ ...next, playing: true, queued: false, muted: false, source: "clip", missingVoice: false, voiceName: "" });
    return;
  }
  speakSynthesis(scene, next);
}

export function cancelSpeech() {
  speakGen += 1;
  heldUtterance = null;
  jaRetry = null;
  stopEngine();
  publishNarration({ playing: false, queued: false });
}

function duckBgm(scene, volume) {
  const bgm = scene?.game?.registry?.get("bgm");
  if (!bgm) return;
  if (volume > 0.2 && !bgm.isPlaying) return;
  bgm.setVolume(volume);
}

/**
 * Chrome drops a speak() that shares a turn with cancel(), and getVoices()
 * is often empty until voiceschanged. Japanese has no clip, so both bugs
 * made JA narration silent while Chinese clips still played.
 */
function speakSynthesis(scene, payload) {
  const gen = ++speakGen;
  heldUtterance = null;
  jaRetry = null;
  stopClip(scene);
  const synth = synthOf();
  if (!synth || !payload.text) {
    publishNarration({
      ...payload,
      playing: false,
      queued: false,
      muted: readMuted(),
      source: "none",
      missingVoice: false,
      voiceName: "",
    });
    return;
  }
  try {
    synth.resume();
  } catch {
    /* engine has no resume */
  }
  installVoiceWatch();

  const begin = () => {
    if (gen !== speakGen || readMuted()) return;
    const lang = payload.lang || "zh-CN";
    const voice = pickVoice(lang);
    const missingVoice = normalizeLang(lang).startsWith("ja") && !voice;
    const utter = new SpeechSynthesisUtterance(payload.text);
    utter.lang = lang;
    if (voice) utter.voice = voice;
    heldUtterance = utter;
    if (typeof window !== "undefined") window.__nanoGPTUtterance = utter;
    jaRetry = missingVoice ? { gen, scene, payload } : null;
    let retried = false;
    const restore = (extra = {}) => {
      duckBgm(scene, 0.26);
      publishNarration({
        ...payload,
        playing: false,
        queued: false,
        source: "speech",
        muted: readMuted(),
        missingVoice,
        voiceName: voice?.name || "",
        ...extra,
      });
    };
    utter.onend = () => {
      if (gen !== speakGen) return;
      restore();
    };
    utter.onerror = (event) => {
      if (gen !== speakGen) return;
      const err = String(event?.error || "");
      if (!retried && (err === "canceled" || err === "interrupted")) {
        retried = true;
        window.setTimeout(() => say(true), 60);
        return;
      }
      if (err === "not-allowed") {
        scene?.game?.registry?.set("pendingNarration", payload);
        restore({ queued: true, error: err });
        return;
      }
      restore({ error: err });
    };
    const say = (fromRetry) => {
      if (gen !== speakGen || readMuted()) return;
      const busy = Boolean(synth.speaking || synth.pending);
      if (busy && !fromRetry) {
        stopEngine();
        window.setTimeout(() => say(true), 50);
        return;
      }
      try {
        try {
          synth.resume();
        } catch {
          /* ignore */
        }
        traceSpeech({
          op: "speak",
          lang: utter.lang,
          voice: voice?.name || "",
          voiceLang: voice?.lang || "",
          text: String(utter.text || "").slice(0, 120),
          missingVoice,
        });
        synth.speak(utter);
        duckBgm(scene, 0.1);
        publishNarration({
          ...payload,
          playing: true,
          queued: false,
          muted: false,
          source: "speech",
          missingVoice,
          voiceName: voice?.name || "",
        });
      } catch {
        restore({ error: "throw" });
      }
    };
    say(false);
  };

  if (currentVoices().length) begin();
  else {
    traceSpeech({ op: "wait", lang: payload.lang || "" });
    awaitVoices().then(begin);
  }
}

if (typeof window !== "undefined") installVoiceWatch();
