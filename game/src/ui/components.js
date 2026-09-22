import Phaser from "phaser";
import { applyMute, playSfx, readMuted, unlockAudio } from "../audio/sound.js";
import { openNote } from "./notes.js";
import { pointerToCss, textureScale } from "./dpr.js";
import {
  MIN_ID_FONT,
  STICKER_SHADOW_X,
  STICKER_SHADOW_Y,
  TAP_MIN,
  clamp,
  getView,
  hudReservePx,
  makeShell,
  scaled,
} from "./layout.js";
import { tutorClickGuardLeft } from "./tutor-lane.js";
import { C, displayText, monoText, stickerColor, uiText } from "./theme.js";

export function paintBackdrop(scene) {
  const v = getView(scene);
  const g = scene.add.graphics();
  g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBot, C.skyBot, 1);
  g.fillRect(0, 0, v.w, v.h);

  const dots = [0x3b2a2e, 0xff7a85, 0xffc43d, 0x3dcec0, 0x5eb3ff, 0xc084fc];
  const n = v.portrait ? 56 : 42;
  for (let i = 0; i < n; i += 1) {
    const x = 28 + ((i * 97) % Math.max(40, v.w - 56));
    const y = 24 + ((i * 61) % Math.max(40, v.h - 48));
    g.fillStyle(dots[i % dots.length], 0.07 + (i % 5) * 0.012);
    g.fillCircle(x, y, 2 + (i % 3));
  }
}

export function addHeader(scene, { level, total, title, shell }) {
  const page = shell ?? makeShell(scene);
  const { v, header, twoRow } = page;
  const muteSize = page.hudReserve ?? hudReservePx(v);
  const badgeW = clamp(Math.round(64 * v.uiScale), 56, 70);
  const badgeH = clamp(Math.round(44 * v.uiScale), 38, 48);
  const row1Y = twoRow ? header.top + badgeH / 2 + 4 : header.cy;
  const row2Y = twoRow ? header.bottom - 22 : header.cy;

  const badge = scene.add.container(header.left + badgeW / 2, row1Y);
  const g = scene.add.graphics();
  drawSticker(g, -badgeW / 2, -badgeH / 2, badgeW, badgeH, 16, C.coral);
  badge.add(g);
  badge.add(scene.add.text(0, -2, `${level}/${total}`, displayText(twoRow ? 18 : 20)).setOrigin(0.5));

  const titleLeft = twoRow ? header.left : header.left + badgeW + 10;
  const titleMax = header.right - muteSize - 16 - titleLeft;
  const titleSize = fitFontSize(title, titleMax, v.compact ? 22 : 32, 16);
  const titleText = scene.add
    .text(titleLeft, row2Y, title, displayText(titleSize))
    .setOrigin(0, 0.5);

  const starGap = twoRow ? 22 : 26;
  const starsW = Math.max(0, total - 1) * starGap + 16;
  let dotsX = titleLeft + titleText.width + 26;
  const muteLeft = header.right - muteSize;
  let dotsY = row2Y;
  if (dotsX + starsW > muteLeft - 8) {
    if (twoRow) {
      dotsX = header.left + badgeW + 28;
      dotsY = row1Y;
      if (dotsX + starsW > muteLeft - 8) dotsX = -1;
    } else {
      dotsX = -1;
    }
  }
  if (dotsX > 0) {
    const dots = scene.add.container(dotsX, dotsY);
    for (let i = 0; i < total; i += 1) {
      const on = i + 1 === level;
      const key = on && scene.textures.exists("deco-star") ? "deco-star" : null;
      if (key) {
        dots.add(
          scene.add.image(i * starGap, 0, key).setScale(textureScale(on ? 0.42 : 0.3)).setAlpha(on ? 1 : 0.35),
        );
      } else {
        dots.add(scene.add.star(i * starGap, 0, 5, on ? 7 : 5, on ? 14 : 10, on ? C.gold : 0xf3d9a2));
      }
    }
  }
}

function fitFontSize(text, maxWidth, preferred, min) {
  const approx = text.length * preferred * 0.62;
  if (approx <= maxWidth) return preferred;
  return clamp(Math.floor(preferred * (maxWidth / Math.max(1, approx))), min, preferred);
}

export function addChrome(scene, { level, total, title, shell }) {
  const page = shell ?? makeShell(scene);
  addHeader(scene, { level, total, title, shell: page });
  const mute = addMuteToggle(scene, page);
  return { shell: page, mute };
}

export function addBeat(scene, { title, caption }) {
  const v = getView(scene);
  const wrap = scene.add.container(v.cx, v.padTop + 92);
  const titleText = scene.add.text(0, -16, title, displayText(28)).setOrigin(0.5);
  const cap = scene.add.text(0, 18, caption, uiText(18, { color: C.muted })).setOrigin(0.5);
  wrap.add([titleText, cap]);
  wrap.setData("title", titleText);
  wrap.setData("caption", cap);
  return wrap;
}

export function setBeat(beat, { title, caption }) {
  const titleText = beat.getData("title");
  const cap = beat.getData("caption");
  if (title) titleText.setText(title);
  if (caption !== undefined) cap.setText(caption);
  titleText.setAlpha(0);
  cap.setAlpha(0);
  beat.scene.tweens.add({ targets: [titleText, cap], alpha: 1, duration: 180 });
}

export function createButton(scene, x, y, label, onClick, opts = {}) {
  const caption = opts.caption ?? "";
  const w = Math.max(opts.minWidth ?? 160, opts.width ?? 240);
  const h = Math.max(TAP_MIN, opts.height ?? (caption ? 76 : 68));
  const fill = opts.fill ?? C.coral;
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (hover) => {
    bg.clear();
    drawSticker(bg, -w / 2, -h / 2, w, h, 22, hover ? 0xff9aa2 : fill, { shadow: true });
  };
  draw(false);
  container.setData("width", w);
  container.setData("height", h);
  container.setData("shadow", true);

  const text = scene.add
    .text(0, caption ? -12 : -2, label, displayText(opts.fontSize ?? scaled(scene, 26), { color: opts.textColor ?? C.text }))
    .setOrigin(0.5);
  const cap = caption
    ? scene.add
        .text(0, 16, caption, uiText(opts.captionSize ?? 14, { color: opts.captionColor ?? C.muted }))
        .setOrigin(0.5)
    : null;

  container.add(cap ? [bg, text, cap] : [bg, text]);
  container.setSize(w, h);
  container.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  container.input.cursor = "pointer";

  container.on("pointerover", () => {
    draw(true);
    scene.tweens.add({ targets: container, scale: 1.06, duration: 120, ease: "Back.Out" });
  });
  container.on("pointerout", () => {
    draw(false);
    scene.tweens.add({ targets: container, scale: 1, duration: 120 });
  });
  container.on("pointerdown", (pointer, _lx, _ly, event) => {
    event?.stopPropagation?.();
    unlockAudio(scene);
    playSfx(scene, "sfx-tap", 0.28);
    onClick();
    scene.tweens.add({ targets: container, scale: 0.94, duration: 80, yoyo: true });
  });

  container.setLabel = (next) => text.setText(next);
  container.setCaption = (next) => {
    if (cap) cap.setText(next ?? "");
  };
  container.setEnabled = (enabled) => {
    container.setAlpha(enabled ? 1 : 0.45);
    if (enabled) container.setInteractive();
    else container.disableInteractive();
  };
  return container;
}

export function addFooterCta(scene, { shell, label, caption = "点一下", onClick, fill, width, height } = {}) {
  const page = shell ?? makeShell(scene);
  const { v, footer } = page;
  const btnH = height ?? clamp(footer.h - 20, TAP_MIN, caption ? 80 : 70);
  const btnW = width ?? Math.min(v.portrait ? footer.w - 8 : 280, 320);
  const btn = createButton(scene, footer.cx, footer.cy, label, onClick, {
    width: btnW,
    height: btnH,
    caption,
    fill,
  });
  btn.setDepth(20);
  return btn;
}

export function makeCharTile(scene, x, y, glyph, { width = 64, height = 64, seed = glyph } = {}) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  const fill = stickerColor(seed);
  drawSticker(g, -width / 2, -height / 2, width, height, Math.min(16, width * 0.28), fill);
  const font = Math.max(12, Math.min(Math.round(width * 0.42), Math.round(height * 0.42)));
  const t = scene.add.text(0, -1, glyph, monoText(font, { fontStyle: "700" })).setOrigin(0.5);
  box.add([g, t]);
  box.setSize(width, height);
  box.setData("graphics", g);
  box.setData("label", t);
  box.setData("kind", "tile");
  box.setData("width", width);
  box.setData("height", height);
  box.setData("shadow", true);
  box.setData("fill", fill);
  return box;
}

export function setTileActive(tile, on) {
  const g = tile.getData("graphics");
  const width = tile.getData("width");
  const height = tile.getData("height");
  const fill = tile.getData("fill");
  g.clear();
  drawSticker(g, -width / 2, -height / 2, width, height, Math.min(16, width * 0.28), on ? C.gold : fill, {
    lineWidth: on ? 5 : 4,
  });
}

export function makeChip(scene, x, y, { glyph, id, accent = C.blue, width = 62, height = 82 } = {}) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  const stripeH = Math.max(6, Math.min(12, Math.round(height * 0.16)));
  paintBadge(g, width, height, accent, false, { stripeH });
  let glyphSize = Math.min(22, Math.max(MIN_ID_FONT, Math.round(width * 0.42)));
  let idSize = Math.min(16, Math.max(MIN_ID_FONT, Math.round(width * 0.32)));
  if (height < 52) {
    glyphSize = MIN_ID_FONT;
    idSize = MIN_ID_FONT;
  }
  const ch = scene.add.text(0, 0, glyph, monoText(glyphSize, { fontStyle: "700" })).setOrigin(0.5);
  const idText = scene.add.text(0, 0, String(id), monoText(idSize, { fontStyle: "700" })).setOrigin(0.5);
  const room = height - stripeH - 4;
  let guard = 0;
  while (ch.height + idText.height + 2 > room + 0.5 && guard < 16) {
    if (glyphSize > idSize && glyphSize > MIN_ID_FONT) glyphSize -= 1;
    else if (idSize > MIN_ID_FONT) idSize -= 1;
    else break;
    ch.setFontSize(glyphSize);
    idText.setFontSize(idSize);
    guard += 1;
  }
  const textOk = layoutChipText(ch, idText, height, stripeH) && idSize >= MIN_ID_FONT;
  const parts = [g, ch, idText];
  if (height >= 56) {
    const clipH = Math.max(6, height * 0.1);
    const clipY = -height / 2 + clipH / 2 + 3;
    const glyphTop = ch.y - ch.height / 2;
    if (glyphTop >= clipY + clipH / 2 + 2) {
      const clipW = Math.max(10, width * 0.26);
      parts.splice(
        1,
        0,
        scene.add
          .rectangle(0, clipY, clipW, clipH, accent)
          .setStrokeStyle(Math.max(2, Math.min(4, width * 0.06)), C.stroke),
      );
    }
  }
  box.add(parts);
  box.setSize(width, height);
  box.setData("graphics", g);
  box.setData("accent", accent);
  box.setData("kind", "chip");
  box.setData("width", width);
  box.setData("height", height);
  box.setData("shadow", true);
  box.setData("stripeH", stripeH);
  box.setData("idFont", idSize);
  box.setData("textOk", textOk);
  return box;
}

function layoutChipText(ch, idText, height, stripeH) {
  const regionTop = -height / 2 + 2;
  const regionBot = height / 2 - stripeH - 2;
  const gap = 2;
  const block = ch.height + gap + idText.height;
  const room = regionBot - regionTop;
  const y0 = regionTop + Math.max(0, (room - block) / 2);
  ch.setY(y0 + ch.height / 2);
  idText.setY(y0 + ch.height + gap + idText.height / 2);
  const glyphTop = ch.y - ch.height / 2;
  const glyphBottom = ch.y + ch.height / 2;
  const idTop = idText.y - idText.height / 2;
  const idBottom = idText.y + idText.height / 2;
  return glyphTop >= regionTop - 0.5 && idTop >= glyphBottom - 0.25 && idBottom <= regionBot + 0.5;
}

/** Mark a Phaser text as a caption so the layout probe can measure it. */
export function markCaption(text) {
  text.setData("kind", "caption");
  text.setData("shadow", false);
  return text;
}

export function pulseChip(scene, chip) {
  scene.tweens.add({
    targets: chip,
    scale: 1.16,
    duration: 150,
    yoyo: true,
    ease: "Back.Out",
  });
}

export function highlightChip(scene, chip, on = true) {
  const g = chip.getData("graphics");
  const accent = chip.getData("accent");
  const width = chip.getData("width");
  const height = chip.getData("height");
  g.clear();
  paintBadge(g, width, height, on ? C.gold : accent, on, { stripeH: chip.getData("stripeH") });
}

export function makeFactChip(scene, x, y, { value, label, tip, note, accent = C.gold, width = 200, height = 96 }) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 22, C.surface);
  const stripe = scene.add.graphics();
  stripe.fillStyle(accent, 1);
  stripe.fillRoundedRect(-width / 2 + 8, -height / 2 + 8, 14, height - 16, 8);
  const valueText = scene.add
    .text(10, -height * 0.16, value, displayText(Math.max(18, Math.round(height * 0.3))))
    .setOrigin(0.5);
  const labelText = scene.add
    .text(10, height * 0.24, label, uiText(Math.max(13, Math.round(height * 0.18)), { color: C.muted }))
    .setOrigin(0.5);
  const hint = note
    ? scene.add
        .text(width / 2 - 16, -height / 2 + 12, "?", uiText(13, { color: C.muted }))
        .setOrigin(0.5)
    : null;
  box.add(hint ? [g, stripe, valueText, labelText, hint] : [g, stripe, valueText, labelText]);
  box.setSize(width, height);
  box.setData("kind", "label");
  box.setData("width", width);
  box.setData("height", height);
  box.setData("shadow", true);
  box.setData("valueText", valueText);
  box.setValue = (next) => valueText.setText(next);
  box.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
  box.input.cursor = "pointer";
  box.on("pointerdown", (pointer, _lx, _ly, event) => {
    event?.stopPropagation?.();
    if (note) {
      openNote(note);
      return;
    }
    showTooltip(scene, box.x, box.y - height / 2 - 18, tip || value);
  });
  return box;
}

export function showTooltip(scene, x, y, text) {
  if (scene._tip) {
    scene.tweens.killTweensOf(scene._tip);
    scene._tip.destroy();
  }
  const tip = scene.add.container(x, y);
  const label = scene.add.text(0, 0, text, uiText(16, { align: "center", wordWrap: { width: 280 } })).setOrigin(0.5);
  const w = Math.max(80, label.width + 28);
  const h = Math.max(36, label.height + 16);
  const g = scene.add.graphics();
  g.fillStyle(C.stroke, 0.9);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  label.setColor("#fff8ee");
  tip.add([g, label]);
  tip.setDepth(40);
  tip.setAlpha(0);
  scene._tip = tip;
  scene.tweens.add({
    targets: tip,
    alpha: 1,
    y: y - 8,
    duration: 180,
    hold: 1600,
    yoyo: true,
    onComplete: () => {
      tip.destroy();
      if (scene._tip === tip) scene._tip = null;
    },
  });
}

export function makeWindowFrame(scene, x, y, width, height, color = C.blue) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  const sw = width < 420 ? 5 : 8;
  const inner = width < 420 ? 4 : 6;
  const radius = width < 420 ? 14 : 22;
  const paint = (fill) => {
    g.clear();
    g.fillStyle(C.stroke, 0.12);
    g.fillRoundedRect(-width / 2 + 4, -height / 2 + 6, width, height, radius);
    g.lineStyle(sw, C.stroke, 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
    g.lineStyle(inner, fill, 1);
    g.strokeRoundedRect(-width / 2 + inner, -height / 2 + inner, width - inner * 2, height - inner * 2, radius - 6);
    g.fillStyle(fill, 0.14);
    g.fillRoundedRect(-width / 2 + inner, -height / 2 + inner, width - inner * 2, height - inner * 2, radius - 6);
    const dots = [C.coral, C.gold, C.teal];
    const dotR = width < 420 ? 5 : 8;
    dots.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.lineStyle(3, C.stroke, 1);
      g.fillCircle(-width / 2 + 16 + i * 14, -height / 2, dotR);
      g.strokeCircle(-width / 2 + 16 + i * 14, -height / 2, dotR);
    });
  };
  paint(color);
  box.add(g);
  box.setSize(width, height);
  box.recolor = paint;
  return box;
}

export function makeArrow(scene, x, y, { angle = 90, color = C.coral, label = "" } = {}) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.lineStyle(5, C.stroke, 1);
  g.fillRoundedRect(-8, -22, 16, 28, 8);
  g.strokeRoundedRect(-8, -22, 16, 28, 8);
  g.fillTriangle(-18, 8, 18, 8, 0, 28);
  g.strokeTriangle(-18, 8, 18, 8, 0, 28);
  box.add(g);
  if (label) {
    box.add(scene.add.text(28, 0, label, displayText(18)).setOrigin(0, 0.5));
  }
  box.setAngle(angle - 90);
  scene.tweens.add({
    targets: box,
    y: y + 6,
    duration: 500,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  return box;
}

export function makePairBoard(scene, x, y, dims = {}) {
  const v = getView(scene);
  const width = dims.width ?? Math.min(420, v.innerW - 16);
  const height = dims.height ?? Math.max(88, Math.min(116, width * 0.28));
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 24, C.surface);
  const from = scene.add.text(-width * 0.28, -8, "", monoText(Math.max(22, width * 0.1), { fontStyle: "700" })).setOrigin(0.5);
  const arrow = scene.add.text(0, -8, "→", displayText(Math.max(24, width * 0.1), { color: C.coralCss })).setOrigin(0.5);
  const to = scene.add.text(width * 0.28, -8, "", monoText(Math.max(22, width * 0.1), { fontStyle: "700" })).setOrigin(0.5);
  const sub = scene.add.text(0, height * 0.28, "", uiText(15, { color: C.muted })).setOrigin(0.5);
  box.add([g, from, arrow, to, sub]);
  box.setAlpha(0);
  box.show = (left, right, note) => {
    from.setText(left);
    to.setText(right);
    sub.setText(note);
    box.setAlpha(1);
    box.setScale(0.86);
    scene.tweens.add({ targets: box, scale: 1, duration: 200, ease: "Back.Out" });
  };
  box.hide = () => scene.tweens.add({ targets: box, alpha: 0, duration: 160 });
  return box;
}

export function burstStars(scene, x, y) {
  const colors = [C.gold, C.coral, C.teal, C.blue, C.pink];
  for (let i = 0; i < 7; i += 1) {
    const star = scene.textures.exists("deco-sparkle")
      ? scene.add.image(x, y, "deco-sparkle").setScale(textureScale(0.45))
      : scene.add.star(x, y, 4, 3, 8, colors[i % colors.length]);
    const a = (Math.PI * 2 * i) / 7;
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(a) * 46,
      y: y + Math.sin(a) * 46,
      alpha: 0,
      scale: 0.1,
      duration: 420,
      onComplete: () => star.destroy(),
    });
  }
}

export function spawnConfetti(scene) {
  const v = getView(scene);
  const colors = [C.coral, C.gold, C.teal, C.blue, C.violet, C.pink];
  for (let i = 0; i < 26; i += 1) {
    const bit = scene.add.rectangle(
      50 + Math.random() * Math.max(40, v.w - 100),
      -30 - Math.random() * 120,
      12,
      18,
      colors[i % colors.length],
    );
    bit.setStrokeStyle(3, C.stroke);
    bit.setAngle(Math.random() * 360);
    scene.tweens.add({
      targets: bit,
      y: v.h + 40,
      angle: bit.angle + 240,
      duration: 2400 + Math.random() * 1400,
      delay: Math.random() * 600,
      repeat: -1,
    });
  }
}

export function makeTag(scene, x, y, text, accent = C.blue, opts = {}) {
  const tag = scene.add.container(x, y);
  const label = scene.add.text(0, 0, text, displayText(14)).setOrigin(0.5);
  const w = label.width + (opts.note ? 28 : 20);
  const h = 26;
  const g = scene.add.graphics();
  drawSticker(g, -w / 2, -h / 2, w, h, 10, accent, { lineWidth: 4, shadow: false });
  tag.add([g, label]);
  tag.setData("kind", "label");
  tag.setData("width", w);
  tag.setData("height", h);
  tag.setData("shadow", false);
  if (opts.note) {
    tag.add(scene.add.text(w / 2 - 9, 0, "?", uiText(12, { color: C.text })).setOrigin(0.5));
    tag.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    tag.input.cursor = "pointer";
    tag.on("pointerdown", (pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
      openNote(opts.note);
    });
  }
  tag.setSize(w, h);
  return tag;
}

/** Label sits above a row, never on top of the first tile. */
export function addSectionTag(scene, text, accent, { left, top, note } = {}) {
  const tag = makeTag(scene, 0, 0, text, accent, { note });
  tag.setPosition(left + tag.width / 2, top + tag.height / 2);
  return tag;
}

export function makePanel(scene, x, y, width, height) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 24, C.surface);
  box.add(g);
  return box;
}

export function addMuteToggle(scene) {
  applyMute(scene.game, readMuted());
}

export function bindAdvance(scene, advance) {
  const tryAdvance = () => {
    if (!document.getElementById("notes-overlay")?.hidden) return;
    if (!document.getElementById("lesson-book-overlay")?.hidden) return;
    unlockAudio(scene);
    if (scene.busy) return;
    playSfx(scene, "sfx-tap", 0.2);
    advance();
  };

  scene.input.on("pointerdown", (pointer, currentlyOver) => {
    if (currentlyOver?.length) return;
    const view = getView(scene);
    const pt = pointerToCss(scene, pointer);
    const clientX = pointer.event?.clientX;
    const clientY = pointer.event?.clientY;
    if (window.__nanoGPTTutorContains?.(clientX, clientY)) return;
    if (
      document.documentElement.classList.contains("is-pc") &&
      pt.y < view.padTop + 78 &&
      pt.x > tutorClickGuardLeft(view)
    ) {
      return;
    }
    tryAdvance();
  });

  scene.input.keyboard?.on("keydown-SPACE", tryAdvance);
  scene.input.keyboard?.on("keydown-ENTER", tryAdvance);
}

export function rowPositions(count, y, tile, gap, viewW = 1280) {
  const total = count * tile + (count - 1) * gap;
  const start = (viewW - total) / 2 + tile / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: start + i * (tile + gap),
    y,
  }));
}

export function drawSticker(g, x, y, w, h, r, fill, opts = {}) {
  const stroke = opts.stroke ?? C.stroke;
  const sw = opts.lineWidth ?? 6;
  if (opts.shadow !== false) {
    g.fillStyle(C.stroke, 0.2);
    g.fillRoundedRect(x + STICKER_SHADOW_X, y + STICKER_SHADOW_Y, w, h, r);
  }
  g.fillStyle(fill, 1);
  g.lineStyle(sw, stroke, 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.strokeRoundedRect(x, y, w, h, r);
}

function paintBadge(g, width, height, accent, on, opts = {}) {
  const radius = Math.max(6, Math.min(16, width * 0.24));
  const stripeH = opts.stripeH ?? Math.max(6, Math.min(12, Math.round(height * 0.16)));
  const lineWidth = on ? 4 : Math.max(2, Math.min(4, width * 0.08));
  drawSticker(g, -width / 2, -height / 2, width, height, radius, on ? 0xfff4c2 : C.surface, {
    lineWidth,
    shadow: true,
  });
  g.fillStyle(accent, 1);
  g.fillRoundedRect(-width / 2 + 4, height / 2 - stripeH - 3, width - 8, stripeH, Math.max(3, radius * 0.45));
}
