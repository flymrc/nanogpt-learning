import { isWidePcTutor } from "../tutor/bus.js";

const PAD = 2;

function intersects(a, b) {
  return a.x + PAD < b.x + b.w - PAD && a.x + a.w - PAD > b.x + PAD && a.y + PAD < b.y + b.h - PAD && a.y + a.h - PAD > b.y + PAD;
}

function domBox(el, name) {
  if (!el || el.hidden || getComputedStyle(el).display === "none") return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { name, x: r.x, y: r.y, w: r.width, h: r.height };
}

function phaserBox(obj, name, origin) {
  const b = obj?.getBounds?.();
  if (!b || b.width < 2 || b.height < 2) return null;
  return { name, x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height };
}

export function installLayoutProbe(scene) {
  window.__nanoGPTAssertLayout = () => assertLessonLayout(scene);
  window.__nanoGPTLessonBoxes = () => collectBoxes(scene);
}

function canvasOrigin(scene) {
  const canvas = scene.game?.canvas;
  const r = canvas?.getBoundingClientRect?.();
  return { x: r?.left || 0, y: r?.top || 0 };
}

function collectBoxes(scene) {
  const boxes = [];
  const mobile = document.getElementById("mobile-chrome");
  const header = domBox(mobile, "header");
  if (header) boxes.push(header);

  const origin = canvasOrigin(scene);
  const frame = scene.frame;
  if (frame?.purpose) {
    const purpose = phaserBox(frame.purpose, "purpose", origin);
    if (purpose) boxes.push(purpose);
  }
  if (frame?.lastTabs) boxes.push({ name: "tabs", ...offsetBand(frame.lastTabs, origin) });
  if (frame?.lastCard) boxes.push({ name: "body", ...offsetBand(frame.lastCard, origin) });
  if (frame?.tapeRows?.length) {
    for (const row of frame.tapeRows) {
      boxes.push({ name: row.name, ...offsetBand(row, origin) });
    }
  } else if (frame?.lastExample) {
    boxes.push({ name: "tape", ...offsetBand(frame.lastExample, origin) });
  }
  if (frame?.nextBtn) {
    const cta = phaserBox(frame.nextBtn, "cta", origin);
    if (cta) boxes.push(cta);
  }

  const book = document.getElementById("lesson-book-overlay");
  if (book && !book.hidden) {
    const card = book.querySelector(".lesson-book-card");
    const box = domBox(card || book, "notes-drawer");
    if (box) boxes.push(box);
  }
  const notes = document.getElementById("notes-overlay");
  if (notes && !notes.hidden) {
    const card = notes.querySelector(".notes-card");
    const box = domBox(card || notes, "glossary");
    if (box) boxes.push(box);
  }
  const pseudo = document.getElementById("pseudo-overlay");
  if (pseudo && !pseudo.hidden) {
    const card = pseudo.querySelector(".pseudo-card");
    const box = domBox(card || pseudo, "pseudo-drawer");
    if (box) boxes.push(box);
  }
  return boxes.filter(Boolean);
}

function offsetBand(band, origin) {
  return {
    x: origin.x + band.left,
    y: origin.y + band.top,
    w: band.w,
    h: band.h,
  };
}

function assertLessonLayout(scene) {
  const boxes = collectBoxes(scene);
  const overlaps = [];
  const closedNames = new Set(["notes-drawer", "glossary", "pseudo-drawer"]);
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (closedNames.has(a.name) || closedNames.has(b.name)) continue;
      if (intersects(a, b)) overlaps.push([a.name, b.name]);
    }
  }

  const origin = canvasOrigin(scene);
  const shell = document.getElementById("game-shell")?.getBoundingClientRect();
  const overflows = [];
  const cta = scene.frame?.nextBtn ? phaserBox(scene.frame.nextBtn, "cta", origin) : null;
  const labels = [];
  for (const child of scene.frame?.stage?.list || []) {
    const box = phaserBox(child, child.name || "stage-child", origin);
    if (!box) continue;
    labels.push(box);
    if (shell && (box.x + box.w > shell.right + 6 || box.x < shell.left - 6)) {
      overflows.push({ name: box.name, right: box.x + box.w, shellRight: shell.right });
    }
    if (cta && intersects(box, cta)) overlaps.push(["label", "cta"]);
  }

  const phone = !isWidePcTutor();
  const dock = document.getElementById("tutor-dock");
  const dockStyle = dock ? getComputedStyle(dock) : null;
  const live2dOn = dock && !dock.hidden && dockStyle.display !== "none";
  const chrome = document.getElementById("pc-chrome");
  const chromeZ = chrome ? Number.parseFloat(getComputedStyle(chrome).zIndex) : 0;
  const dockZ = dockStyle ? Number.parseFloat(dockStyle.zIndex) : 0;
  const dockBg = dockStyle?.backgroundColor || "";
  const dockTransparent = dockBg === "transparent" || dockBg === "rgba(0, 0, 0, 0)";
  const stage = document.getElementById("pc-stage");
  const shellEl = document.getElementById("game-shell");
  const stageRect = stage?.getBoundingClientRect();
  const shellRect = shellEl?.getBoundingClientRect();
  const dockRect = dock?.getBoundingClientRect();
  const lessonFillsStage =
    stageRect &&
    shellRect &&
    Math.abs(shellRect.width - stageRect.width) < 2 &&
    Math.abs(shellRect.left - stageRect.left) < 2;
  const overlayOk =
    phone ||
    (live2dOn &&
      dockTransparent &&
      dockStyle.position === "fixed" &&
      dockStyle.pointerEvents === "none" &&
      chromeZ > dockZ &&
      dock.offsetWidth > 120 &&
      dock.offsetWidth < window.innerWidth * 0.5 &&
      dockRect &&
      Math.abs(dockRect.right - window.innerWidth) < 3 &&
      lessonFillsStage &&
      !stage?.contains(dock));
  const orphans = collectOrphanOverlays(scene);
  const hudParent = document.getElementById("mute-toggle")?.parentElement?.id || null;
  const hudOk = phone ? hudParent === "mobile-actions" : hudParent === "pc-chrome";
  return {
    ok:
      overlaps.length === 0 &&
      overflows.length === 0 &&
      orphans.length === 0 &&
      hudOk &&
      overlayOk &&
      (phone ? !live2dOn : live2dOn),
    mode: phone ? "mobile" : "pc",
    boxes,
    labels: labels.length,
    overlaps,
    overflows,
    orphans,
    live2dOn: Boolean(live2dOn),
    overlayOk,
    hudParent,
    layout: document.documentElement.dataset.layout,
  };
}

function collectOrphanOverlays(scene) {
  if (isWidePcTutor()) return [];
  const hits = [];
  const walk = (obj) => {
    if (!obj || obj.active === false) return;
    if (obj.text === "挪一格" || obj.text === "右移一格") hits.push(obj.text);
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  return hits;
}
