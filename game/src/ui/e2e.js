import { isWidePcTutor } from "../tutor/bus.js";
import { CAPTION_CLEAR, MIN_CHIP_H, MIN_CHIP_W, MIN_ID_FONT, STICKER_SHADOW_X, STICKER_SHADOW_Y } from "./layout.js";
import { glueRegExp, gluedRunSplits, orphanLines } from "./theme.js";

const PAD = 2;
const PIECE_KINDS = new Set(["tile", "chip", "placeholder", "card", "hub-card"]);
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

  const phone = !isWidePcTutor();
  const tutorState = document.documentElement.dataset.tutor || "";
  const tutorConcealed = !phone && tutorState === "hidden";
  if (!phone && !tutorConcealed) {
    const tutorHits = collectTutorTextHits(scene, origin);
    for (const hit of tutorHits) overlaps.push(hit);
  }
  if (!phone) {
    const titleHits = collectTitleHudHits(scene, origin);
    for (const hit of titleHits) overlaps.push(hit);
  }
  const patternHits = collectPatternRowHits(scene, origin);
  for (const hit of patternHits) overlaps.push(hit);
  const artHits = collectArtHits(scene, origin);
  for (const hit of artHits) overlaps.push(hit);
  const readHits = collectReadabilityHits(scene, origin);
  for (const hit of readHits) overlaps.push(hit);
  for (const hit of collectCopyHits(scene)) overlaps.push(hit);
  for (const hit of collectCaptionHits(scene, origin)) overlaps.push(hit);
  for (const hit of collectRagTextHits(scene, origin)) overlaps.push(hit);
  for (const hit of collectRagStageHits(scene, origin)) overlaps.push(hit);
  for (const hit of collectTopBarHits()) overlaps.push(hit);
  if (scene.sys?.settings?.key === "Home") {
    for (const hit of collectHomeCopyHits(scene, origin)) overlaps.push(hit);
  }

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
  // main, before the Live2D height fit: reserve stayed 334px.
  const lessonFloor = Math.min(1160, window.innerWidth - 334);
  const lessonFull = Math.min(1160, window.innerWidth);
  const lessonWidth = shellRect?.width || 0;
  const lessonWidthOk = phone || lessonWidth + 2 >= lessonFloor;
  const reserveRaw = getComputedStyle(document.documentElement).getPropertyValue("--tutor-reserve").trim();
  const reserve = reserveRaw ? Number.parseFloat(reserveRaw) : null;
  const lessonFullOk = Math.abs(lessonWidth - lessonFull) <= 4 && (reserve == null || reserve <= 0.5);
  const leftGap = shellRect ? shellRect.left : 0;
  const rightGap = shellRect ? window.innerWidth - shellRect.right : 0;
  const lessonCentered = Math.abs(leftGap - rightGap) <= 2;
  const layoutBg = getComputedStyle(document.getElementById("app-layout") || document.body).backgroundImage || "";
  const skyBackdrop = /linear-gradient/i.test(layoutBg) && /246,\s*239,\s*228/.test(layoutBg) && /234,\s*214,\s*196/.test(layoutBg);
  const dockBox = dockRect && dockRect.width > 1 && dockRect.height > 1 && dockStyle?.display !== "none";
  const panelGone = !live2dOn && !dockBox;
  const gapClear = (() => {
    if (!shellRect) return false;
    const ys = [0.22, 0.5, 0.78].map((t) => Math.round(window.innerHeight * t));
    const xs = [];
    if (leftGap > 6) xs.push(leftGap / 2);
    if (rightGap > 6) xs.push(window.innerWidth - rightGap / 2);
    for (const x of xs) {
      for (const y of ys) {
        const el = document.elementFromPoint(Math.round(x), y);
        if (!el || el.closest("#tutor-dock, #tutor-stage, #tutor-canvas, #pc-stage, #game-shell")) return false;
      }
    }
    return true;
  })();
  const shownOverlayOk =
    live2dOn &&
    dockTransparent &&
    dockStyle.position === "fixed" &&
    dockStyle.pointerEvents === "none" &&
    chromeZ > dockZ &&
    dock.offsetWidth > 120 &&
    dock.offsetWidth < window.innerWidth * 0.5 &&
    dockRect &&
    Math.abs(dockRect.right - window.innerWidth) < 3 &&
    lessonFillsStage &&
    !stage?.contains(dock);
  const hiddenOverlayOk =
    tutorConcealed &&
    panelGone &&
    lessonFullOk &&
    lessonCentered &&
    skyBackdrop &&
    gapClear &&
    lessonFillsStage &&
    !stage?.contains(dock);
  const overlayOk = phone || (tutorConcealed ? hiddenOverlayOk : shownOverlayOk);
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
      lessonWidthOk &&
      (phone ? !live2dOn : tutorConcealed ? !live2dOn : live2dOn),
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
    lessonWidth,
    lessonFloor,
    lessonFull,
    lessonWidthOk,
    lessonFullOk,
    tutorConcealed,
    leftGap,
    rightGap,
    lessonCentered,
    skyBackdrop,
    gapClear,
    stage: window.__nanoGPTStage || null,
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
  if (isWidePcTutor()) {
    for (const tile of pieces) {
      if (tile.kind !== "tile") continue;
      if (tile.rawW < 28 - 0.5 || tile.rawH < 28 - 0.5) {
        hits.push(["tile-size", `${Math.round(tile.rawW)}x${Math.round(tile.rawH)}`]);
      }
    }
  }
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

/** Banner sentence vs page counter, and phase-card copy must stay inside the card. */
function collectReadabilityHits(scene, origin) {
  let card = null;
  const texts = [];
  const hubCards = new Map();
  const hubTexts = [];
  let step = null;
  const banners = [];
  const walk = (obj) => {
    if (!obj || obj.active === false || obj.visible === false) return;
    const kind = obj.getData?.("kind");
    if (kind === "phase-card") card = pieceBox(obj, origin);
    if (kind === "hub-card") {
      const box = pieceBox(obj, origin);
      if (box) hubCards.set(obj.getData("cardId") || `hub-${hubCards.size}`, box);
    }
    if ((kind === "phase-card-text" || kind === "phase-card-title") && obj.alpha > 0.2) {
      const b = obj.getBounds?.();
      if (b && b.width > 1 && b.height > 1) {
        texts.push({ x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height });
      }
    }
    if (kind === "hub-card-text" && obj.alpha > 0.2) {
      const b = obj.getBounds?.();
      if (b && b.width > 1 && b.height > 1) {
        hubTexts.push({
          id: obj.getData("cardId"),
          x: origin.x + b.x,
          y: origin.y + b.y,
          w: b.width,
          h: b.height,
        });
      }
    }
    if ((kind === "banner-step" || kind === "banner-kicker" || kind === "banner-purpose" || kind === "banner-more") && obj.alpha > 0.2) {
      const b = obj.getBounds?.();
      if (b && b.width > 1 && b.height > 1) {
        const box = { kind, x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height };
        if (kind === "banner-step") step = box;
        else banners.push(box);
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  const hits = [];
  if (card) {
    const right = card.x + (card.rawW || card.w);
    const bottom = card.y + (card.rawH || card.h);
    for (const text of texts) {
      if (text.x < card.x - 2 || text.y < card.y - 2 || text.x + text.w > right + 2 || text.y + text.h > bottom + 2) {
        hits.push(["card-text", "outside"]);
      }
    }
  }
  if (step) {
    for (const banner of banners) {
      if (boxesOverlap(banner, step)) hits.push([banner.kind, "counter"]);
    }
  }
  for (const text of hubTexts) {
    const home = hubCards.get(text.id);
    if (!home) {
      hits.push(["hub-card-text", "orphan"]);
      continue;
    }
    const right = home.x + (home.rawW || home.w);
    const bottom = home.y + (home.rawH || home.h);
    if (text.x < home.x - 1 || text.y < home.y - 1 || text.x + text.w > right + 1 || text.y + text.h > bottom + 1) {
      hits.push(["hub-card-text", "outside"]);
    }
  }
  for (const [id, home] of hubCards) {
    const count = hubTexts.filter((text) => text.id === id).length;
    if (count < 2) hits.push(["hub-card", "empty"]);
    void home;
  }
  return hits;
}

function strictHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** PC: lesson text must not intersect the fitted Live2D canvas. */
function collectTutorTextHits(scene, origin) {
  if (document.documentElement.dataset.tutor === "hidden") return [];
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
    if (obj.getData?.("kind") === "hub-card") {
      const box = pieceBox(obj, origin);
      if (box && strictHit(box, tutor)) hits.push(["hub-card", "live2d", String(obj.getData("cardId") || "")]);
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

/** Chapter title must stay fully on the canvas and clear of every HUD button. */
function collectTitleHudHits(scene, origin) {
  let title = null;
  const walk = (obj) => {
    if (!obj || obj.active === false) return;
    if (obj.getData?.("kind") === "chapter-title" || obj.name === "chapter-title") title = obj;
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  if (!title || title.visible === false) return [];
  const b = title.getBounds?.();
  if (!b || b.width < 2 || b.height < 2) return [["chapter-title", "missing"]];
  const box = { x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height };
  const hits = [];
  const canvas = scene.game?.canvas?.getBoundingClientRect?.();
  if (canvas && (box.x < canvas.left - 1 || box.x + box.w > canvas.right + 1 || box.y < canvas.top - 1 || box.y + box.h > canvas.bottom + 1)) {
    hits.push(["chapter-title", "clipped"]);
  }
  const chrome = document.getElementById("pc-chrome");
  if (!chrome || chrome.hidden) return hits;
  for (const btn of chrome.querySelectorAll("button")) {
    const r = btn.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (strictHit(box, { x: r.x, y: r.y, w: r.width, h: r.height })) {
      hits.push(["chapter-title", btn.id || "hud"]);
    }
  }
  return hits;
}

/** A pattern row is one sequence. Wrapping it into two rows breaks ●▲■●▲■●＿. */
function collectPatternRowHits(scene, origin) {
  const groups = new Map();
  const walk = (obj) => {
    if (!obj || obj.active === false) return;
    const row = obj.getData?.("patternRow");
    if (row != null) {
      const box = pieceBox(obj, origin);
      if (box) {
        const list = groups.get(row) || [];
        list.push(box);
        groups.set(row, list);
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  const hits = [];
  for (const [row, list] of groups) {
    if (list.length < 2) continue;
    const centers = list.map((box) => box.y + box.h / 2);
    const spread = Math.max(...centers) - Math.min(...centers);
    if (spread > 8) hits.push(["pattern-row", String(row)]);
  }
  return hits;
}

/**
 * Every lesson page must paint its skeleton visual inside the viewport.
 * A missing chart (height bail-out) is the same failure as an overlap.
 */
function collectArtHits(scene, origin) {
  const expect = scene.frame?.artExpect;
  if (!expect) return [];
  if (!expect.parts?.length) return [["art-missing", expect.visual || "page", "unmapped"]];
  const found = new Map();
  const walk = (obj) => {
    if (!obj || obj.active === false || obj.visible === false || obj.alpha === 0) return;
    const part = obj.getData?.("artPart");
    if (part) {
      const box = pieceBox(obj, origin);
      if (box && box.w > 1 && box.h > 1) {
        const list = found.get(part) || [];
        list.push(box);
        found.set(part, list);
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const inside = (box) => box.x >= -2 && box.y >= -2 && box.x + box.w <= viewW + 2 && box.y + box.h <= viewH + 2;
  const hits = [];
  for (const spec of expect.parts) {
    const pool = spec.any
      ? spec.any.flatMap((name) => found.get(name) || [])
      : (found.get(spec.part) || []);
    const label = spec.any ? spec.any.join("|") : spec.part;
    if (pool.length < (spec.min || 1)) {
      hits.push(["art-missing", expect.visual, label, String(pool.length)]);
      continue;
    }
    for (const box of pool) {
      if (!(box.rawW > 1) || !(box.rawH > 1)) hits.push(["art-size", expect.visual, label]);
      if (!inside(box)) hits.push(["art-offscreen", expect.visual, label]);
    }
  }
  return hits;
}

function primaryFamily(fontFamily) {
  const raw = String(fontFamily || "").trim();
  const quoted = raw.match(/^["']([^"']+)["']/);
  if (quoted) return quoted[1];
  return raw.split(",")[0].replace(/["']/g, "").trim();
}

function parseUnicodeRanges(rangeText) {
  const spans = [];
  for (const part of String(rangeText || "").split(",")) {
    const match = part.trim().match(/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/i);
    if (!match) continue;
    const start = Number.parseInt(match[1], 16);
    const end = match[2] ? Number.parseInt(match[2], 16) : start;
    if (Number.isFinite(start) && Number.isFinite(end)) spans.push([start, end]);
  }
  return spans;
}

function familyGlyphs(family, text) {
  const faces = [...document.fonts].filter((face) => {
    const name = String(face.family || "").replace(/^["']|["']$/g, "");
    return name === family && face.status === "loaded";
  });
  const chars = [...String(text || "")].filter((ch) => ch.trim());
  if (!faces.length) return { ok: false, missing: [...new Set(chars)], reason: "unloaded" };
  const spans = faces.flatMap((face) => parseUnicodeRanges(face.unicodeRange));
  const universal = spans.some(([start, end]) => start <= 0 && end >= 0x10ffff);
  if (!spans.length || universal) return { ok: false, missing: [], reason: universal ? "unbounded" : "no-range" };
  const missing = [];
  for (const ch of chars) {
    const cp = ch.codePointAt(0);
    if (!spans.some(([start, end]) => cp >= start && cp <= end)) missing.push(ch);
  }
  return { ok: missing.length === 0, missing: [...new Set(missing)], reason: "" };
}

function elementClipped(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
}

function captionVisualLines(line) {
  if (!line) return [];
  const rows = new Map();
  const push = (text, top) => {
    const clean = String(text || "").replace(/\s+/g, "");
    if (!clean) return;
    const key = Math.round(top);
    rows.set(key, `${rows.get(key) || ""}${clean}`);
  };
  if (line.querySelector(".voice-word")) {
    for (const word of line.querySelectorAll(".voice-word")) {
      const rect = word.getBoundingClientRect();
      if (rect.width < 1) continue;
      push(word.textContent, rect.top);
    }
  } else {
    const text = line.firstChild;
    if (text && text.nodeType === Node.TEXT_NODE) {
      let offset = 0;
      const raw = text.textContent || "";
      while (offset < raw.length) {
        const range = document.createRange();
        range.setStart(text, offset);
        range.setEnd(text, offset + 1);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0) push(raw[offset], rect.top);
        offset += 1;
      }
    }
  }
  return [...rows.values()];
}

const COPY_ROOTS = [
  "mobile-chrome",
  "pc-chrome",
  "voice-note",
  "notes-overlay",
  "pseudo-overlay",
  "lesson-book-overlay",
  "guide-overlay",
  "catalog-overlay",
  "chapter-sheet",
];

const spanCache = new Map();

function spansFor(family) {
  if (spanCache.has(family) && document.fonts.size === spanCache.get(family).fontCount) {
    return spanCache.get(family).spans;
  }
  const spans = [];
  let fontCount = 0;
  for (const face of document.fonts) {
    fontCount += 1;
    const name = String(face.family || "").replace(/^["']|["']$/g, "");
    if (name !== family) continue;
    for (const span of parseUnicodeRanges(face.unicodeRange)) {
      if (span[0] <= 0 && span[1] >= 0x10ffff) continue;
      spans.push(span);
    }
  }
  const merged = [];
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [start, end] of spans) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  if (merged.length) spanCache.set(family, { spans: merged, fontCount });
  return merged;
}

function familyHas(family, cp) {
  const spans = spansFor(family);
  let lo = 0;
  let hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = spans[mid];
    if (cp < start) hi = mid - 1;
    else if (cp > end) lo = mid + 1;
    else return true;
  }
  return false;
}

function parseStack(fontFamily) {
  const parts = [];
  let current = "";
  let quoted = false;
  for (const ch of String(fontFamily || "")) {
    if (ch === '"' || ch === "'") {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter((name) => name && name !== "sans-serif" && name !== "serif" && name !== "monospace");
}

function isHan(cp) {
  return (cp >= 0x3400 && cp <= 0x9fff) || (cp >= 0xf900 && cp <= 0xfaff);
}

function isKana(cp) {
  return (cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0x31f0 && cp <= 0x31ff);
}

function glyphProblems(fontFamily, text, lang, role) {
  const stack = parseStack(fontFamily);
  const primary = stack[0] || "";
  const hits = [];
  const body = String(text || "");
  const script = [...body].some((ch) => {
    const cp = ch.codePointAt(0);
    return isHan(cp) || isKana(cp);
  });
  if (lang === "ja" && script && primary !== "Noto Sans JP") hits.push(["font-family", role, primary || "missing"]);
  const seen = new Set();
  for (const ch of body) {
    if (!ch.trim()) continue;
    const cp = ch.codePointAt(0);
    if (seen.has(cp)) continue;
    seen.add(cp);
    const owner = stack.find((family) => familyHas(family, cp)) || "";
    if (!owner) {
      hits.push(["font-fallback", role, primary || "missing", ch]);
      continue;
    }
    if (lang === "ja" && (isHan(cp) || isKana(cp))) {
      if (familyHas("Noto Sans JP", cp) && owner !== "Noto Sans JP") hits.push(["font-fallback", role, owner, ch]);
      else if (!familyHas("Noto Sans JP", cp) && owner === "ZCOOL QingKe HuangYou") hits.push(["font-fallback", role, owner, ch]);
    }
    if (lang === "zh" && isHan(cp)) {
      if (owner !== "Noto Sans SC" && owner !== "ZCOOL QingKe HuangYou") hits.push(["font-fallback", role, owner, ch]);
      if (primary === "ZCOOL QingKe HuangYou" && !familyHas("ZCOOL QingKe HuangYou", cp)) {
        hits.push(["font-fallback", role, owner, ch]);
      }
    }
  }
  return hits;
}

function rootVisible(el) {
  if (!el || el.hidden) return false;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function ownText(el) {
  let text = "";
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent || "";
  }
  return text.replace(/\s+/g, " ").trim();
}

function collectCopyHits(scene) {
  const lang = String(document.documentElement.lang || "").toLowerCase().startsWith("ja") ? "ja" : "zh";
  const hits = [];
  const walk = (obj) => {
    if (!obj || obj.active === false || obj.visible === false) return;
    if (obj.type === "Text" && obj.alpha > 0.05) {
      const body = String(obj.text || "").trim();
      if (body) {
        const role = obj.getData?.("hubRole") || obj.getData?.("kind") || obj.name || "text";
        hits.push(...glyphProblems(obj.style?.fontFamily, body, lang, role));
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);

  for (const id of COPY_ROOTS) {
    const root = document.getElementById(id);
    if (!rootVisible(root)) continue;
    const nodes = [root, ...root.querySelectorAll("button, h1, h2, h3, p, li, span, strong, em, pre, a, label")];
    for (const el of nodes) {
      if (el.closest("svg")) continue;
      if (!rootVisible(el)) continue;
      const body = ownText(el);
      if (!body) continue;
      const role = el.id || el.className || id;
      hits.push(...glyphProblems(getComputedStyle(el).fontFamily, body, lang, String(role).slice(0, 40)));
    }
  }
  return hits;
}

function flatCopy(value) {
  return String(value || "").replace(/\s+/g, "");
}

function stageIntersects(a, b) {
  const pad = 1;
  return a.x + pad < b.x + b.w - pad && a.x + a.w - pad > b.x + pad && a.y + pad < b.y + b.h - pad && a.y + a.h - pad > b.y + pad;
}

function stageAncestor(parent, child) {
  let node = child?.parentContainer;
  while (node) {
    if (node === parent) return true;
    node = node.parentContainer;
  }
  return false;
}

function stageScale(matrix, axis) {
  if (!matrix) return 1;
  return axis === "x" ? Math.hypot(matrix.a, matrix.b) || 1 : Math.hypot(matrix.c, matrix.d) || 1;
}

function stageWorldBox(obj, origin) {
  const role = obj.getData?.("stageRole") || "";
  const id = String(obj.getData?.("stageId") || "");
  const hold = String(obj.getData?.("stageHold") || "");
  if (obj.type === "Text") {
    const body = String(obj.text || "").trim();
    if (!body) return null;
    const bounds = obj.getBounds?.();
    if (!bounds || bounds.width < 1 || bounds.height < 1) return null;
    const matrix = obj.getWorldTransformMatrix?.();
    const font = parseFloat(obj.style?.fontSize) || 0;
    return {
      node: obj,
      role: role || "text",
      id,
      hold,
      text: true,
      font: font * stageScale(matrix, "x"),
      sample: body.slice(0, 18),
      x: origin.x + bounds.x,
      y: origin.y + bounds.y,
      w: bounds.width,
      h: bounds.height,
    };
  }
  if (!role) return null;
  const width = obj.getData?.("width");
  const height = obj.getData?.("height");
  if (!(width > 1) || !(height > 1)) return null;
  const matrix = obj.getWorldTransformMatrix?.();
  const cx = matrix?.tx ?? obj.x;
  const cy = matrix?.ty ?? obj.y;
  const sx = stageScale(matrix, "x");
  const sy = stageScale(matrix, "y");
  const hw = (width * sx) / 2;
  const hh = (height * sy) / 2;
  const rot = matrix ? Math.atan2(matrix.b, matrix.a) : 0;
  const c = Math.abs(Math.cos(rot));
  const s = Math.abs(Math.sin(rot));
  const aw = hw * c + hh * s;
  const ah = hw * s + hh * c;
  return {
    node: obj,
    role,
    id,
    hold,
    text: false,
    font: 0,
    sample: role,
    x: origin.x + cx - aw,
    y: origin.y + cy - ah,
    w: aw * 2,
    h: ah * 2,
  };
}

function actorKey(box) {
  return box.hold || box.id || "";
}

function stagePairAllowed(a, b) {
  if (a.role === "prop" || b.role === "prop" || a.role === "actor" || b.role === "actor") return true;
  if (stageAncestor(a.node, b.node) || stageAncestor(b.node, a.node)) return true;
  const parts = new Set(["face", "body", "held"]);
  if (parts.has(a.role) && parts.has(b.role)) {
    const ka = actorKey(a);
    const kb = actorKey(b);
    if (ka && ka === kb) return true;
  }
  return false;
}

function hexOf(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  const rgb = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!rgb) return "";
  const n = (part) => Number(part).toString(16).padStart(2, "0");
  return `#${n(rgb[1])}${n(rgb[2])}${n(rgb[3])}`;
}

function channelLin(part) {
  const c = part / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(fg, bg) {
  const lum = (hex) => {
    const n = hex.replace("#", "");
    const r = channelLin(parseInt(n.slice(0, 2), 16));
    const g = channelLin(parseInt(n.slice(2, 4), 16));
    const b = channelLin(parseInt(n.slice(4, 6), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = lum(fg);
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A Latin word in the source must stay intact on one rendered line. */
function splitEnglishWords(source, rendered) {
  const words = String(source || "").match(/[A-Za-z]{2,}(?:[-'][A-Za-z]+)*/g) || [];
  if (!words.length) return [];
  const lines = String(rendered || "").split("\n");
  const hits = [];
  const seen = new Set();
  for (const word of words) {
    if (seen.has(word)) continue;
    seen.add(word);
    if (lines.some((line) => line.includes(word))) continue;
    if (lines.join("").includes(word)) hits.push(word);
  }
  return hits;
}

/** Times, thousands, ranges, and page marks must stay on one rendered line. */
function splitPageMarks(source, rendered) {
  return gluedRunSplits(source, rendered);
}

function cardHasVisibleContent(node) {
  const bg = hexOf(node.getData?.("stageBg"));
  let ok = false;
  const walk = (obj) => {
    if (!obj || ok || obj.visible === false || obj.alpha < 0.2) return;
    if (obj.type === "Image") {
      const bounds = obj.getBounds?.();
      if (bounds && bounds.width >= 8 && bounds.height >= 8) ok = true;
    }
    if (obj.type === "Text") {
      const body = String(obj.text || "").replace(/\s+/g, "");
      const bounds = obj.getBounds?.();
      if (body && bounds && bounds.width >= 8 && bounds.height >= 8) {
        const fg = hexOf(obj.getData?.("stageFg") || obj.style?.color);
        const faint = fg && contrastRatio(fg, "#ffffff") < 1.2;
        const weak = Boolean(bg && fg && contrastRatio(fg, bg) < 3);
        if (!weak && !(faint && !bg)) ok = true;
      }
    }
    (obj.list || []).forEach(walk);
  };
  (node.list || []).forEach(walk);
  return ok;
}

function unionOf(boxes) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const box of boxes) {
    x0 = Math.min(x0, box.x);
    y0 = Math.min(y0, box.y);
    x1 = Math.max(x1, box.x + box.w);
    y1 = Math.max(y1, box.y + box.h);
  }
  if (!Number.isFinite(x0)) return null;
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/** Faces, labels, signs, and cards inside a RAG picture. Held paper may cover its own body. */
function collectRagStageHits(scene, origin) {
  const key = String(scene.sys?.settings?.key || "");
  window.__nanoGPTStage = { active: false, overlaps: 0, tiny: 0, short: 0, fill: 0, actors: 0, contrast: 0, words: 0, empty: 0, ratio: 1, height: 0 };
  if (!/^(Rag|Embed)[1-5]$/.test(key)) return [];
  const scheme = (scene.frame?.stage?.list || []).find((child) => child.getData?.("artPart") === "scheme");
  if (!scheme) return [];
  const boxes = [];
  const walk = (obj) => {
    if (!obj || obj.active === false || obj.visible === false || obj.alpha < 0.2) return;
    const box = stageWorldBox(obj, origin);
    if (box) boxes.push(box);
    (obj.list || []).forEach(walk);
  };
  walk(scheme);
  const hits = [];
  let overlaps = 0;
  let tiny = 0;
  let contrast = 0;
  let words = 0;
  let empty = 0;
  const phone = !isWidePcTutor();
  const minFont = phone ? 12 : 13;
  for (const box of boxes) {
    if (!box.text) continue;
    if (box.font + 0.25 < minFont) {
      tiny += 1;
      if (hits.length < 8) hits.push(["stage-tiny", box.sample, String(Math.round(box.font * 10) / 10)]);
    }
    const bg = hexOf(box.node.getData?.("stageBg"));
    const fg = hexOf(box.node.getData?.("stageFg") || box.node.style?.color);
    if (bg && fg) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < 4.5) {
        contrast += 1;
        if (hits.length < 8) hits.push(["stage-contrast", box.sample, ratio.toFixed(2)]);
      }
    }
    const source = box.node.getData?.("source") || box.node.text;
    for (const word of splitEnglishWords(source, box.node.text)) {
      words += 1;
      if (hits.length < 8) hits.push(["stage-word", word]);
    }
    for (const mark of splitPageMarks(source, box.node.text)) {
      words += 1;
      if (hits.length < 8) hits.push(["stage-word", mark, String(box.node.text).replace(/\n/g, "↵").slice(0, 96)]);
    }
  }
  for (const box of boxes) {
    if (box.role !== "card" || !box.node) continue;
    if (cardHasVisibleContent(box.node)) continue;
    empty += 1;
    if (hits.length < 8) hits.push(["stage-empty", box.id || box.sample]);
  }
  const oneHand = boxes.find((box) => box.role === "card" && box.id === "one");
  const manyHand = boxes.filter((box) => box.role === "card" && String(box.id || "").startsWith("many-"));
  if (oneHand && manyHand.length) {
    const manyLeft = Math.min(...manyHand.map((box) => box.x));
    if (oneHand.x + oneHand.w > manyLeft - 12) {
      overlaps += 1;
      if (hits.length < 8) hits.push(["stage-hands", "gap"]);
    }
    const labelAbove = (id, group) => {
      const label = boxes.find((box) => box.role === "chip" && box.id === id);
      if (!label) {
        overlaps += 1;
        if (hits.length < 8) hits.push(["stage-hands", id]);
        return;
      }
      const top = Math.min(...group.map((box) => box.y));
      const gLeft = Math.min(...group.map((box) => box.x));
      const gRight = Math.max(...group.map((box) => box.x + box.w));
      if (label.y + label.h > top - 2) {
        overlaps += 1;
        if (hits.length < 8) hits.push(["stage-hands", `${id}-above`]);
      }
      const mid = label.x + label.w / 2;
      if (mid < gLeft - 8 || mid > gRight + 8) {
        overlaps += 1;
        if (hits.length < 8) hits.push(["stage-hands", `${id}-align`]);
      }
    };
    labelAbove("hand-one", [oneHand]);
    labelAbove("hand-many", manyHand);
    const ownerIn = (actorId, group) => {
      const actor = boxes.find((box) => box.role === "actor" && box.id === actorId);
      if (!actor) return;
      const mid = actor.x + actor.w / 2;
      const gLeft = Math.min(...group.map((box) => box.x));
      const gRight = Math.max(...group.map((box) => box.x + box.w));
      if (mid < gLeft - 16 || mid > gRight + 16) {
        overlaps += 1;
        if (hits.length < 8) hits.push(["stage-hands", actorId]);
      }
    };
    ownerIn("blue", [oneHand]);
    ownerIn("gold", manyHand);
  }
  const lifted = boxes.filter((box) => box.node?.getData?.("stageLift"));
  if (lifted.length) {
    const peers = boxes.filter((box) => box.role === "card" && String(box.id || "").startsWith("many-") && !box.node?.getData?.("stageLift"));
    for (const card of lifted) {
      const floor = peers.length ? Math.min(...peers.map((peer) => peer.y)) : card.y + card.h + 12;
      if (card.y + card.h > floor - 8) {
        overlaps += 1;
        if (hits.length < 8) hits.push(["stage-lift", card.id || "picked"]);
      }
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (stagePairAllowed(a, b)) continue;
      if (!stageIntersects(a, b)) continue;
      overlaps += 1;
      if (hits.length < 8) hits.push(["stage-overlap", `${a.role}:${a.id || a.sample}`, `${b.role}:${b.id || b.sample}`]);
    }
  }
  const matrix = scheme.getWorldTransformMatrix?.();
  const height = (scheme.getData?.("height") || 0) * stageScale(matrix, "y");
  const width = (scheme.getData?.("width") || 0) * stageScale(matrix, "x");
  const ratio = height / Math.max(1, window.innerHeight || 1);
  let short = 0;
  if (phone && scene.phase === 2 && ratio < 0.35) {
    short = 1;
    hits.push(["stage-short", ratio.toFixed(3), String(Math.round(height))]);
  }
  if (!phone && (scene.phase === 1 || scene.phase === 2) && ratio + 0.005 < 0.5) {
    short = 1;
    hits.push(["stage-short", ratio.toFixed(3), String(Math.round(height))]);
  }
  let fill = 0;
  let actors = 0;
  if (!phone && width > 8 && height > 8) {
    const union = unionOf(boxes);
    if (union) {
      const area = (union.w * union.h) / (width * height);
      const widthR = union.w / width;
      const heightR = union.h / height;
      if (!(area >= 0.55 || (widthR >= 0.55 && heightR >= 0.55))) {
        fill = 1;
        hits.push(["stage-fill", area.toFixed(2), `${widthR.toFixed(2)}x${heightR.toFixed(2)}`]);
      }
    } else {
      fill = 1;
      hits.push(["stage-fill", "0", "empty"]);
    }
    const cast = boxes.filter((box) => box.role === "actor");
    if (cast.length) {
      const tallest = Math.max(...cast.map((box) => box.h));
      const frac = tallest / height;
      if (frac + 0.005 < 0.32) {
        actors = 1;
        hits.push(["stage-actor", frac.toFixed(3), String(Math.round(tallest))]);
      }
    }
  }
  window.__nanoGPTStage = {
    active: true,
    overlaps,
    tiny,
    short,
    fill,
    actors,
    contrast,
    words,
    empty,
    ratio,
    height: Math.round(height),
  };
  return hits;
}

/** RAG pages wrap. A text object must not end in an ellipsis or spill out of its card. */
function collectRagTextHits(scene, origin) {
  const key = scene.sys?.settings?.key || "";
  if (!/^(Rag|Embed)/.test(String(key))) return [];
  const hits = [];
  const lang = String(document.documentElement.lang || "").toLowerCase().startsWith("ja") ? "ja" : "zh";
  const walk = (obj) => {
    if (!obj || obj.active === false || obj.visible === false || obj.alpha < 0.2) return;
    if (obj.type === "Text") {
      const body = String(obj.text || "");
      const trimmed = body.trim();
      if (/[…⋯]$/.test(trimmed) || trimmed.endsWith("...")) hits.push(["rag-ellipsis", trimmed.slice(-18)]);
      const source = obj.getData?.("source");
      if (source && flatCopy(source) !== flatCopy(body)) hits.push(["rag-clipped", String(source).slice(0, 28)]);
      if (lang === "ja" && String(source || "").includes(" ")) {
        const wrapWidth = Number(obj.getData?.("wrapWidth")) || obj.width;
        const tooWide = (phrase) => phraseWiderThan(obj, phrase, wrapWidth);
        for (const hit of phraseSplitHits(source, body, tooWide)) hits.push(["rag-phrase", hit[0], hit[1] || "", hit[2] || ""]);
      }
      if (source && !insideScheme(obj)) {
        for (const token of gluedRunSplits(source, body)) {
          if (hits.length < 8) hits.push(["rag-glue", token]);
        }
      }
      const parent = obj.parentContainer;
      const hostW = parent?.getData?.("width");
      const hostH = parent?.getData?.("height");
      if (hostW > 8 && hostH > 8 && parent.getWorldTransformMatrix) {
        const matrix = parent.getWorldTransformMatrix();
        const host = {
          x: origin.x + matrix.tx - hostW / 2,
          y: origin.y + matrix.ty - hostH / 2,
          w: hostW,
          h: hostH,
        };
        const bounds = obj.getBounds?.();
        if (bounds && bounds.width > 1 && bounds.height > 1) {
          const box = { x: origin.x + bounds.x, y: origin.y + bounds.y, w: bounds.width, h: bounds.height };
          if (box.x < host.x - 4 || box.y < host.y - 4 || box.x + box.w > host.x + host.w + 4 || box.y + box.h > host.y + host.h + 4) {
            hits.push(["rag-clipped", trimmed.slice(0, 18)]);
          }
        }
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  if (window.__nanoGPTCard?.truncated) hits.push(["rag-ellipsis", "card"]);
  for (const token of domGlueSplits()) {
    if (hits.length < 8) hits.push(["rag-glue", token]);
  }
  return hits;
}

function insideScheme(obj) {
  let node = obj;
  while (node) {
    if (node.getData?.("artPart") === "scheme") return true;
    node = node.parentContainer;
  }
  return false;
}

function domGlueSplits() {
  const roots = ["voice-line", "copy-pop-body", "tutor-book", "pseudo-does", "pseudo-metaphor", "pseudo-myth", "notes-detail"]
    .map((id) => document.getElementById(id))
    .filter((el) => rootVisible(el));
  const hits = [];
  const seen = new Set();
  for (const root of roots) {
    const locator = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const value = node.textContent || "";
      for (let i = 0; i < value.length; i += 1) locator.push({ node, offset: i });
      node = walker.nextNode();
    }
    const full = root.textContent || "";
    if (full.length !== locator.length) continue;
    for (const match of full.matchAll(glueRegExp())) {
      const compact = match[0].replace(/\s+/g, "");
      if (!compact || seen.has(compact) || match[0].length < 1) continue;
      const start = locator[match.index];
      const end = locator[match.index + match[0].length - 1];
      if (!start || !end) continue;
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset + 1);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5);
      if (rects.length < 2) continue;
      const tops = rects.map((rect) => Math.round(rect.top));
      if (Math.max(...tops) - Math.min(...tops) > 4) {
        seen.add(compact);
        hits.push(compact);
      }
    }
  }
  return hits;
}

function collectCaptionHits(scene, origin) {
  window.__nanoGPTReflowCaption?.();
  const hits = [];
  const note = document.getElementById("voice-note");
  const line = document.getElementById("voice-line");
  if (!rootVisible(note)) return hits;
  const style = getComputedStyle(line || note);
  if (style.textOverflow === "ellipsis" || (line && getComputedStyle(line).whiteSpace === "nowrap") || getComputedStyle(note).whiteSpace === "nowrap") {
    hits.push(["caption-ellipsis", "style"]);
  }
  if (elementClipped(note) || elementClipped(line)) hits.push(["caption-ellipsis", "clipped"]);
  const narr = window.__nanoGPTNarration?.();
  const shown = String(line?.textContent || note?.textContent || "").replace(/\s+/g, " ").trim();
  const text = String(narr?.text || "").replace(/\s+/g, " ").trim();
  if (text && !shown.includes(text)) hits.push(["caption-ellipsis", "missing-text"]);
  if (text && shown.includes("…") && !text.includes("…")) hits.push(["caption-ellipsis", "dots"]);
  const box = domBox(note, "caption");
  const cta = scene.frame?.nextBtn ? phaserBox(scene.frame.nextBtn, "cta", origin) : null;
  if (box && cta && intersects(box, cta)) hits.push(["caption", "cta"]);
  const schemeLabel = schemeLabelBox(scene, origin);
  if (box && schemeLabel && intersects(box, schemeLabel)) hits.push(["voice-note", "scheme-label"]);
  return hits;
}

function schemeLabelBox(scene, origin) {
  let found = null;
  const walk = (obj) => {
    if (!obj || found) return;
    if (obj.getData?.("artPart") === "scheme-label" && obj.visible !== false && obj.alpha > 0.2) {
      const bounds = obj.getBounds?.();
      if (bounds && bounds.width > 1 && bounds.height > 1) {
        found = { x: origin.x + bounds.x, y: origin.y + bounds.y, w: bounds.width, h: bounds.height };
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);
  return found;
}

function collectTopBarHits() {
  if (isWidePcTutor()) return [];
  if (document.documentElement.dataset.scene !== "lesson") return [];
  const actions = document.getElementById("mobile-actions");
  if (!rootVisible(actions)) return [];
  const boxes = [...actions.querySelectorAll("button")]
    .filter((btn) => rootVisible(btn))
    .map((btn) => {
      const rect = btn.getBoundingClientRect();
      return { id: btn.id || "button", x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    })
    .filter((box) => box.w > 2 && box.h > 2);
  const hits = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxesOverlap(boxes[i], boxes[j])) hits.push(["topbar-overlap", boxes[i].id, boxes[j].id]);
    }
  }
  const rows = [];
  for (const box of [...boxes].sort((a, b) => a.y - b.y)) {
    const row = rows.find((entry) => Math.abs(entry.y - box.y) < 8);
    if (row) row.items.push(box);
    else rows.push({ y: box.y, items: [box] });
  }
  for (const row of rows) {
    if (row.items.length === 1) hits.push(["topbar-orphan", row.items[0].id]);
  }
  return hits;
}

/** Line breaks must land on half-width spaces unless one phrase is wider than the line. */
function phraseSplitHits(source, wrapped, phraseTooWide) {
  const phrases = String(source || "").split(/\s+/).filter(Boolean);
  if (phrases.length < 2) return [];
  const lines = String(wrapped || "").split("\n").map((line) => line.replace(/\s+/g, ""));
  const flat = phrases.join("");
  if (lines.join("") !== flat) return [["phrase-mismatch", String(wrapped || "").slice(0, 48)]];
  const ends = new Set();
  let acc = 0;
  for (const phrase of phrases) {
    acc += [...phrase].length;
    ends.add(acc);
  }
  const hits = [];
  let pos = 0;
  for (let i = 0; i < lines.length - 1; i += 1) {
    pos += [...lines[i]].length;
    if (ends.has(pos)) continue;
    let start = 0;
    let phrase = "";
    for (const item of phrases) {
      const next = start + [...item].length;
      if (pos > start && pos < next) {
        phrase = item;
        break;
      }
      start = next;
    }
    if (phrase && phraseTooWide(phrase)) continue;
    hits.push(["phrase-break", lines[i], lines[i + 1]]);
  }
  return hits;
}

function phraseWiderThan(obj, phrase, maxWidth) {
  const probe = obj.scene.make.text({
    x: -12000,
    y: -12000,
    text: phrase,
    style: obj.style,
    add: false,
  });
  const width = probe.width;
  probe.destroy();
  return width > maxWidth + 1;
}

/**
 * Home copy: one font per string, no short last line on the title or description,
 * button text inside its pill with padding, caption fully visible,
 * and the mobile chrome does not repeat the page title.
 * Japanese titles and descriptions break on half-width bunsetsu spaces.
 */
function collectHomeCopyHits(scene, origin) {
  const hits = [];
  const lang = String(document.documentElement.lang || "").toLowerCase().startsWith("ja") ? "ja" : "zh";
  const walk = (obj) => {
    if (!obj || obj.active === false || obj.visible === false) return;
    if (obj.type === "Text" && obj.alpha > 0.05) {
      const role = obj.getData?.("hubRole") || obj.name || "text";
      const body = String(obj.text || "");
      const family = primaryFamily(obj.style?.fontFamily);
      const copyRoles = new Set(["title", "sub", "card-title", "card-desc", "card-action"]);
      if (!copyRoles.has(role)) {
        (obj.list || []).forEach(walk);
        return;
      }
      for (const line of orphanLines(body)) hits.push(["orphan-line", role, line]);
      const source = String(obj.getData?.("source") || "");
      if (source.includes(" ") && (role === "title" || role === "sub" || role === "card-title" || role === "card-desc")) {
        const wrapWidth = Number(obj.getData?.("wrapWidth")) || obj.width;
        const tooWide = (phrase) => phraseWiderThan(obj, phrase, wrapWidth);
        for (const hit of phraseSplitHits(source, body, tooWide)) hits.push(hit);
      }
      if (role === "card-action") {
        const pillHit = pillPaddingHit(obj, origin);
        if (pillHit) hits.push(pillHit);
      }
      const covered = familyGlyphs(family, body);
      if (!covered.ok) {
        const sample = covered.missing.slice(0, 8).join("");
        hits.push(["font-fallback", role, family, covered.reason || sample || "missing"]);
      }
      if (lang === "ja" && family !== "Noto Sans JP") {
        hits.push(["font-family", role, family]);
      }
      if (lang === "zh" && (role === "title" || role === "card-title") && family !== "ZCOOL QingKe HuangYou") {
        hits.push(["font-family", role, family]);
      }
      if (lang === "zh" && (role === "sub" || role === "card-desc" || role === "card-action") && family !== "Noto Sans SC") {
        hits.push(["font-family", role, family]);
      }
    }
    (obj.list || []).forEach(walk);
  };
  (scene.children?.list || []).forEach(walk);

  const voice = document.getElementById("voice-line") || document.getElementById("voice-note");
  if (voice) {
    const family = primaryFamily(getComputedStyle(voice).fontFamily);
    const covered = familyGlyphs(family, voice.textContent || "");
    if (!covered.ok) hits.push(["font-fallback", "caption", family, covered.reason || covered.missing.slice(0, 8).join("")]);
    if (lang === "ja" && family !== "Noto Sans JP") hits.push(["font-family", "caption", family]);
    if (lang === "zh" && family !== "Noto Sans SC") hits.push(["font-family", "caption", family]);
    const lines = captionVisualLines(voice);
    if (lines.length > 1) {
      for (const line of lines) {
        if ([...line].length === 1) hits.push(["orphan-line", "caption", line]);
      }
    }
  }
  const note = document.getElementById("voice-note");
  const line = document.getElementById("voice-line");
  if (elementClipped(note) || elementClipped(line)) hits.push(["caption-ellipsis", "voice"]);
  const narr = window.__nanoGPTNarration?.();
  const shown = String(line?.textContent || note?.textContent || "");
  if (narr?.text && !shown.includes(String(narr.text).replace(/\s+/g, " ").trim())) {
    hits.push(["caption-ellipsis", "missing-text"]);
  }

  if (!isWidePcTutor()) {
    const chromeTitle = document.getElementById("mobile-title");
    const style = chromeTitle ? getComputedStyle(chromeTitle) : null;
    const shownTitle =
      chromeTitle &&
      style &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      chromeTitle.getBoundingClientRect().height > 2;
    if (shownTitle) hits.push(["duplicate-title", "mobile-chrome"]);
  }

  const noteBox = domBox(note, "voice");
  if (noteBox) {
    const walkCards = (obj) => {
      if (!obj || obj.active === false) return;
      if (obj.getData?.("kind") === "hub-card") {
        const box = pieceBox(obj, origin);
        if (box && strictHit(noteBox, box)) hits.push(["voice", "hub-card", String(obj.getData("cardId") || "")]);
      }
      if (obj.type === "Text" && (obj.getData?.("hubRole") === "title" || obj.getData?.("hubRole") === "sub")) {
        const b = obj.getBounds?.();
        if (b && b.width > 1) {
          const box = { x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height };
          if (strictHit(noteBox, box)) hits.push(["voice", obj.getData("hubRole")]);
        }
      }
      (obj.list || []).forEach(walkCards);
    };
    (scene.children?.list || []).forEach(walkCards);
  }
  return hits;
}

/** Button label must sit inside its pill with padding on every side. */
function pillPaddingHit(obj, origin) {
  const pill = obj.getData?.("pill");
  const id = obj.getData?.("cardId") || "action";
  if (!pill || !(pill.w > 0) || !(pill.h > 0)) return ["pill-text", id, "missing"];
  const parent = obj.parentContainer;
  const m = parent?.getWorldTransformMatrix?.();
  if (!m) return ["pill-text", id, "missing"];
  const x = m.tx + pill.x * m.a + pill.y * m.c;
  const y = m.ty + pill.x * m.b + pill.y * m.d;
  const scaleX = Math.hypot(m.a, m.b) || 1;
  const scaleY = Math.hypot(m.c, m.d) || 1;
  const box = { x: origin.x + x, y: origin.y + y, w: pill.w * scaleX, h: pill.h * scaleY };
  const b = obj.getBounds?.();
  if (!b || b.width < 2 || b.height < 2) return ["pill-text", id, "missing"];
  const text = { x: origin.x + b.x, y: origin.y + b.y, w: b.width, h: b.height };
  const padX = 4;
  const padY = 2;
  const inside =
    text.x >= box.x + padX - 0.75 &&
    text.y >= box.y + padY - 0.75 &&
    text.x + text.w <= box.x + box.w - padX + 0.75 &&
    text.y + text.h <= box.y + box.h - padY + 0.75;
  if (inside) return null;
  return ["pill-text", id, Math.round(text.x - box.x), Math.round(box.x + box.w - (text.x + text.w)), Math.round(text.y - box.y), Math.round(box.y + box.h - (text.y + text.h))];
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
