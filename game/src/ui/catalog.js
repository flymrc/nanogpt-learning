import { narrateLine } from "../audio/narrate.js";
import { unlockAudio } from "../audio/sound.js";
import { LEVEL1_BEATS, LEVEL2_BEATS, LEVEL3_BEATS, LEVEL4_BEATS, LEVEL5_BEATS, PHASE_COUNT } from "../data/beats.js";
import { chapterList, t } from "../i18n/locale.js";
import { openGuide } from "./guide.js";

const BEAT_COUNTS = {
  Level1: LEVEL1_BEATS.length,
  Level2: LEVEL2_BEATS.length,
  Level3: LEVEL3_BEATS.length,
  Level4: LEVEL4_BEATS.length,
  Level5: LEVEL5_BEATS.length,
};

let mounted = false;

export function sceneProgressKey(sceneKey) {
  if (sceneKey === "Level1") return "level1.progress";
  if (sceneKey === "Level2") return "level2.progress";
  if (sceneKey === "Level3") return "level3.progress";
  if (sceneKey === "Level4") return "level4.progress";
  if (sceneKey === "Level5") return "level5.progress";
  return null;
}

export function activeScene() {
  return window.__nanoGPTGame?.scene?.getScenes?.(true)?.[0] || null;
}

export function goScene(from, key, progress) {
  const scene = from || activeScene();
  if (!scene) return;
  const store = sceneProgressKey(key);
  if (store) {
    if (progress) scene.registry.set(store, progress);
    else scene.registry.remove(store);
  }
  unlockAudio(scene);
  scene.scene.start(key);
}

export function mountCatalog() {
  const overlay = document.getElementById("catalog-overlay");
  const close = document.getElementById("catalog-close");
  const sheet = document.getElementById("chapter-sheet");
  const sheetClose = document.getElementById("chapter-sheet-close");
  const guideBtn = document.getElementById("guide-toggle");
  if (!overlay || mounted) {
    renderCatalog();
    return;
  }
  mounted = true;
  renderCatalog();
  document.getElementById("catalog-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCatalog();
  });
  document.getElementById("back-toggle")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    goBack();
  });
  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeCatalog();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeCatalog();
  });
  guideBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeCatalog();
    openGuide();
  });
  sheetClose?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeChapterSheet();
    openCatalog();
  });
  sheet?.addEventListener("click", (event) => {
    if (event.target === sheet) {
      closeChapterSheet();
      openCatalog();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (sheet && !sheet.hidden) {
      event.stopPropagation();
      closeChapterSheet();
      openCatalog();
      return;
    }
    if (overlay && !overlay.hidden) {
      event.stopPropagation();
      closeCatalog();
    }
  });
  window.addEventListener("nanogpt-lang", () => renderCatalog());
  // Phaser listens for mousedown/touchstart on window and will hit the
  // canvas button under a sheet. Stop the event after the sheet handles it.
  const swallowGamePointer = (event) => {
    if (!overlayBlocksInput()) return;
    if (event.target?.closest?.("canvas")) return;
    event.stopPropagation();
  };
  document.addEventListener("mousedown", swallowGamePointer);
  document.addEventListener("touchstart", swallowGamePointer, { passive: true });

  window.__nanoGPTCatalog = () => chapterList();
  window.__nanoGPTPickChapter = (id) => pickChapter(id);
  window.__nanoGPTBack = () => goBack();
  window.__nanoGPTHome = () => {
    const scene = activeScene();
    if (!scene) return;
    if (scene.sys.settings.key === "Title") {
      openCatalog();
      return;
    }
    scene.scene.start("Title");
  };
  window.__nanoGPTState = () => {
    const scene = activeScene();
    return {
      scene: scene?.sys?.settings?.key || null,
      beat: Number.isFinite(scene?.beat) ? scene.beat : null,
      phase: Number.isFinite(scene?.phase) ? scene.phase : null,
      lang: document.documentElement.lang,
    };
  };
}

export function renderCatalog() {
  const title = document.getElementById("catalog-title");
  const lead = document.getElementById("catalog-lead");
  const close = document.getElementById("catalog-close");
  const guideBtn = document.getElementById("guide-toggle");
  const list = document.getElementById("catalog-list");
  const sheetClose = document.getElementById("chapter-sheet-close");
  if (title) title.textContent = t("catalog");
  if (lead) lead.textContent = t("catalogLead");
  if (close) close.textContent = t("close");
  if (guideBtn) guideBtn.textContent = t("guideAgain");
  if (sheetClose) sheetClose.textContent = t("sheetClose");
  if (!list) return;
  list.innerHTML = "";
  chapterList().forEach((chapter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `catalog-row${chapter.playable ? "" : " is-later"}`;
    button.dataset.chapter = chapter.id;
    const name = document.createElement("strong");
    name.textContent = chapter.titleLabel;
    const blurb = document.createElement("span");
    blurb.textContent = chapter.blurbLabel;
    const tag = document.createElement("em");
    tag.textContent = chapter.playable ? t("playable") : t("later");
    button.append(name, blurb, tag);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pickChapter(chapter.id);
    });
    list.appendChild(button);
  });
  const sheet = document.getElementById("chapter-sheet");
  if (sheet && !sheet.hidden) {
    const id = sheet.dataset.chapter;
    const chapter = chapterList().find((item) => item.id === id);
    if (chapter) fillSheet(chapter);
  }
}

export function toggleCatalog() {
  const overlay = document.getElementById("catalog-overlay");
  if (!overlay) return;
  if (overlay.hidden) openCatalog();
  else closeCatalog();
}

export function openCatalog() {
  const overlay = document.getElementById("catalog-overlay");
  if (!overlay) return;
  closeChapterSheet();
  renderCatalog();
  overlay.hidden = false;
}

export function closeCatalog() {
  const overlay = document.getElementById("catalog-overlay");
  if (!overlay) return;
  overlay.hidden = true;
}

export function closeChapterSheet() {
  const sheet = document.getElementById("chapter-sheet");
  if (!sheet) return;
  sheet.hidden = true;
  delete sheet.dataset.chapter;
}

function fillSheet(chapter) {
  const title = document.getElementById("chapter-sheet-title");
  const body = document.getElementById("chapter-sheet-body");
  const close = document.getElementById("chapter-sheet-close");
  if (title) title.textContent = chapter.titleLabel;
  if (body) body.textContent = chapter.sheetLabel;
  if (close) close.textContent = t("sheetClose");
}

export function openChapterSheet(chapter) {
  const sheet = document.getElementById("chapter-sheet");
  if (!sheet || !chapter) return;
  closeCatalog();
  sheet.dataset.chapter = chapter.id;
  fillSheet(chapter);
  sheet.hidden = false;
  const scene = activeScene();
  if (scene) {
    const line = chapter.sheetLabel;
    narrateLine(scene, line, "beat");
  }
}

export function pickChapter(id) {
  const chapter = chapterList().find((item) => item.id === id);
  const scene = activeScene();
  if (!chapter || !scene) return;
  if (!chapter.playable) {
    if (scene.sys.settings.key !== "Title") {
      scene.registry.set("pendingSheet", chapter.id);
      closeCatalog();
      scene.scene.start("Title");
      return;
    }
    openChapterSheet(chapter);
    return;
  }
  closeCatalog();
  closeChapterSheet();
  goScene(scene, chapter.scene, null);
}

export function goBack() {
  const scene = activeScene();
  if (!scene) return;
  closeCatalog();
  closeChapterSheet();
  if (typeof scene.retreat === "function") {
    scene.retreat();
    return;
  }
  if (scene.sys.settings.key !== "Title") scene.scene.start("Title");
}

export function retreatToPreviousChapter(scene) {
  const key = scene.sys.settings.key;
  if (key === "Level2") {
    goScene(scene, "Level1", { beat: BEAT_COUNTS.Level1 - 1, phase: PHASE_COUNT - 1 });
    return;
  }
  if (key === "Level3") {
    goScene(scene, "Level2", { beat: BEAT_COUNTS.Level2 - 1, phase: PHASE_COUNT - 1 });
    return;
  }
  if (key === "Level4") {
    goScene(scene, "Level3", { beat: BEAT_COUNTS.Level3 - 1, phase: PHASE_COUNT - 1 });
    return;
  }
  if (key === "Level5") {
    goScene(scene, "Level4", { beat: BEAT_COUNTS.Level4 - 1, phase: PHASE_COUNT - 1 });
    return;
  }
  if (key === "End") {
    goScene(scene, "Level5", { beat: BEAT_COUNTS.Level5 - 1, phase: PHASE_COUNT - 1 });
    return;
  }
  scene.scene.start("Title");
}

export function consumePendingSheet(scene) {
  const id = scene.registry.get("pendingSheet");
  if (!id) return false;
  scene.registry.remove("pendingSheet");
  const chapter = chapterList().find((item) => item.id === id);
  if (chapter && !chapter.playable) openChapterSheet(chapter);
  return true;
}

export function overlayBlocksInput() {
  return ["guide-overlay", "catalog-overlay", "chapter-sheet", "notes-overlay", "lesson-book-overlay", "pseudo-overlay"].some(
    (id) => {
      const el = document.getElementById(id);
      return el && !el.hidden;
    },
  );
}
