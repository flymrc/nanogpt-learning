import { applyMute, ensureBgm, flushNarration, flushVoice, readMuted, unlockAudioContext } from "./sound.js";
import { t } from "../i18n/locale.js";

const DEBOUNCE_MS = 140;

let lastTap = 0;
let mounted = false;

export function mountMuteHud(getGame) {
  const btn = document.getElementById("mute-toggle");
  if (!btn || mounted) {
    syncMuteHud(readMuted());
    return btn;
  }
  mounted = true;

  syncMuteHud(readMuted());

  const onToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const now = performance.now();
    if (now - lastTap < DEBOUNCE_MS) return;
    lastTap = now;

    const next = !btn.classList.contains("is-muted");
    syncMuteHud(next);
    applyMute(getGame?.() ?? window.__nanoGPTGame, next);

    const game = getGame?.() ?? window.__nanoGPTGame;
    unlockAudioContext(game);
    if (game?.registry && !game.registry.get("audioUnlocked")) {
      game.registry.set("audioUnlocked", true);
    }
    window.setTimeout(() => {
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene) return;
      ensureBgm(scene);
      flushVoice(scene);
      flushNarration(scene);
    }, 0);
  };

  btn.addEventListener("pointerdown", onToggle);
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  btn.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") onToggle(event);
  });

  window.addEventListener("nanogpt-mute", (event) => {
    if (typeof event.detail?.muted === "boolean") syncMuteHud(event.detail.muted);
  });

  return btn;
}

export function syncMuteHud(muted) {
  const btn = document.getElementById("mute-toggle");
  if (!btn) return;
  btn.classList.toggle("is-muted", muted);
  btn.setAttribute("aria-pressed", muted ? "true" : "false");
  btn.setAttribute("aria-label", muted ? t("unmute") : t("mute"));
  btn.title = muted ? t("unmute") : t("mute");
}
