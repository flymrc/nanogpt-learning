import { narrateLine } from "../audio/narrate.js";
import { unlockAudio } from "../audio/sound.js";
import { pseudoFor } from "../data/pseudo.js";
import { t } from "../i18n/locale.js";

let mounted = false;
let currentBeat = null;

export function mountPseudoHud() {
  const btn = document.getElementById("pseudo-toggle");
  const overlay = document.getElementById("pseudo-overlay");
  const close = document.getElementById("pseudo-close");
  if (!btn || !overlay || mounted) return;
  mounted = true;

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePseudo();
  });
  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closePseudo();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePseudo();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      event.stopPropagation();
      closePseudo();
    }
  });

  window.__nanoGPTPseudoOpen = () => !overlay.hidden;
  renderPseudo(currentBeat);
}

export function syncPseudo(beat) {
  currentBeat = beat || null;
  renderPseudo(currentBeat);
}

export function togglePseudo() {
  const overlay = document.getElementById("pseudo-overlay");
  if (!overlay) return;
  if (overlay.hidden) openPseudo();
  else closePseudo();
}

export function openPseudo() {
  const overlay = document.getElementById("pseudo-overlay");
  const btn = document.getElementById("pseudo-toggle");
  if (!overlay) return;
  renderPseudo(currentBeat);
  overlay.hidden = false;
  btn?.setAttribute("aria-expanded", "true");
  const scene = window.__nanoGPTGame?.scene?.getScenes?.(true)?.[0];
  const tip = pseudoFor(currentBeat);
  if (scene && tip?.does) {
    unlockAudio(scene);
    narrateLine(scene, tip.does, "pseudo");
  }
}

export function closePseudo() {
  const overlay = document.getElementById("pseudo-overlay");
  const btn = document.getElementById("pseudo-toggle");
  if (!overlay) return;
  overlay.hidden = true;
  btn?.setAttribute("aria-expanded", "false");
}

function renderPseudo(beat) {
  const tip = pseudoFor(beat);
  const title = document.getElementById("pseudo-title");
  const does = document.getElementById("pseudo-does");
  const metaphor = document.getElementById("pseudo-metaphor");
  const code = document.getElementById("pseudo-code");
  const myth = document.getElementById("pseudo-myth");
  if (title) title.textContent = beat?.purpose ? `${t("pseudo")} · ${beat.purpose}` : t("pseudo");
  if (does) does.textContent = tip.does;
  if (metaphor) metaphor.textContent = tip.metaphor;
  if (code) code.textContent = tip.lines.join("\n");
  if (myth) myth.textContent = tip.myth;
}
