import { playSfx } from "../audio/sound.js";
import { getLang, t } from "../i18n/locale.js";
import { drawSticker, markCaption } from "./components.js";
import { CAPTION_CLEAR, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText } from "./theme.js";

const CAPTION_H = 18;

export function ragArtReserve() {
  return 128 + STICKER_SHADOW_Y + CAPTION_CLEAR + CAPTION_H;
}

export function ragExpectedArt() {
  return {
    visual: "rag",
    parts: [
      { part: "scheme", min: 1 },
      { part: "scheme-label", min: 1 },
    ],
  };
}

function ceilingOf(scene, stage) {
  const footerTop = scene.frame?.shell?.footer?.top ?? stage.bottom;
  return Math.min(stage.bottom - 2, footerTop - 16);
}

function addLabel(scene, card, x, y, text, size, color) {
  const node = scene.add.text(x, y, String(text ?? ""), uiText(size, color ? { color } : {})).setOrigin(0.5);
  let font = size;
  const limit = Math.max(24, (card.getData("width") || 120) - 16);
  while (node.width > limit && font > 10) {
    font -= 1;
    node.setFontSize(font);
  }
  card.add(node);
  return node;
}

function paintRobot(g, x, y, s, hat) {
  g.fillStyle(0xffd7c2, 1);
  g.fillCircle(x, y, s);
  g.fillStyle(0x3b2a2e, 1);
  g.fillCircle(x - s * 0.32, y - s * 0.12, Math.max(1.5, s * 0.12));
  g.fillCircle(x + s * 0.32, y - s * 0.12, Math.max(1.5, s * 0.12));
  g.lineStyle(Math.max(1.5, s * 0.1), 0x3b2a2e, 1);
  g.beginPath();
  g.arc(x, y + s * 0.08, s * 0.34, 0.2, Math.PI - 0.2, false);
  g.strokePath();
  if (hat === "blue" || hat === "gold") {
    g.fillStyle(hat === "blue" ? C.blue : C.gold, 1);
    g.fillRoundedRect(x - s * 0.7, y - s * 1.35, s * 1.4, s * 0.42, 4);
    g.fillRect(x - s * 0.38, y - s * 1.85, s * 0.76, s * 0.55);
  }
}

function paintBars(scene, card, g, w, h, spec) {
  const items = spec.items || [];
  const n = Math.max(1, items.length);
  const gap = Math.max(6, Math.min(14, w * 0.03));
  const barW = Math.max(16, Math.min(64, (w - 28 - gap * (n - 1)) / n));
  const rowW = n * barW + (n - 1) * gap;
  const base = h * 0.28;
  const top = -h * 0.38;
  const span = base - top;
  const lineAt = (score) => base - span * (Math.max(0, Math.min(100, score)) / 100);
  items.forEach((item, index) => {
    const x = -rowW / 2 + barW / 2 + index * (barW + gap);
    const y = lineAt(item.score);
    const bh = Math.max(6, base - y);
    const under = spec.meaningLine && item.score < spec.meaningLine;
    g.fillStyle(under ? 0xc4b8ae : item.hot ? C.coral : C.teal, 1);
    g.fillRoundedRect(x - barW / 2, y, barW, bh, Math.min(8, barW / 3));
    addLabel(scene, card, x, y - 8, String(item.score), h > 90 ? 14 : 12, C.goldCss);
    addLabel(scene, card, x, base + 10, String(item.page), 12, C.muted);
  });
  if (spec.meaningLine) {
    const y = lineAt(spec.meaningLine);
    g.lineStyle(3, C.coral, 1);
    g.lineBetween(-w / 2 + 12, y, w / 2 - 12, y);
    addLabel(scene, card, w / 2 - 22, y - 8, String(spec.meaningLine), 12, C.coralCss);
  }
  if (spec.wordLine) {
    addLabel(scene, card, -w / 2 + 28, h / 2 - 14, String(spec.wordLine), 12, C.blueCss);
  }
}

function paintZeros(scene, card, g, w, h) {
  const cols = w > 360 ? 6 : 4;
  const rows = Math.ceil(12 / cols);
  const cell = Math.min(36, (w - 24) / cols, (h - 16) / rows);
  for (let i = 0; i < 12; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = -((cols - 1) * cell) / 2 + col * cell;
    const y = -((rows - 1) * cell) / 2 + row * cell;
    g.fillStyle(0xfff1d2, 1);
    g.fillRoundedRect(x - cell * 0.38, y - cell * 0.32, cell * 0.76, cell * 0.64, 6);
    addLabel(scene, card, x, y, "0", Math.max(11, cell * 0.34), C.muted);
  }
}

function paintCards(scene, card, g, w, h, spec) {
  const items = spec.items || [];
  const cols = w > 460 ? 6 : 4;
  const rows = Math.ceil(items.length / cols);
  const cellW = Math.min(78, (w - 20) / cols);
  const cellH = Math.min(48, (h - 16) / Math.max(1, rows));
  items.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = -((cols - 1) * cellW) / 2 + col * cellW;
    const y = -((rows - 1) * cellH) / 2 + row * cellH;
    g.fillStyle(index % 2 ? C.gold : C.teal, 0.9);
    g.fillRoundedRect(x - cellW * 0.42, y - cellH * 0.38, cellW * 0.84, cellH * 0.76, 6);
    addLabel(scene, card, x, y - (spec.labeled ? 6 : 0), String(item.page), Math.max(11, cellH * 0.28));
    if (spec.labeled) addLabel(scene, card, x, y + 8, item.title, 10, C.textDark);
  });
}

function paintPair(scene, card, g, w, h, spec) {
  const gap = 12;
  const boxW = Math.min(220, (w - gap - 24) / 2);
  const boxH = Math.max(36, h - 28);
  [-1, 1].forEach((side, index) => {
    const item = index === 0 ? spec.left : spec.right;
    const x = side * (boxW / 2 + gap / 2);
    g.fillStyle(index === 0 ? 0xffe1e4 : 0xe5f8ef, 1);
    g.fillRoundedRect(x - boxW / 2, -boxH / 2, boxW, boxH, 12);
    g.lineStyle(3, 0x3b2a2e, 1);
    g.strokeRoundedRect(x - boxW / 2, -boxH / 2, boxW, boxH, 12);
    addLabel(scene, card, x, -8, item?.title || "", h > 80 ? 16 : 13);
    addLabel(scene, card, x, 14, item?.body || "", 13, C.muted);
  });
}

function paintFlow(scene, card, g, w, h, spec) {
  const steps = spec.steps || [];
  const n = Math.max(1, steps.length);
  const gap = 8;
  const boxW = Math.max(36, Math.min(110, (w - 20 - gap * (n - 1)) / n));
  steps.forEach((step, index) => {
    const x = -((n - 1) * (boxW + gap)) / 2 + index * (boxW + gap);
    g.fillStyle(index % 2 ? C.gold : C.blue, 1);
    g.fillRoundedRect(x - boxW / 2, -18, boxW, 36, 10);
    addLabel(scene, card, x, 0, step, 13);
    if (index < n - 1) addLabel(scene, card, x + boxW / 2 + gap / 2, 0, "→", 14, C.muted);
  });
}

function paintBoard(scene, card, g, w, h, spec, phase) {
  g.fillStyle(0x3d4a3a, 1);
  g.fillRoundedRect(-w * 0.28, -h * 0.32, w * 0.56, h * 0.64, 8);
  if (phase >= 2) {
    addLabel(scene, card, 0, 0, spec.open || "", h > 80 ? 18 : 14, "#fffdf8");
  } else {
    g.fillStyle(0xf2efe4, 0.92);
    g.fillRoundedRect(-w * 0.24, -h * 0.26, w * 0.48, h * 0.52, 6);
    addLabel(scene, card, 0, 0, spec.covered || "", 13, C.muted);
  }
}

function paintSign(scene, card, g, w, h, spec) {
  g.fillStyle(C.coral, 1);
  g.fillRoundedRect(-w * 0.34, -h * 0.34, w * 0.68, h * 0.28, 8);
  addLabel(scene, card, 0, -h * 0.2, spec.title || "", h > 90 ? 20 : 14, "#fffdf8");
  addLabel(scene, card, 0, -h * 0.02, spec.sub || "", 12, C.muted);
  paintRobot(g, 0, h * 0.22, Math.min(18, h * 0.16));
}

function paintCite(scene, card, g, w, h, spec) {
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-w * 0.4, -h * 0.28, w * 0.8, h * 0.56, 10);
  g.lineStyle(3, C.gold, 1);
  g.strokeRoundedRect(-w * 0.4, -h * 0.28, w * 0.8, h * 0.56, 10);
  if (spec.page) addLabel(scene, card, 0, -h * 0.12, String(spec.page), 18, C.goldCss);
  const line = scene.add.text(0, spec.page ? 8 : 0, spec.line || "", uiText(13, { align: "center", wordWrap: { width: w * 0.7 } })).setOrigin(0.5);
  let size = 13;
  while (line.height > h * 0.4 && size > 10) {
    size -= 1;
    line.setFontSize(size);
  }
  card.add(line);
}

function paintBook(scene, card, g, w, h, spec) {
  g.fillStyle(C.blue, 1);
  g.fillRoundedRect(-w * 0.36, -h * 0.3, w * 0.34, h * 0.6, 6);
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-w * 0.02, -h * 0.3, w * 0.38, h * 0.6, 6);
  addLabel(scene, card, w * 0.16, -h * 0.08, String(spec.page || ""), 20, C.goldCss);
  addLabel(scene, card, w * 0.16, h * 0.1, spec.badge || "", 12, C.muted);
}

function paintSwap(scene, card, g, spec, phase) {
  const showNew = phase >= 2;
  g.fillStyle(0xffe1e4, 1);
  g.fillRoundedRect(-70, -28, 120, 64, 8);
  g.fillStyle(showNew ? 0xd9fbe8 : 0xfff1d2, 1);
  g.fillRoundedRect(showNew ? -20 : 10, -36, 130, 72, 8);
  addLabel(scene, card, showNew ? 40 : -10, 0, showNew ? "6:30" : "7:00", 18);
}

function paintMemory(scene, card, g, h, spec) {
  g.fillStyle(0xfffdf8, 0.95);
  g.fillCircle(0, -8, Math.min(46, h * 0.28));
  paintRobot(g, 0, 8, Math.min(22, h * 0.16));
  addLabel(scene, card, 0, -h * 0.28, spec.line || "", 16, C.goldCss);
}

function paintAddress(scene, card, g, w, h, spec) {
  const n = 12;
  for (let i = 0; i < n; i += 1) {
    const x = -w * 0.36 + (i * w * 0.72) / n;
    g.fillStyle([C.coral, C.gold, C.teal, C.blue, C.violet][i % 5], 1);
    g.fillRect(x, -8, Math.max(6, w * 0.04), 16);
  }
  addLabel(scene, card, 0, h * 0.22, String(spec.n || ""), 22, C.goldCss);
}

function paintBig(scene, card, g, w, h, spec) {
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-w * 0.42, -h * 0.22, w * 0.84, h * 0.44, 8);
  g.lineStyle(3, 0x3b2a2e, 1);
  g.strokeRoundedRect(-w * 0.42, -h * 0.22, w * 0.84, h * 0.44, 8);
  addLabel(scene, card, 0, 0, String(spec.words || ""), 28, C.goldCss);
}

function paintCounts(scene, card, spec) {
  addLabel(scene, card, 0, -10, `${spec.min}–${spec.max}`, 26, C.goldCss);
  addLabel(scene, card, 0, 18, String(spec.focus || ""), 16, C.muted);
}

function paintHats(scene, card, g, h, spec) {
  const y = 8;
  const s = Math.min(22, h * 0.16);
  paintRobot(g, -48, y, s, "blue");
  paintRobot(g, 48, y, s, "gold");
  const lang = getLang();
  addLabel(scene, card, -48, y + s + 12, lang === "ja" ? "さがす" : "找", 14, C.blueCss);
  addLabel(scene, card, 48, y + s + 12, lang === "ja" ? "書く" : "写", 14, C.goldCss);
  if (spec.note) addLabel(scene, card, 0, -h * 0.28, spec.note, 12, C.muted);
}

function paintRules(scene, card, g, w, h, spec) {
  const lines = (spec.lines || []).slice(0, 3);
  if (!lines.length) {
    addLabel(scene, card, 0, 0, "★", 28, C.goldCss);
    return;
  }
  const inner = Math.max(48, w * 0.7);
  const rowH = h / lines.length;
  lines.forEach((line, index) => {
    const y = -h / 2 + rowH * (index + 0.5);
    g.fillStyle(C.gold, 1);
    g.fillCircle(-inner / 2 - 16, y, Math.min(7, rowH * 0.18));
    const node = scene.add
      .text(-inner / 2, y, line, uiText(12, { wordWrap: { width: inner }, align: "left" }))
      .setOrigin(0, 0.5);
    let size = 12;
    while (node.height > rowH - 2 && size > 9) {
      size -= 1;
      node.setFontSize(size);
      node.setWordWrapWidth(inner);
    }
    card.add(node);
  });
}

function paintStars(scene, card) {
  [-40, 0, 40].forEach((x) => addLabel(scene, card, x, 0, "⭐", 28));
}

function paintJoin(scene, card, g, w, spec) {
  g.fillStyle(0xfff1d2, 1);
  g.fillRoundedRect(-w * 0.4, -22, w * 0.8, 44, 10);
  addLabel(scene, card, 0, -4, spec.question || "", 13);
  const pages = (spec.items || []).map((item) => item.page).join(" · ");
  addLabel(scene, card, 0, 16, pages, 12, C.muted);
}

function paintSpec(scene, card, g, w, h, spec, phase) {
  const kind = spec.kind;
  if (kind === "bars" || kind === "line") paintBars(scene, card, g, w, h, spec);
  else if (kind === "zeros") paintZeros(scene, card, g, w, h);
  else if (kind === "cards") paintCards(scene, card, g, w, h, spec);
  else if (kind === "pair") paintPair(scene, card, g, w, h, spec);
  else if (kind === "flow") paintFlow(scene, card, g, w, h, spec);
  else if (kind === "board") paintBoard(scene, card, g, w, h, spec, phase);
  else if (kind === "sign") paintSign(scene, card, g, w, h, spec);
  else if (kind === "cite") paintCite(scene, card, g, w, h, spec);
  else if (kind === "book") paintBook(scene, card, g, w, h, spec);
  else if (kind === "swap") paintSwap(scene, card, g, spec, phase);
  else if (kind === "memory") paintMemory(scene, card, g, h, spec);
  else if (kind === "address") paintAddress(scene, card, g, w, h, spec);
  else if (kind === "big") paintBig(scene, card, g, w, h, spec);
  else if (kind === "counts") paintCounts(scene, card, spec);
  else if (kind === "hats") paintHats(scene, card, g, h, spec);
  else if (kind === "rules") paintRules(scene, card, g, w, h, spec);
  else if (kind === "join") paintJoin(scene, card, g, w, spec);
  else paintStars(scene, card);
}

export function drawRagArt(scene, stage, page, { phase = 0 } = {}) {
  const lang = getLang();
  const spec = page?.shared?.locales?.[lang] || page?.shared?.locales?.zh || { kind: "stars" };
  const caption = t(page?.keys?.art || "");
  const ceiling = ceilingOf(scene, stage);
  const width = Math.max(96, Math.min(stage.w - 8, 680));
  const room = Math.max(40, ceiling - stage.top - 4);
  const block = STICKER_SHADOW_Y + CAPTION_CLEAR + CAPTION_H;
  const height = Math.min(168, Math.max(44, room - block));
  const top = stage.top + 4;
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, Math.min(18, height * 0.16), C.surface);
  card.setData("width", width);
  card.add(g);
  paintSpec(scene, card, g, width, height, spec, phase);
  card.setSize(width, height);
  card.setData("kind", "card");
  card.setData("width", width);
  card.setData("height", height);
  card.setData("shadow", true);
  card.setData("artPart", "scheme");
  card.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
  card.on("pointerdown", (_pointer, _x, _y, event) => {
    event?.stopPropagation?.();
    playSfx(scene, "sfx-tap", 0.28);
    if (phase < 2 && typeof scene.setPhase === "function") scene.setPhase(2);
  });
  scene.frame.stage.add(card);

  const capY = top + height + STICKER_SHADOW_Y + CAPTION_CLEAR;
  const note = markCaption(
    scene.add.text(stage.cx, capY, caption || " ", uiText(13, { color: C.muted })).setOrigin(0.5, 0),
  );
  if (note.width > stage.w - 8) note.setScale((stage.w - 8) / note.width);
  const limit = Math.max(8, ceiling - capY);
  if (note.height > limit) note.setScale(Math.min(note.scaleX, limit / note.height));
  note.setData("artPart", "scheme-label");
  scene.frame.stage.add(note);
}
