import Phaser from "phaser";
import { C, FONT_MONO, FONT_UI, H, W, monoText, uiText } from "./theme.js";

export function paintBackdrop(scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x0c1220, 0x0c1220, 0x152033, 0x101828, 1);
  g.fillRect(0, 0, W, H);

  g.lineStyle(1, 0x1c2a40, 0.45);
  for (let x = 40; x < W; x += 40) {
    g.lineBetween(x, 0, x, H);
  }
  for (let y = 40; y < H; y += 40) {
    g.lineBetween(0, y, W, y);
  }

  g.fillStyle(0x3ecfc4, 0.05);
  g.fillCircle(180, 80, 220);
  g.fillStyle(0xf0c14b, 0.04);
  g.fillCircle(1100, 640, 260);
}

export function addHeader(scene, { level, total, title }) {
  scene.add
    .text(48, 28, `第 ${level}/${total} 关`, uiText(18, { color: C.tealCss }))
    .setOrigin(0, 0.5);

  scene.add.text(48, 54, title, uiText(28, { fontStyle: "700" })).setOrigin(0, 0.5);

  const dots = scene.add.container(W - 56, 40);
  for (let i = 0; i < total; i += 1) {
    const dot = scene.add.circle(i * -22, 0, 6, i + 1 === level ? C.teal : 0x3a4a66);
    dots.add(dot);
  }

  scene.add
    .text(W - 48, 62, "nanoGPT · shakespeare_char", uiText(14, { color: C.muted }))
    .setOrigin(1, 0.5);
}

export function addCaption(scene, text) {
  const panel = scene.add.container(W / 2, 108);
  const g = scene.add.graphics();
  g.fillStyle(C.surface, 0.94);
  g.lineStyle(2, C.stroke, 0.9);
  g.fillRoundedRect(-560, -36, 1120, 72, 14);
  g.strokeRoundedRect(-560, -36, 1120, 72, 14);
  const label = scene.add
    .text(0, 0, text, uiText(20, { align: "center", wordWrap: { width: 1040 } }))
    .setOrigin(0.5);
  panel.add([g, label]);
  panel.setData("label", label);
  return panel;
}

export function setCaption(panel, text) {
  const label = panel.getData("label");
  label.setText(text);
  label.setAlpha(0);
  panel.scene.tweens.add({
    targets: label,
    alpha: 1,
    duration: 220,
    ease: "Quad.Out",
  });
}

export function createButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width ?? 220;
  const h = opts.height ?? 54;
  const fill = opts.fill ?? C.teal;
  const textColor = opts.textColor ?? C.textDark;
  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (hover) => {
    bg.clear();
    bg.fillStyle(hover ? 0x62ddd4 : fill, opts.alpha ?? 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.lineStyle(2, 0xffffff, hover ? 0.28 : 0.12);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  };
  draw(false);

  const text = scene.add
    .text(0, 0, label, uiText(opts.fontSize ?? 22, { color: textColor, fontStyle: "700" }))
    .setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(w, h);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
    Phaser.Geom.Rectangle.Contains,
  );
  container.input.cursor = "pointer";

  container.on("pointerover", () => {
    draw(true);
    scene.tweens.add({ targets: container, scale: 1.04, duration: 140, ease: "Quad.Out" });
  });
  container.on("pointerout", () => {
    draw(false);
    scene.tweens.add({ targets: container, scale: 1, duration: 140, ease: "Quad.Out" });
  });
  container.on("pointerdown", (pointer, _lx, _ly, event) => {
    event?.stopPropagation?.();
    scene.tweens.add({
      targets: container,
      scale: 0.97,
      duration: 80,
      yoyo: true,
      onComplete: () => onClick(),
    });
  });

  container.setLabel = (next) => text.setText(next);
  container.setEnabled = (enabled) => {
    container.setAlpha(enabled ? 1 : 0.45);
    if (enabled) container.setInteractive();
    else container.disableInteractive();
  };
  return container;
}

export function addAdvanceHint(scene, text = "点击空白处或按空格继续") {
  return scene.add
    .text(W / 2, H - 28, text, uiText(16, { color: C.muted }))
    .setOrigin(0.5);
}

export function makeChip(scene, x, y, { glyph, id, accent = C.blue, width = 64, height = 78 }) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(C.surface2, 1);
  g.lineStyle(2, accent, 0.95);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

  const ch = scene.add
    .text(0, -12, glyph, monoText(22, { fontStyle: "700" }))
    .setOrigin(0.5);
  const idText = scene.add
    .text(0, 18, String(id), monoText(16, { color: C.goldCss }))
    .setOrigin(0.5);

  box.add([g, ch, idText]);
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
    scale: 1.12,
    duration: 160,
    yoyo: true,
    ease: "Quad.Out",
  });
}

export function highlightChip(scene, chip, on = true) {
  const g = chip.getData("graphics");
  const accent = chip.getData("accent");
  const width = chip.getData("width");
  const height = chip.getData("height");
  g.clear();
  g.fillStyle(on ? 0x2c3d58 : C.surface2, 1);
  g.lineStyle(on ? 3 : 2, on ? C.gold : accent, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
}

export function makeCharTile(scene, x, y, glyph, { width = 62, height = 62 } = {}) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(C.surface, 1);
  g.lineStyle(2, C.stroke, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
  const t = scene.add.text(0, 0, glyph, monoText(24, { fontStyle: "700" })).setOrigin(0.5);
  box.add([g, t]);
  box.setSize(width, height);
  box.setData("graphics", g);
  box.setData("label", t);
  box.setData("width", width);
  box.setData("height", height);
  return box;
}

export function setTileActive(tile, on) {
  const g = tile.getData("graphics");
  const width = tile.getData("width");
  const height = tile.getData("height");
  g.clear();
  g.fillStyle(on ? 0x2a3f3c : C.surface, 1);
  g.lineStyle(on ? 3 : 2, on ? C.teal : C.stroke, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
}

export function makePanel(scene, x, y, width, height) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(C.surface, 0.97);
  g.lineStyle(2, C.stroke, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
  box.add(g);
  return box;
}

export function bindAdvance(scene, advance) {
  const tryAdvance = () => {
    if (scene.busy) return;
    advance();
  };

  scene.input.on("pointerdown", (_pointer, currentlyOver) => {
    if (currentlyOver?.length) return;
    tryAdvance();
  });

  scene.input.keyboard?.on("keydown-SPACE", tryAdvance);
  scene.input.keyboard?.on("keydown-ENTER", tryAdvance);
}

export function rowPositions(count, y, tile, gap) {
  const total = count * tile + (count - 1) * gap;
  const start = (W - total) / 2 + tile / 2;
  return Array.from({ length: count }, (_, i) => ({
    x: start + i * (tile + gap),
    y,
  }));
}
