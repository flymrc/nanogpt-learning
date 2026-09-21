const MUTE_KEY = "nanogpt-game-muted";

export const AUDIO_KEYS = [
  "bgm",
  "vo-title",
  "vo-level1",
  "vo-map",
  "vo-level2",
  "vo-shift",
  "vo-clear",
  "sfx-tap",
  "sfx-pop",
];

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
  game.sound.mute = muted;
  writeMuted(muted);
  game.registry.set("muted", muted);
}

export function preloadAudio(scene) {
  AUDIO_KEYS.forEach((key) => {
    scene.load.audio(key, [`audio/${key}.ogg`, `audio/${key}.mp3`]);
  });
}

export function unlockAudio(scene) {
  const game = scene.game;
  if (game.sound.locked) {
    game.sound.unlock();
  }
  game.registry.set("audioUnlocked", true);
  ensureBgm(scene);
  flushVoice(scene);
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
  });
  voice.play();
  game.registry.set("voice", voice);
}

export function playSfx(scene, key = "sfx-tap", volume = 0.3) {
  if (!scene.cache.audio.exists(key)) return;
  scene.sound.play(key, { volume });
}
