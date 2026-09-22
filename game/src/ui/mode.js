import { isWidePcTutor } from "../tutor/bus.js";

export function isPcLayout() {
  return isWidePcTutor();
}

/** Hard switch: html.is-pc | html.is-mobile. Never share HUD coordinates. */
export function applyLayoutMode() {
  const pc = isPcLayout();
  const root = document.documentElement;
  root.classList.toggle("is-pc", pc);
  root.classList.toggle("is-mobile", !pc);
  root.dataset.layout = pc ? "pc" : "mobile";

  const layout = document.getElementById("app-layout");
  layout?.classList.toggle("is-wide", pc);
  layout?.classList.toggle("is-phone", !pc);

  const mobileChrome = document.getElementById("mobile-chrome");
  const pcChrome = document.getElementById("pc-chrome");
  const mobileActions = document.getElementById("mobile-actions");
  if (mobileChrome) mobileChrome.hidden = pc;
  if (pcChrome) pcChrome.hidden = !pc;

  const home = pc ? pcChrome : mobileActions;
  if (home) {
    ["pseudo-toggle", "book-toggle", "notes-toggle", "mute-toggle"].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn && btn.parentElement !== home) home.appendChild(btn);
    });
  }

  const dock = document.getElementById("tutor-dock");
  if (dock && !pc) dock.hidden = true;

  window.__nanoGPTLayout = () => snapshotLayout();
  return pc ? "pc" : "mobile";
}

export function syncMobileChrome({ level, total, title } = {}) {
  const badge = document.getElementById("mobile-badge");
  const heading = document.getElementById("mobile-title");
  if (heading && title) heading.textContent = title;
  if (badge) {
    if (level && total) {
      badge.hidden = false;
      badge.textContent = `${level}/${total}`;
    } else {
      badge.hidden = true;
    }
  }
}

export function snapshotLayout() {
  const game = document.getElementById("game-shell");
  const dock = document.getElementById("tutor-dock");
  const mobile = document.getElementById("mobile-chrome");
  const pc = document.getElementById("pc-chrome");
  const overlay = document.getElementById("lesson-book-overlay");
  return {
    mode: document.documentElement.dataset.layout,
    isPc: document.documentElement.classList.contains("is-pc"),
    isMobile: document.documentElement.classList.contains("is-mobile"),
    mobileChrome: mobile ? { hidden: mobile.hidden, h: mobile.offsetHeight } : null,
    pcChrome: pc ? { hidden: pc.hidden } : null,
    tutorDock: dock ? { hidden: dock.hidden, w: dock.offsetWidth } : null,
    gameShell: game ? { w: game.clientWidth, h: game.clientHeight } : null,
    overlayParent: overlay?.parentElement?.id || null,
    hudParent: document.getElementById("mute-toggle")?.parentElement?.id || null,
  };
}
