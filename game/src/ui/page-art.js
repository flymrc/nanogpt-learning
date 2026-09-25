import { playSfx } from "../audio/sound.js";
import { exampleSlot, t } from "../i18n/locale.js";
import { drawSticker, makeCharTile, makeChip, markCaption } from "./components.js";
import { ctaCeiling, makeBigStat, makeIconCard } from "./lesson.js";
import {
  CAPTION_CLEAR,
  CHIP_GAP_X,
  CHIP_GAP_Y,
  STICKER_SHADOW_Y,
  fitChipGrid,
} from "./layout.js";
import { C, uiText, wrapToWidth } from "./theme.js";

function ceilingOf(scene, stage) {
  return Math.min(stage.bottom - 2, ctaCeiling(scene.frame) - 4);
}

function drawTiles(scene, stage, glyphs, top, { minW = 28, minH = 28, maxW = 46, maxH = 46, onTap } = {}) {
  if (!glyphs?.length) return null;
  const ceiling = ceilingOf(scene, stage);
  const maxHeight = ceiling - top - 4;
  if (maxHeight < minH) return null;
  const grid = fitChipGrid(glyphs.length, {
    left: stage.left,
    top,
    width: stage.w,
    maxHeight,
    maxW,
    maxH,
    minW,
    minH,
    gapX: CHIP_GAP_X,
    gapY: CHIP_GAP_Y,
  });
  if (grid.height > maxHeight + 1) return null;
  const nodes = glyphs.map((glyph, index) => {
    const node = makeCharTile(scene, grid.positions[index].x, grid.positions[index].y, String(glyph), {
      width: grid.tileW,
      height: grid.tileH,
      seed: `${glyph}-${index}`,
    });
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
    scene.frame.stage.add(chip);
  });
  return { bottom: top + grid.height + STICKER_SHADOW_Y };
}

function drawWordRow(scene, stage, words, top) {
  if (!words?.length) return null;
  const gap = 8;
  const height = 64;
  const width = Math.min(108, (stage.w - gap * (words.length - 1)) / words.length);
  if (width < 64) return null;
  const ceiling = ceilingOf(scene, stage);
  if (top + height + STICKER_SHADOW_Y > ceiling) return null;
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
    scene.frame.stage.add(card);
  });
  return { bottom: top + height + STICKER_SHADOW_Y };
}

function drawStats(scene, stage, cards, top) {
  if (!cards?.length) return null;
  const gap = 10;
  const height = 78;
  const width = Math.min(200, (stage.w - gap * (cards.length - 1)) / cards.length);
  if (width < 96) return null;
  const ceiling = ceilingOf(scene, stage);
  if (top + height + STICKER_SHADOW_Y > ceiling) return null;
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
    scene.frame.stage.add(node);
  });
  return { bottom: top + height + STICKER_SHADOW_Y };
}

function drawScheme(scene, stage, top, caption, paint) {
  const ceiling = ceilingOf(scene, stage);
  const width = Math.min(stage.w - 4, 520);
  const height = Math.min(110, ceiling - top - 36);
  if (width < 120 || height < 64) return null;
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 16, C.surface);
  const layout = paint(g, width, height) || null;
  card.add(g);
  card.setSize(width, height);
  card.setData("kind", "card");
  card.setData("width", width);
  card.setData("height", height);
  card.setData("shadow", true);
  scene.frame.stage.add(card);
  const capY = top + height + STICKER_SHADOW_Y + CAPTION_CLEAR;
  if (caption && capY + 16 <= ceiling) {
    const note = markCaption(
      scene.add.text(stage.cx, capY, caption, uiText(13, { color: C.muted })).setOrigin(0.5, 0),
    );
    scene.frame.stage.add(note);
  }
  return { bottom: capY + 18, card, width, height, layout };
}

function paintBars(g, width, height, { highlight = -1, short = false, count = 8, labelRoom = false, zeroFrom = count } = {}) {
  const gap = 6;
  const barW = count === 1
    ? Math.min(84, width - 48)
    : Math.min(28, (width - 36 - gap * Math.max(0, count - 1)) / count);
  const total = count * barW + Math.max(0, count - 1) * gap;
  const x0 = -total / 2;
  const base = height / 2 - (labelRoom ? 22 : 16);
  const tall = labelRoom ? height - 48 : height - 36;
  for (let index = 0; index < count; index += 1) {
    const zero = index >= zeroFrom;
    const h = zero ? 6 : short && index === highlight ? tall * 0.28 : tall * (0.35 + ((index * 37) % 50) / 100);
    const x = x0 + index * (barW + gap);
    const color = zero ? 0xc4b8ae : index === highlight ? C.coral : C.teal;
    g.fillStyle(color, zero ? 0.55 : index === highlight ? 1 : 0.85);
    g.fillRoundedRect(x, base - h, barW, h, 4);
  }
  return { barW, gap, base, count, x0 };
}

function labelBars(scene, drawn, labels, { highlight = -1, zeroFrom = labels.length } = {}) {
  if (!drawn?.card || !drawn.layout || !labels?.length) return;
  const { barW, gap, base, x0 } = drawn.layout;
  labels.forEach((label, index) => {
    const zero = index >= zeroFrom;
    const x = x0 + index * (barW + gap) + barW / 2;
    const text = scene.add.text(x, base + 2, zero ? "0" : label, uiText(12, {
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
  const gap = 8;
  const inner = width - 36;
  let x = -width / 2 + 18;
  const y = -height / 2 + 18;
  const h = height - 36;
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
  const height = Math.max(72, probe.height + 28);
  probe.destroy();
  if (top + height + STICKER_SHADOW_Y > ceiling) return null;
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 16, C.surface);
  const stripe = scene.add.rectangle(-width / 2 + 12, 0, 8, height - 20, C.coral).setOrigin(0.5);
  const text = scene.add.text(8, 0, wrapped, uiText(size, { align: "center", lineSpacing: 4 })).setOrigin(0.5);
  card.add([g, stripe, text]);
  card.setSize(width, height);
  card.setData("kind", "card");
  card.setData("width", width);
  card.setData("height", height);
  card.setData("shadow", true);
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
  if (!page || stage.h < 48) return;
  const shared = page.shared || {};
  const visual = page.visual;
  const showResult = phase >= 2;
  const slot = exampleSlot(page);
  let top = stage.top + 4;
  const scheme = shared.schematic ? t("schematic") : "";

  if (visual === "pattern" || visual === "right" || visual === "cards" || visual === "fix") {
    const rows = visual === "pattern" ? shared.rows : [visual === "cards" ? shared.open : shared.glyphs];
    rows.filter(Boolean).forEach((row, rowIndex) => {
      const glyphs = row.map((glyph) => {
        if (!showResult || glyph !== "＿") return glyph;
        if (visual === "pattern") return shared.reveal?.[rowIndex] || glyph;
        if (visual === "fix") return shared.right || glyph;
        return glyph;
      });
      const drawn = drawTiles(scene, stage, glyphs, top, {
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
      const extra = drawTiles(scene, stage, closed, top);
      if (extra) top = extra.bottom + 4;
    }
    if (slot?.glyphs?.length) {
      const localGlyphs = slot.glyphs.map((glyph) => (showResult && glyph === "＿" ? slot.reveal || glyph : glyph));
      drawTiles(scene, stage, localGlyphs, top);
    }
    return;
  }

  if (visual === "chain") {
    const words = slot?.glyphs || [];
    const row = drawWordRow(scene, stage, words, top);
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
        g.fillStyle(C.violet, 0.35);
        g.fillRoundedRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 10);
        if (visual === "back" || visual === "nudge") {
          g.fillStyle(C.coral, 1);
          g.fillTriangle(0, -h / 2 + 22, -10, -h / 2 + 40, 10, -h / 2 + 40);
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
      const row = drawTiles(scene, stage, glyphs, top, { maxW: 40, maxH: 40 });
      row?.nodes?.forEach((node, index) => {
        if (index >= zeroFrom) node.setAlpha(0.35);
      });
      if (row) top = row.bottom + 6;
    }
    const drawn = drawScheme(scene, stage, top, scheme, (g, w, h) => paintBars(g, w, h, {
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
