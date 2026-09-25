import { playSfx } from "../audio/sound.js";
import { exampleSlot, t } from "../i18n/locale.js";
import { drawSticker, makeCharTile, makeChip, markCaption } from "./components.js";
import { ctaCeiling, makeBigStat, makeIconCard } from "./lesson.js";
import {
  CAPTION_CLEAR,
  CHIP_GAP_X,
  CHIP_GAP_Y,
  MIN_CHIP_H,
  MIN_CHIP_W,
  STICKER_SHADOW_Y,
  fitChipGrid,
} from "./layout.js";
import { C, uiText, wrapToWidth } from "./theme.js";

function ceilingOf(scene, stage) {
  return Math.min(stage.bottom - 2, ctaCeiling(scene.frame) - 4);
}

const SCHEME_VISUALS = new Set([
  "bars", "truebar", "penalty", "wheel", "temp",
  "guess", "random", "back", "nudge", "save", "load",
]);
const STATS_VISUALS = new Set([
  "vocab", "split", "batch", "average", "exam", "loop", "flags", "embed", "heads", "layers",
]);
const SCHEME_CARD_H = 48;
const SCHEME_CAPTION_H = 18;

function tagArt(node, part) {
  if (node?.setData) node.setData("artPart", part);
  return node;
}

function countOf(list) {
  return Array.isArray(list) ? list.length : 0;
}

function schemeBlock() {
  return SCHEME_CARD_H + STICKER_SHADOW_Y + CAPTION_CLEAR + SCHEME_CAPTION_H;
}

function chipCols(width) {
  return Math.max(1, Math.floor((Math.max(80, width) + CHIP_GAP_X) / (MIN_CHIP_W + CHIP_GAP_X)));
}

function chipBlock(count, width) {
  const rows = Math.max(1, Math.ceil(Math.max(1, count) / chipCols(width)));
  return rows * MIN_CHIP_H + Math.max(0, rows - 1) * CHIP_GAP_Y + STICKER_SHADOW_Y + 6;
}

function tileBlock(count, width, maxTile = 40) {
  const gaps = Math.max(0, count - 1) * CHIP_GAP_X;
  const tile = Math.min(maxTile, Math.max(18, (Math.max(80, width) - gaps) / Math.max(1, count)));
  return tile + STICKER_SHADOW_Y + 4;
}

function pairCount(visual, shared) {
  if (visual === "assign") return countOf(shared.marks);
  if (visual === "same") return countOf(shared.glyphs) + countOf(shared.side);
  if (visual === "decode") return countOf(shared.ids);
  return countOf(shared.glyphs);
}

function statCount(visual) {
  if (visual === "vocab" || visual === "split" || visual === "exam") return 2;
  return 1;
}

/** Minimum example-band height so the picture can shrink instead of disappearing. */
export function artBandReserve(page, phase = 0, width = 320) {
  const visual = page?.visual;
  if (!visual) return 64;
  const shared = page.shared || {};
  const slot = exampleSlot(page);
  const tile = 28 + STICKER_SHADOW_Y + 6;
  if (visual === "compare" || visual === "shares" || visual === "mix") {
    return tileBlock(countOf(shared.glyphs) || 3, width, 40) + 6 + schemeBlock();
  }
  if (SCHEME_VISUALS.has(visual)) return schemeBlock();
  if (STATS_VISUALS.has(visual)) return 78 + STICKER_SHADOW_Y + 4;
  if (visual === "pattern") {
    let height = 0;
    (shared.rows || []).filter(Boolean).forEach((row) => {
      height += tileBlock(row.length, width, 46);
    });
    if (slot?.glyphs?.length) height += tileBlock(slot.glyphs.length, width, 46);
    return Math.max(tile, height);
  }
  if (visual === "cards") {
    return tileBlock(countOf(shared.open), width, 46) + tileBlock(countOf(shared.closed), width, 46);
  }
  if (visual === "right" || visual === "fix" || visual === "cells" || visual === "spaces" || visual === "clip" || visual === "append" || visual === "causal" || visual === "baskets") {
    const glyphs = visual === "baskets" ? (shared.baskets || shared.glyphs) : shared.glyphs;
    let height = tileBlock(countOf(glyphs) || 1, width, 46);
    if (slot?.glyphs?.length) height += tileBlock(slot.glyphs.length, width, 40);
    return height;
  }
  if (visual === "shift" || visual === "blanks") {
    const topCount = countOf(shared.top || shared.glyphs) || 1;
    const bottomCount = countOf(shared.bottom || shared.answers) || 1;
    return tileBlock(topCount, width, 46) + tileBlock(bottomCount, width, 46);
  }
  if (visual === "chain") {
    return 64 + STICKER_SHADOW_Y + 8 + tileBlock(countOf(shared.letters) || 1, width, 40);
  }
  if (visual === "stars") return 64 + STICKER_SHADOW_Y + 4;
  if (visual === "sign") return tileBlock(countOf(shared.glyphs) || 1, width, 40) + 8 + 72 + STICKER_SHADOW_Y;
  if (visual === "start") return chipBlock(1, width);
  if (visual === "encode" || visual === "same" || visual === "assign" || visual === "decode") {
    let height = chipBlock(pairCount(visual, shared) || 1, width);
    if (visual === "decode" && phase >= 2) height += tileBlock(countOf(shared.glyphs) || 1, width, 40) + 6;
    if (visual === "assign" && slot?.glyphs?.length) height += tileBlock(slot.glyphs.length, width, 36) + 6;
    return height;
  }
  return tile;
}

/** What each skeleton visual must actually paint. Counts come from the page, not from what happened to draw. */
export function expectedArt(page, phase = 0) {
  const visual = page?.visual;
  if (!visual) return null;
  const shared = page.shared || {};
  const slot = exampleSlot(page);
  const showResult = phase >= 2;
  const parts = [];
  const need = (part, min) => {
    if (min > 0) parts.push({ part, min });
  };
  if (visual === "pattern" || visual === "right" || visual === "cards" || visual === "fix") {
    let count = 0;
    const rows = visual === "pattern" ? (shared.rows || []) : [visual === "cards" ? shared.open : shared.glyphs];
    rows.filter(Boolean).forEach((row) => {
      count += countOf(row);
    });
    if (visual === "cards") count += countOf(shared.closed);
    count += countOf(slot?.glyphs);
    need("tiles", count);
  } else if (visual === "chain") {
    need("words", countOf(slot?.glyphs));
    need("tiles", countOf(shared.letters));
  } else if (visual === "start") {
    parts.push({ part: "start", any: ["chips", "tiles"], min: 1 });
  } else if (visual === "cells" || visual === "spaces" || visual === "clip" || visual === "append" || visual === "causal") {
    need("tiles", countOf(shared.glyphs));
  } else if (visual === "baskets") {
    need("tiles", countOf(showResult ? shared.baskets : shared.glyphs));
  } else if (STATS_VISUALS.has(visual)) {
    need("stats", statCount(visual));
  } else if (visual === "assign" || visual === "same" || visual === "encode" || visual === "decode") {
    need("chips", pairCount(visual, shared));
    if (visual === "decode" && showResult) need("tiles", countOf(shared.glyphs));
    if (visual === "assign") need("tiles", countOf(slot?.glyphs));
  } else if (visual === "shift" || visual === "blanks") {
    need("tiles", countOf(shared.top || shared.glyphs) + countOf(shared.bottom || shared.answers));
  } else if (SCHEME_VISUALS.has(visual)) {
    need("scheme", 1);
    need("scheme-label", 1);
  } else if (visual === "compare" || visual === "shares" || visual === "mix") {
    need("tiles", countOf(shared.glyphs));
    need("scheme", 1);
    need("scheme-label", 1);
  } else if (visual === "sign") {
    need("tiles", countOf(shared.glyphs));
    need("sign", 1);
  } else if (visual === "stars") {
    need("words", 3);
  }
  return { visual, parts };
}

function packSingleRow(count, { left, top, width, maxW, maxH, gapX, maxHeight }) {
  const gaps = Math.max(0, count - 1) * gapX;
  let tile = (width - gaps) / Math.max(1, count);
  tile = Math.min(maxW, maxH, Math.max(1, maxHeight), tile);
  tile = Math.max(1, tile);
  const rowW = count * tile + gaps;
  const start = left + Math.max(0, (width - rowW) / 2) + tile / 2;
  const positions = Array.from({ length: count }, (_, index) => ({
    x: start + index * (tile + gapX),
    y: top + tile / 2,
  }));
  return { tileW: tile, tileH: tile, positions, height: tile };
}

function drawTiles(scene, stage, glyphs, top, { minW = 28, minH = 28, maxW = 46, maxH = 46, onTap, singleRow = false, patternRow = null, artPart = "tiles" } = {}) {
  if (!glyphs?.length) return null;
  const ceiling = ceilingOf(scene, stage);
  const maxHeight = Math.max(8, ceiling - top - 4);
  const looseMin = 12;
  let grid = singleRow
    ? packSingleRow(glyphs.length, {
      left: stage.left,
      top,
      width: stage.w,
      maxW,
      maxH,
      gapX: CHIP_GAP_X,
      maxHeight,
    })
    : fitChipGrid(glyphs.length, {
      left: stage.left,
      top,
      width: stage.w,
      maxHeight,
      maxW,
      maxH,
      minW: Math.min(minW, looseMin),
      minH: Math.min(minH, looseMin),
      gapX: CHIP_GAP_X,
      gapY: CHIP_GAP_Y,
    });
  if (grid.height > maxHeight + 1) {
    grid = packSingleRow(glyphs.length, {
      left: stage.left,
      top,
      width: stage.w,
      maxW: Math.min(maxW, maxHeight),
      maxH: Math.min(maxH, maxHeight),
      gapX: CHIP_GAP_X,
      maxHeight,
    });
  }
  const nodes = glyphs.map((glyph, index) => {
    const node = makeCharTile(scene, grid.positions[index].x, grid.positions[index].y, String(glyph), {
      width: grid.tileW,
      height: grid.tileH,
      seed: `${glyph}-${index}`,
    });
    tagArt(node, artPart);
    if (patternRow != null) node.setData("patternRow", patternRow);
    scene.frame.stage.add(node);
    if (onTap) {
      node.setInteractive(
        new Phaser.Geom.Rectangle(-grid.tileW / 2, -grid.tileH / 2, grid.tileW, grid.tileH),
        Phaser.Geom.Rectangle.Contains,
      );
      node.on("pointerdown", (pointer, _x, _y, event) => {
        event?.stopPropagation?.();
        playSfx(scene, "sfx-tap", 0.22);
        onTap(node, glyph, index);
      });
    }
    return node;
  });
  return { nodes, bottom: top + grid.height + STICKER_SHADOW_Y };
}

function drawChips(scene, stage, pairs, top) {
  if (!pairs?.length) return null;
  const ceiling = ceilingOf(scene, stage);
  const maxHeight = ceiling - top - 4;
  if (maxHeight < 40) return null;
  const grid = fitChipGrid(pairs.length, {
    left: stage.left,
    top,
    width: stage.w,
    maxHeight,
    maxW: 54,
    maxH: 62,
    minW: 32,
    minH: 40,
    gapX: CHIP_GAP_X,
    gapY: CHIP_GAP_Y,
  });
  if (grid.height > maxHeight + 1 || grid.tileW < 32 || grid.tileH < 40) return null;
  pairs.forEach(([glyph, id], index) => {
    const chip = makeChip(scene, grid.positions[index].x, grid.positions[index].y, {
      glyph: String(glyph),
      id,
      width: grid.tileW,
      height: grid.tileH,
      accent: C.teal,
    });
    tagArt(chip, "chips");
    scene.frame.stage.add(chip);
  });
  return { bottom: top + grid.height + STICKER_SHADOW_Y };
}

function drawWordRow(scene, stage, words, top, { leave = 0 } = {}) {
  if (!words?.length) return null;
  const gap = 8;
  const ceiling = ceilingOf(scene, stage);
  const room = ceiling - top - leave - STICKER_SHADOW_Y - 2;
  const height = Math.min(64, Math.max(28, room));
  const width = Math.max(28, Math.min(108, (stage.w - gap * (words.length - 1)) / words.length));
  const rowW = words.length * width + (words.length - 1) * gap;
  const x0 = stage.cx - rowW / 2 + width / 2;
  words.forEach((word, index) => {
    const card = makeIconCard(scene, x0 + index * (width + gap), top + height / 2, {
      glyph: String(word),
      label: " ",
      width,
      height,
      accent: C.gold,
    });
    card.list?.forEach((child) => {
      if (child.type === "Text" && child.width > width - 16) child.setScale((width - 16) / child.width);
    });
    tagArt(card, "words");
    scene.frame.stage.add(card);
  });
  return { bottom: top + height + STICKER_SHADOW_Y };
}

function drawStats(scene, stage, cards, top) {
  if (!cards?.length) return null;
  const gap = 10;
  const ceiling = ceilingOf(scene, stage);
  const room = ceiling - top - STICKER_SHADOW_Y - 2;
  const height = Math.min(78, Math.max(36, room));
  const width = Math.max(64, Math.min(200, (stage.w - gap * (cards.length - 1)) / cards.length));
  const rowW = cards.length * width + (cards.length - 1) * gap;
  const x0 = stage.cx - rowW / 2 + width / 2;
  cards.forEach((card, index) => {
    const node = makeBigStat(scene, x0 + index * (width + gap), top + height / 2, {
      value: String(card.value),
      label: card.label,
      width,
      height,
      accent: card.accent || C.coral,
    });
    node.list?.forEach((child) => {
      if (child.type === "Text" && child.width > width - 28) child.setScale((width - 28) / child.width);
    });
    tagArt(node, "stats");
    scene.frame.stage.add(node);
  });
  return { bottom: top + height + STICKER_SHADOW_Y };
}

function drawScheme(scene, stage, top, caption, paint) {
  const ceiling = ceilingOf(scene, stage);
  const width = Math.max(72, Math.min(stage.w - 4, 520));
  const room = Math.max(28, ceiling - top - 2);
  const block = caption ? STICKER_SHADOW_Y + CAPTION_CLEAR + SCHEME_CAPTION_H : STICKER_SHADOW_Y;
  const height = Math.min(110, Math.max(20, room - block));
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, Math.min(16, height * 0.2), C.surface);
  const layout = paint(g, width, height) || null;
  card.add(g);
  card.setSize(width, height);
  card.setData("kind", "card");
  card.setData("width", width);
  card.setData("height", height);
  card.setData("shadow", true);
  tagArt(card, "scheme");
  scene.frame.stage.add(card);
  let bottom = top + height + STICKER_SHADOW_Y;
  if (caption) {
    const capY = top + height + STICKER_SHADOW_Y + CAPTION_CLEAR;
    const note = markCaption(
      scene.add.text(stage.cx, capY, caption, uiText(13, { color: C.muted })).setOrigin(0.5, 0),
    );
    if (note.width > stage.w - 4) note.setScale((stage.w - 4) / note.width);
    const limit = ceiling - capY;
    if (note.height > limit && limit > 6) note.setScale(Math.min(note.scaleX, limit / note.height));
    tagArt(note, "scheme-label");
    scene.frame.stage.add(note);
    bottom = capY + Math.max(SCHEME_CAPTION_H, note.displayHeight || note.height || SCHEME_CAPTION_H);
  }
  return { bottom, card, width, height, layout };
}

function paintBars(g, width, height, { highlight = -1, short = false, count = 8, labelRoom = false, zeroFrom = count } = {}) {
  const font = height >= 44 ? 12 : 11;
  const gap = Math.max(3, Math.min(6, width * 0.04));
  const side = Math.max(8, Math.min(18, width * 0.06));
  const inner = Math.max(count * 6, width - side * 2);
  const barW = count === 1
    ? Math.min(84, inner)
    : Math.max(6, Math.min(28, (inner - gap * Math.max(0, count - 1)) / count));
  const total = count * barW + Math.max(0, count - 1) * gap;
  const x0 = -total / 2;
  const labelBand = labelRoom ? font + 10 : 4;
  const topPad = Math.max(4, Math.min(12, height * 0.14));
  const base = height / 2 - labelBand;
  const tall = Math.max(4, base + height / 2 - topPad);
  for (let index = 0; index < count; index += 1) {
    const zero = index >= zeroFrom;
    const h = zero ? Math.min(6, tall) : short && index === highlight ? Math.max(3, tall * 0.28) : tall * (0.35 + ((index * 37) % 50) / 100);
    const x = x0 + index * (barW + gap);
    const color = zero ? 0xc4b8ae : index === highlight ? C.coral : C.teal;
    g.fillStyle(color, zero ? 0.55 : index === highlight ? 1 : 0.85);
    const radius = Math.max(1, Math.min(4, barW / 2, h / 2));
    g.fillRoundedRect(x, base - h, barW, Math.max(2, h), radius);
  }
  return { barW, gap, base, count, x0, labelFont: font };
}

function labelBars(scene, drawn, labels, { highlight = -1, zeroFrom = labels.length } = {}) {
  if (!drawn?.card || !drawn.layout || !labels?.length) return;
  const { barW, gap, base, x0, labelFont = 12 } = drawn.layout;
  labels.forEach((label, index) => {
    const zero = index >= zeroFrom;
    const x = x0 + index * (barW + gap) + barW / 2;
    const text = scene.add.text(x, base + 1, zero ? "0" : label, uiText(labelFont, {
      color: zero ? C.muted : index === highlight ? C.coralCss : C.text,
    })).setOrigin(0.5, 0);
    drawn.card.add(text);
  });
}

function focusIndex(shared) {
  if (Number.isFinite(shared?.focus)) return shared.focus;
  const glyphs = shared?.glyphs || [];
  const at = glyphs.indexOf(String(shared?.focus ?? ""));
  return at >= 0 ? at : 0;
}

function paintWheel(g, width, height, grown = false) {
  const faces = [
    { label: "a", share: grown ? 0.62 : 0.5 },
    { label: "b", share: 0.3 },
    { label: "c", share: grown ? 0.08 : 0.2 },
  ];
  const pad = Math.max(6, Math.min(18, height * 0.16));
  const gap = 8;
  const inner = width - pad * 2;
  let x = -width / 2 + pad;
  const y = -height / 2 + pad;
  const h = Math.max(8, height - pad * 2);
  faces.forEach((face, index) => {
    const w = Math.max(18, inner * face.share - gap);
    g.fillStyle(index === 0 ? C.gold : index === 1 ? C.blue : C.pink, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    x += w + gap;
  });
}

function drawSign(scene, stage, top, message) {
  const ceiling = ceilingOf(scene, stage);
  const width = Math.min(stage.w - 4, 560);
  const wrap = width - 40;
  let size = 16;
  let wrapped = wrapToWidth(scene, message, size, wrap, uiText);
  const probe = scene.add.text(-4000, -4000, wrapped, uiText(size, { align: "center", lineSpacing: 4 })).setVisible(false);
  while (probe.height > 88 && size > 12) {
    size -= 1;
    wrapped = wrapToWidth(scene, message, size, wrap, uiText);
    probe.setFontSize(size);
    probe.setText(wrapped);
  }
  const room = ceiling - top - STICKER_SHADOW_Y - 2;
  let height = Math.max(36, Math.min(Math.max(72, probe.height + 28), Math.max(36, room)));
  if (room < 36) height = Math.max(24, room);
  probe.destroy();
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 16, C.surface);
  const stripe = scene.add.rectangle(-width / 2 + 12, 0, 8, Math.max(8, height - 16), C.coral).setOrigin(0.5);
  const text = scene.add.text(8, 0, wrapped, uiText(size, { align: "center", lineSpacing: 4 })).setOrigin(0.5);
  card.add([g, stripe, text]);
  card.setSize(width, height);
  card.setData("kind", "card");
  card.setData("width", width);
  card.setData("height", height);
  card.setData("shadow", true);
  tagArt(card, "sign");
  scene.frame.stage.add(card);
  return { bottom: top + height + STICKER_SHADOW_Y };
}

function revealTile(node, glyph) {
  const label = node.getData("label");
  if (label) label.setText(glyph);
}

/**
 * Draw the page picture under the textbook card.
 * Pieces stay inside the example band. Charts are one card labelled 示意 / イメージ図.
 */
export function drawPageArt(scene, stage, page, { phase = 0 } = {}) {
  if (!page) {
    if (scene.frame) scene.frame.artExpect = null;
    return;
  }
  if (scene.frame) scene.frame.artExpect = expectedArt(page, phase);
  if (!stage || stage.h < 8) return;
  const shared = page.shared || {};
  const visual = page.visual;
  const showResult = phase >= 2;
  const slot = exampleSlot(page);
  let top = stage.top + 4;
  const scheme = shared.schematic ? t("schematic") : "";

  if (visual === "pattern" || visual === "right" || visual === "cards" || visual === "fix") {
    const rows = visual === "pattern" ? shared.rows : [visual === "cards" ? shared.open : shared.glyphs];
    const rowList = rows.filter(Boolean);
    const planned = rowList.length + (visual === "cards" ? 1 : 0) + (slot?.glyphs?.length ? 1 : 0);
    const budget = Math.max(16, ceilingOf(scene, stage) - top - Math.max(0, planned - 1) * 4);
    const tileMax = Math.max(14, Math.min(46, budget / Math.max(1, planned) - STICKER_SHADOW_Y));
    const sequence = visual === "pattern" || visual === "cards" || visual === "right" || visual === "fix";
    rowList.forEach((row, rowIndex) => {
      const glyphs = row.map((glyph) => {
        if (!showResult || glyph !== "＿") return glyph;
        if (visual === "pattern") return shared.reveal?.[rowIndex] || glyph;
        if (visual === "fix") return shared.right || glyph;
        return glyph;
      });
      const drawn = drawTiles(scene, stage, glyphs, top, {
        singleRow: sequence,
        patternRow: visual === "pattern" ? rowIndex : null,
        maxW: tileMax,
        maxH: tileMax,
        onTap: (node, glyph) => {
          if (glyph !== "＿") return;
          const next = visual === "pattern" ? shared.reveal?.[rowIndex] : visual === "fix" ? shared.right : "■";
          revealTile(node, next || glyph);
        },
      });
      if (drawn) top = drawn.bottom + 4;
    });
    if (visual === "cards") {
      const closed = (shared.closed || []).map((glyph, index) => (showResult && index === 0 ? shared.reveal || glyph : glyph));
      const extra = drawTiles(scene, stage, closed, top, { singleRow: true, maxW: tileMax, maxH: tileMax });
      if (extra) top = extra.bottom + 4;
    }
    if (slot?.glyphs?.length) {
      const localGlyphs = slot.glyphs.map((glyph) => (showResult && glyph === "＿" ? slot.reveal || glyph : glyph));
      drawTiles(scene, stage, localGlyphs, top, {
        singleRow: visual === "pattern",
        patternRow: visual === "pattern" ? "local" : null,
        maxW: tileMax,
        maxH: tileMax,
      });
    }
    return;
  }

  if (visual === "chain") {
    const words = slot?.glyphs || [];
    const leave = tileBlock(countOf(shared.letters) || 1, stage.w, 40) + 8;
    const row = drawWordRow(scene, stage, words, top, { leave });
    if (row) top = row.bottom + 8;
    drawTiles(scene, stage, shared.letters || [], top);
    return;
  }

  if (visual === "start") {
    const chip = drawChips(scene, stage, [["↵", shared.id ?? 0]], top);
    if (!chip) drawTiles(scene, stage, ["↵"], top);
    return;
  }

  if (visual === "cells" || visual === "spaces" || visual === "clip" || visual === "append") {
    drawTiles(scene, stage, shared.glyphs, top);
    return;
  }

  if (visual === "causal") {
    const row = drawTiles(scene, stage, shared.glyphs, top);
    row?.nodes?.forEach((node, index) => {
      if (index > 2) node.setAlpha(0.35);
    });
    return;
  }

  if (visual === "baskets") {
    drawTiles(scene, stage, showResult ? shared.baskets : shared.glyphs, top);
    return;
  }

  if (visual === "vocab") {
    drawStats(scene, stage, [
      { value: "65", label: t("schematic") === "示意" ? "种" : "しゅるい", accent: C.gold },
      { value: "1,115,394", label: t("art.practice") ? "" : "", accent: C.teal },
    ].map((card, index) => (index === 1 ? { ...card, label: " " } : card)), top);
    return;
  }

  if (visual === "assign" || visual === "same" || visual === "encode" || visual === "decode") {
    if (visual === "decode" && showResult) {
      const letters = drawTiles(scene, stage, shared.glyphs, top);
      if (letters) top = letters.bottom + 6;
    }
    const pairs =
      visual === "assign"
        ? shared.marks
        : visual === "same"
          ? [...shared.glyphs.map((glyph) => [glyph, shared.id]), ...(shared.side || [])]
          : visual === "encode"
            ? shared.glyphs.map((glyph, index) => [glyph, shared.ids[index]])
            : shared.ids.map((id, index) => [shared.glyphs[index], id]);
    const chips = drawChips(scene, stage, pairs, top);
    if (!chips && visual !== "decode") drawTiles(scene, stage, (pairs || []).map((pair) => pair[0]), top);
    if (visual === "assign" && slot?.glyphs?.length) {
      drawTiles(scene, stage, slot.glyphs, (chips?.bottom || top) + 6, { maxW: 36, maxH: 36 });
    }
    return;
  }

  if (visual === "split") {
    drawStats(scene, stage, [
      { value: "1,003,854", label: t("art.practice"), accent: C.teal },
      { value: "111,540", label: t("art.exam"), accent: C.coral },
    ], top);
    return;
  }

  if (visual === "shift" || visual === "blanks") {
    const first = drawTiles(scene, stage, shared.top || shared.glyphs, top);
    const secondTop = (first?.bottom || top) + 4;
    drawTiles(scene, stage, showResult ? shared.bottom || shared.answers : (shared.bottom || shared.answers || []).map(() => "＿"), secondTop);
    return;
  }

  if (visual === "batch") {
    drawStats(scene, stage, [
      { value: "64", label: t("art.manyQuestions"), accent: C.blue },
    ], top);
    return;
  }

  if (visual === "bars") {
    const drawn = drawScheme(scene, stage, top, scheme, (g, w, h) => paintBars(g, w, h, {
      highlight: 0,
      count: 1,
      labelRoom: true,
    }));
    labelBars(scene, drawn, ["65"], { highlight: 0 });
    return;
  }

  if (visual === "truebar") {
    const labels = ["F", "i", "r", "s", "t"];
    const drawn = drawScheme(scene, stage, top, scheme, (g, w, h) => paintBars(g, w, h, {
      highlight: 4,
      count: labels.length,
      labelRoom: true,
    }));
    labelBars(scene, drawn, labels, { highlight: 4 });
    return;
  }

  if (visual === "penalty") {
    drawScheme(scene, stage, top, scheme, (g, w, h) => paintBars(g, w, h, {
      highlight: 0,
      short: true,
      count: 1,
    }));
    return;
  }

  if (visual === "average" || visual === "exam" || visual === "guess" || visual === "random" || visual === "back" || visual === "nudge" || visual === "flags" || visual === "save" || visual === "load") {
    const cards = [];
    if (visual === "average") cards.push({ value: "16,384", label: t("art.full"), accent: C.gold });
    if (visual === "exam") {
      cards.push({ value: t("art.practice"), label: t("schematic"), accent: C.teal });
      cards.push({ value: t("art.exam"), label: t("schematic"), accent: C.coral });
    }
    if (visual === "loop" || visual === "flags") cards.push({ value: String(shared.steps || shared.max || ""), label: String(shared.every || ""), accent: C.gold });
    if (cards.length) drawStats(scene, stage, cards, top);
    else {
      drawScheme(scene, stage, top, scheme || t("art.locked"), (g, w, h) => {
        const pad = Math.min(16, Math.max(4, h * 0.18));
        g.fillStyle(C.violet, 0.35);
        g.fillRoundedRect(-w / 2 + pad, -h / 2 + pad, Math.max(8, w - pad * 2), Math.max(8, h - pad * 2), 8);
        if (visual === "back" || visual === "nudge") {
          g.fillStyle(C.coral, 1);
          const tip = -h / 2 + pad + 4;
          g.fillTriangle(0, tip, -8, tip + 14, 8, tip + 14);
        }
      });
    }
    return;
  }

  if (visual === "loop") {
    drawStats(scene, stage, [{ value: "5000", label: "→", accent: C.gold }], top);
    return;
  }

  if (visual === "embed") {
    drawStats(scene, stage, [{ value: "384", label: "F · 18", accent: C.blue }], top);
    return;
  }
  if (visual === "heads") {
    drawStats(scene, stage, [{ value: "6×64", label: "384", accent: C.violet }], top);
    return;
  }
  if (visual === "layers") {
    drawStats(scene, stage, [{ value: "6", label: "65", accent: C.gold }], top);
    return;
  }
  if (visual === "compare" || visual === "shares" || visual === "mix") {
    const glyphs = shared.glyphs || [];
    const focus = focusIndex(shared);
    const zeroFrom = visual === "mix" ? glyphs.length : focus + 1;
    if (glyphs.length) {
      const tileRoom = Math.max(16, ceilingOf(scene, stage) - top - schemeBlock() - 6 - STICKER_SHADOW_Y);
      const tileMax = Math.min(40, tileRoom);
      const row = drawTiles(scene, stage, glyphs, top, { maxW: tileMax, maxH: tileMax, singleRow: true });
      row?.nodes?.forEach((node, index) => {
        if (index >= zeroFrom) node.setAlpha(0.35);
      });
      if (row) top = row.bottom + 6;
    }
    const drawn = drawScheme(scene, stage, top, scheme || t("schematic"), (g, w, h) => paintBars(g, w, h, {
      highlight: focus,
      count: glyphs.length || 3,
      labelRoom: true,
      zeroFrom,
    }));
    labelBars(scene, drawn, glyphs, { highlight: focus, zeroFrom });
    return;
  }

  if (visual === "wheel" || visual === "temp") {
    const real = shared.realSlots ? ` · ${shared.realSlots}` : "";
    drawScheme(scene, stage, top, `${scheme}${real}  ${shared.value || "a b c"}`.trim(), (g, w, h) => paintWheel(g, w, h, visual === "temp" && showResult));
    return;
  }

  if (visual === "sign") {
    const tiles = drawTiles(scene, stage, shared.glyphs, top, { maxW: 40, maxH: 40 });
    drawSign(scene, stage, (tiles?.bottom || top) + 8, t(page.keys?.sign || "c5-sign"));
    return;
  }

  if (visual === "stars") {
    const stars = [1, 2, 3].map((n) => `⭐${n}`);
    drawWordRow(scene, stage, stars, top);
  }
}
