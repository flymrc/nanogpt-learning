import { isWidePcTutor } from "../tutor/bus.js";
import { CAPTION_CLEAR, MIN_CHIP_H, MIN_CHIP_W, MIN_ID_FONT, STICKER_SHADOW_X, STICKER_SHADOW_Y } from "./layout.js";

const PAD = 2;
const PIECE_KINDS = new Set(["tile", "chip", "placeholder", "card"]);
const LABEL_KINDS = new Set(["caption", "label"]);

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
  const width = obj?.getData?.("width");
  const height = obj?.getData?.("height");
  if (width > 2 && height > 2) {
    const matrix = obj.getWorldTransformMatrix?.();
    const cx = matrix?.tx ?? obj.x;
    const cy = matrix?.ty ?? obj.y;
    const shadow = obj.getData("shadow") === true;
    return {
      name,
      x: origin.x + cx - width / 2,
      y: origin.y + cy - height / 2,
      w: width + (shadow ? STICKER_SHADOW_X : 0),
      h: height + (shadow ? STICKER_SHADOW_Y : 0),
    };
  }
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

  const locals = collectLocalHits(scene, origin, cta, shell);
  for (const hit of locals) overlaps.push(hit);
  if (!phone) {
    const tutorHits = collectTutorTextHits(scene, origin);
    for (const hit of tutorHits) overlaps.push(hit);
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
    locals,
    overflows,
    orphans,
    live2dOn: Boolean(live2dOn),
    overlayOk,
    hudParent,
    layout: document.documentElement.dataset.layout,
  };
}

function pieceBox(obj, origin) {
  const kind = obj.getData?.("kind");
  if (!kind) return null;
  if (obj.type === "Text") {
    const b = obj.getBounds?.();
    if (!b || b.width < 2 || b.height < 2) return null;
    return { kind, x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height, rawW: b.width, rawH: b.height };
  }
  const width = obj.getData("width");
  const height = obj.getData("height");
  if (!(width > 1) || !(height > 1)) return null;
  const matrix = obj.getWorldTransformMatrix?.();
  const cx = matrix?.tx ?? obj.x;
  const cy = matrix?.ty ?? obj.y;
  const sx = Math.abs(obj.scaleX || 1);
  const sy = Math.abs(obj.scaleY || 1);
  const w = width * sx;
  const h = height * sy;
  const shadow = obj.getData("shadow") !== false && PIECE_KINDS.has(kind);
  return {
    kind,
    x: origin.x + cx - w / 2,
    y: origin.y + cy - h / 2,
    w: w + (shadow ? STICKER_SHADOW_X * sx : 0),
    h: h + (shadow ? STICKER_SHADOW_Y * sy : 0),
    rawW: width,
    rawH: height,
    idFont: obj.getData("idFont") || 0,
    textOk: obj.getData("textOk") !== false,
  };
}

function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function separated(a, b, clear) {
  const need = clear - 0.75;
  return (
    a.x >= b.x + b.w + need ||
    b.x >= a.x + a.w + need ||
    a.y >= b.y + b.h + need ||
    b.y >= a.y + a.h + need
  );
}

function collectKinded(scene, origin) {
  const found = [];
  const walk = (obj) => {
    if (!obj || obj.active === false) return;
    const box = pieceBox(obj, origin);
    if (box) found.push(box);
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  return found;
}

/**
 * Local sticker collisions. Big-band checks miss tiles sitting on a caption,
 * ellipsis placeholders stacked on the first chip, and chips squeezed under
 * a readable size. Graphics drop-shadows are part of the tile box because
 * Phaser getBounds() ignores Graphics.
 */
function collectLocalHits(scene, origin, cta, shell) {
  const boxes = collectKinded(scene, origin);
  const pieces = boxes.filter((box) => PIECE_KINDS.has(box.kind));
  const labels = boxes.filter((box) => LABEL_KINDS.has(box.kind));
  const hits = [];
  for (const piece of pieces) {
    for (const label of labels) {
      if (!separated(piece, label, CAPTION_CLEAR)) hits.push([piece.kind, label.kind]);
    }
  }
  for (let i = 0; i < pieces.length; i += 1) {
    for (let j = i + 1; j < pieces.length; j += 1) {
      if (boxesOverlap(pieces[i], pieces[j])) hits.push([pieces[i].kind, pieces[j].kind]);
    }
  }
  const chips = pieces.filter((box) => box.kind === "chip");
  for (const chip of chips) {
    if (chip.rawW < MIN_CHIP_W - 0.5 || chip.rawH < MIN_CHIP_H - 0.5 || chip.idFont < MIN_ID_FONT) {
      hits.push(["chip-size", `${Math.round(chip.rawW)}x${Math.round(chip.rawH)}@${chip.idFont}`]);
    }
    if (!chip.textOk) hits.push(["chip-text", "number"]);
  }
  if (cta) {
    for (const piece of pieces) {
      if (!separated(piece, cta, CAPTION_CLEAR)) hits.push([piece.kind, "cta"]);
    }
  }
  if (shell) {
    for (const piece of pieces) {
      if (piece.x < shell.left - 6 || piece.x + piece.w > shell.right + 6) {
        hits.push([piece.kind, "overflow"]);
      }
    }
  }
  const placeholders = pieces.filter((box) => box.kind === "placeholder");
  if (placeholders.length && chips.length) {
    const first = chips.reduce((best, chip) => (chip.y < best.y - 1 || (Math.abs(chip.y - best.y) <= 1 && chip.x < best.x) ? chip : best));
    for (const placeholder of placeholders) {
      if (boxesOverlap(placeholder, first)) hits.push(["placeholder", "first-chip"]);
    }
  }
  return hits;
}

function strictHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** PC: lesson text must not intersect the fitted Live2D canvas. */
function collectTutorTextHits(scene, origin) {
  const canvas = document.getElementById("tutor-canvas");
  if (!canvas || canvas.dataset.fitted !== "1") return [["live2d", "not-fitted"]];
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return [["live2d", "not-fitted"]];
  const tutor = { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  const hits = [];
  const walk = (obj) => {
    if (!obj || obj.active === false) return;
    if (obj.type === "Text" && obj.visible !== false && obj.alpha > 0.05) {
      const b = obj.getBounds?.();
      if (b && b.width > 1 && b.height > 1) {
        const box = { x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height };
        if (strictHit(box, tutor)) hits.push(["phaser-text", "live2d", String(obj.text || "").slice(0, 24)]);
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  const stage = document.getElementById("pc-stage");
  stage?.querySelectorAll("button, a, p, h1, h2, h3, li, label").forEach((el) => {
    if (el.closest("#tutor-dock, [hidden]")) return;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;
    const text = String(el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const box = { x: r.x, y: r.y, w: r.width, h: r.height };
    if (strictHit(box, tutor)) hits.push(["dom-text", "live2d", text.slice(0, 24)]);
  });
  return hits;
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
