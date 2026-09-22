import { unlockAudio } from "../audio/sound.js";
import { guideCards, readSeenGuide, t, writeSeenGuide } from "../i18n/locale.js";

let mounted = false;

export function mountGuide() {
  const overlay = document.getElementById("guide-overlay");
  const close = document.getElementById("guide-close");
  if (!overlay || mounted) {
    renderGuide();
    return;
  }
  mounted = true;
  renderGuide();
  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    dismissGuide();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) dismissGuide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      event.stopPropagation();
      dismissGuide();
    }
  });
  window.addEventListener("nanogpt-lang", () => {
    renderGuide();
  });
  window.__nanoGPTGuideOpen = () => !overlay.hidden;
}

export function renderGuide() {
  const title = document.getElementById("guide-title");
  const close = document.getElementById("guide-close");
  const list = document.getElementById("guide-cards");
  if (title) title.textContent = t("guideTitle");
  if (close) close.textContent = t("guideStart");
  if (!list) return;
  list.innerHTML = "";
  guideCards().forEach((card) => {
    const item = document.createElement("li");
    item.className = "guide-step";
    const num = document.createElement("span");
    num.className = "guide-num";
    num.textContent = String(card.index);
    const h = document.createElement("h3");
    h.textContent = card.title;
    const p = document.createElement("p");
    p.textContent = card.body;
    item.append(num, h, p);
    list.appendChild(item);
  });
}

export function maybeShowGuide() {
  if (readSeenGuide()) return;
  openGuide();
}

export function openGuide() {
  const overlay = document.getElementById("guide-overlay");
  if (!overlay) return;
  renderGuide();
  overlay.hidden = false;
  document.getElementById("guide-close")?.focus();
}

export function dismissGuide() {
  const overlay = document.getElementById("guide-overlay");
  if (!overlay || overlay.hidden) return;
  writeSeenGuide();
  overlay.hidden = true;
  const scene = window.__nanoGPTGame?.scene?.getScenes?.(true)?.[0];
  if (scene) unlockAudio(scene);
}

export function guideBlocksInput() {
  const overlay = document.getElementById("guide-overlay");
  return Boolean(overlay && !overlay.hidden);
}
