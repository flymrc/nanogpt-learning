import Phaser from "phaser";
import { applyMute, playSfx, readMuted, unlockAudio } from "../audio/sound.js";
import { TAP_MIN, getView, scaled } from "./layout.js";
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

export function addHeader(scene, { level, total, title }) {
  const v = getView(scene);
  const y = v.padTop + (v.short ? 28 : 36);
  const badge = scene.add.container(v.left + 38, y);
  const g = scene.add.graphics();
  drawSticker(g, -34, -24, 68, 48, 16, C.coral);
  badge.add(g);
  badge.add(scene.add.text(0, -2, `${level}/${total}`, displayText(20)).setOrigin(0.5));

  const titleSize = v.compact ? 22 : 34;
  const titleText = scene.add.text(v.left + 80, y, title, displayText(titleSize)).setOrigin(0, 0.5);

  const muteReserve = TAP_MIN + 24;
  let dotsX = v.left + 80 + titleText.width + 56;
  if (dotsX > v.w - muteReserve - 8) {
    dotsX = v.left + 80 + 36;
  }
  const dots = scene.add.container(dotsX, y);
  for (let i = 0; i < total; i += 1) {
    const on = i + 1 === level;
    const key = on && scene.textures.exists("deco-star") ? "deco-star" : null;
    if (key) {
      dots.add(scene.add.image(i * 28, 0, key).setScale(on ? 0.48 : 0.32).setAlpha(on ? 1 : 0.35));
    } else {
      dots.add(scene.add.star(i * 28, 0, 5, on ? 8 : 6, on ? 16 : 12, on ? C.gold : 0xf3d9a2));
    }
  }
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
  const w = Math.max(opts.minWidth ?? 160, opts.width ?? 240);
  const h = Math.max(TAP_MIN, opts.height ?? 68);
  const fill = opts.fill ?? C.coral;
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (hover) => {
    bg.clear();
    drawSticker(bg, -w / 2, -h / 2, w, h, 22, hover ? 0xff9aa2 : fill, { shadow: true });
  };
  draw(false);

  const text = scene.add
    .text(0, -2, label, displayText(opts.fontSize ?? scaled(scene, 26), { color: opts.textColor ?? C.text }))
    .setOrigin(0.5);

  container.add([bg, text]);
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
  container.setEnabled = (enabled) => {
    container.setAlpha(enabled ? 1 : 0.45);
    if (enabled) container.setInteractive();
    else container.disableInteractive();
  };
  return container;
}

export function addAdvanceHint(scene, text = "点一下") {
  const v = getView(scene);
  const hint = scene.add
    .text(v.cx, v.bottom - 8, text, uiText(15, { color: C.muted }))
    .setOrigin(0.5);
  scene.tweens.add({
    targets: hint,
    y: v.bottom - 16,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  return hint;
}

export function makeCharTile(scene, x, y, glyph, { width = 64, height = 64, seed = glyph } = {}) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  const fill = stickerColor(seed);
  drawSticker(g, -width / 2, -height / 2, width, height, 16, fill);
  const t = scene.add
    .text(0, -2, glyph, monoText(Math.max(12, Math.round(width * 0.42)), { fontStyle: "700" }))
    .setOrigin(0.5);
  box.add([g, t]);
  box.setSize(width, height);
  box.setData("graphics", g);
  box.setData("label", t);
  box.setData("width", width);
  box.setData("height", height);
  box.setData("fill", fill);
  return box;
}

export function setTileActive(tile, on) {
  const g = tile.getData("graphics");
  const width = tile.getData("width");
  const height = tile.getData("height");
  const fill = tile.getData("fill");
  g.clear();
  drawSticker(g, -width / 2, -height / 2, width, height, 16, on ? C.gold : fill, {
    lineWidth: on ? 7 : 5,
  });
  tile.scene.tweens.add({
    targets: tile,
    scale: on ? 1.12 : 1,
    duration: 140,
    ease: "Back.Out",
  });
}

export function makeChip(scene, x, y, { glyph, id, accent = C.blue, width = 62, height = 82 } = {}) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  paintBadge(g, width, height, accent, false);
  const clipW = Math.max(10, width * 0.26);
  const clip = scene.add
    .rectangle(0, -height / 2 + Math.max(5, height * 0.08), clipW, Math.max(7, height * 0.12), accent)
    .setStrokeStyle(Math.max(2, width * 0.06), C.stroke);
  const ch = scene.add
    .text(0, -height * 0.12, glyph, monoText(Math.max(11, Math.round(width * 0.4)), { fontStyle: "700" }))
    .setOrigin(0.5);
  const idText = scene.add
    .text(0, height * 0.26, String(id), monoText(Math.max(9, Math.round(width * 0.28)), { fontStyle: "700" }))
    .setOrigin(0.5);
  box.add([g, clip, ch, idText]);
  box.setSize(width, height);
  box.setData("graphics", g);
  box.setData("accent", accent);
  box.setData("width", width);
  box.setData("height", height);
  return box;
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
  paintBadge(g, width, height, on ? C.gold : accent, on);
  scene.tweens.add({
    targets: chip,
    scale: on ? 1.1 : 1,
    duration: 140,
    ease: "Back.Out",
  });
}

export function makeFactChip(scene, x, y, { value, label, tip, accent = C.gold, width = 200, height = 96 }) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 22, C.surface);
  const stripe = scene.add.graphics();
  stripe.fillStyle(accent, 1);
  stripe.fillRoundedRect(-width / 2 + 8, -height / 2 + 8, 14, height - 16, 8);
  const valueText = scene.add
    .text(10, -height * 0.16, value, displayText(Math.max(16, Math.round(height * 0.3))))
    .setOrigin(0.5);
  const labelText = scene.add
    .text(10, height * 0.24, label, uiText(Math.max(12, Math.round(height * 0.18)), { color: C.muted }))
    .setOrigin(0.5);
  box.add([g, stripe, valueText, labelText]);
  box.setSize(width, height);
  box.setData("valueText", valueText);
  box.setValue = (next) => valueText.setText(next);
  box.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
  box.input.cursor = "pointer";
  box.on("pointerdown", (pointer, _lx, _ly, event) => {
    event?.stopPropagation?.();
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

export function makePairBoard(scene, x, y) {
  const v = getView(scene);
  const width = Math.min(420, v.innerW - 16);
  const height = Math.max(88, Math.min(116, width * 0.28));
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
      ? scene.add.image(x, y, "deco-sparkle").setScale(0.45)
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

export function makeTag(scene, x, y, text, accent = C.blue) {
  const tag = scene.add.container(x, y);
  const label = scene.add.text(0, 0, text, displayText(16)).setOrigin(0.5);
  const w = label.width + 24;
  const h = 32;
  const g = scene.add.graphics();
  drawSticker(g, -w / 2, -h / 2, w, h, 12, accent, { lineWidth: 4, shadow: false });
  tag.add([g, label]);
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

  const v = getView(scene);
  const size = Math.max(TAP_MIN, Math.min(64, Math.round(56 * v.uiScale)));
  const box = scene.add.container(v.w - v.padRight - size / 2 - 2, v.padTop + size / 2 + 2);
  const bg = scene.add.graphics();
  const icon = scene.add.graphics();

  const paint = () => {
    bg.clear();
    drawSticker(bg, -size / 2, -size / 2, size, size, 20, scene.game.sound.mute ? 0xffd0d4 : C.cream);
    paintSpeaker(icon, scene.game.sound.mute);
  };
  paint();

  box.add([bg, icon]);
  box.setSize(size, size);
  box.setDepth(60);
  box.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size), Phaser.Geom.Rectangle.Contains);
  box.input.cursor = "pointer";

  box.on("pointerover", () => {
    scene.tweens.add({ targets: box, scale: 1.08, duration: 120, ease: "Back.Out" });
  });
  box.on("pointerout", () => {
    scene.tweens.add({ targets: box, scale: 1, duration: 120 });
  });
  box.on("pointerdown", (_pointer, _lx, _ly, event) => {
    event?.stopPropagation?.();
    const locked = !scene.game.registry.get("audioUnlocked");
    if (locked) {
      applyMute(scene.game, false);
    } else {
      applyMute(scene.game, !scene.game.sound.mute);
    }
    unlockAudio(scene);
    paint();
    if (!scene.game.sound.mute) playSfx(scene, "sfx-tap", 0.28);
    scene.tweens.add({ targets: box, scale: 0.92, duration: 80, yoyo: true });
  });

  if (!scene.game.registry.get("audioUnlocked")) {
    const pulse = scene.tweens.add({
      targets: box,
      scale: 1.1,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    const onUnlock = (_parent, _key, value) => {
      if (!value) return;
      pulse.stop();
      box.setScale(1);
    };
    scene.game.registry.events.on("changedata-audioUnlocked", onUnlock);
    scene.events.once("shutdown", () => {
      scene.game.registry.events.off("changedata-audioUnlocked", onUnlock);
    });
  }

  return box;
}

function paintSpeaker(g, muted) {
  g.clear();
  g.fillStyle(C.stroke, 1);
  g.lineStyle(4, C.stroke, 1);
  g.fillRoundedRect(-16, -6, 10, 12, 3);
  g.fillTriangle(-8, -11, -8, 11, 6, 16);
  g.fillTriangle(-8, -11, -8, 11, 6, -16);
  g.fillTriangle(-8, -11, -8, 11, 6, 0);
  if (muted) {
    g.lineStyle(7, C.stroke, 1);
    g.lineBetween(-20, 18, 20, -18);
    g.lineStyle(4, C.coral, 1);
    g.lineBetween(-20, 18, 20, -18);
    return;
  }
  g.beginPath();
  g.arc(8, 0, 8, -0.7, 0.7);
  g.strokePath();
  g.beginPath();
  g.arc(8, 0, 14, -0.65, 0.65);
  g.strokePath();
}

export function bindAdvance(scene, advance) {
  const tryAdvance = () => {
    unlockAudio(scene);
    if (scene.busy) return;
    playSfx(scene, "sfx-tap", 0.2);
    advance();
  };

  scene.input.on("pointerdown", (pointer, currentlyOver) => {
    if (currentlyOver?.length) return;
    const view = getView(scene);
    if (pointer.x > view.w - 96 && pointer.y < view.padTop + 88) return;
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
    g.fillRoundedRect(x + 5, y + 8, w, h, r);
  }
  g.fillStyle(fill, 1);
  g.lineStyle(sw, stroke, 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.strokeRoundedRect(x, y, w, h, r);
}

function paintBadge(g, width, height, accent, on) {
  const radius = Math.max(8, Math.min(16, width * 0.26));
  const stripeH = Math.max(12, height * 0.28);
  drawSticker(g, -width / 2, -height / 2, width, height, radius, on ? 0xfff4c2 : C.surface, {
    lineWidth: on ? 6 : Math.max(3, width * 0.08),
  });
  g.fillStyle(accent, 1);
  g.fillRoundedRect(-width / 2 + 4, height / 2 - stripeH - 3, width - 8, stripeH, Math.max(4, radius * 0.5));
}
