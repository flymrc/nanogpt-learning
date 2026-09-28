import Phaser from "phaser";
import { narrateLine } from "../audio/narrate.js";
import { playSfx, unlockAudio } from "../audio/sound.js";
import { TUTORIALS } from "../data/tutorials.js";
import { t } from "../i18n/locale.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { addMuteToggle, clearPcHudStack, drawSticker, paintBackdrop, planLessonHeader } from "../ui/components.js";
import { installLayoutProbe } from "../ui/e2e.js";
import { STICKER_SHADOW_X, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { syncMobileChrome } from "../ui/mode.js";
import { syncHubChrome } from "../ui/chrome.js";
import { clearLessonRoute } from "../ui/route.js";
import { C, displayText, monoText, orphanLines, uiText, wrapAtBreaks } from "../ui/theme.js";

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super("Home");
  }

  create() {
    if (!this.game.registry.get("assetsReady")) {
      this.scene.start("Boot");
      return;
    }

    clearLessonRoute();
    syncHubChrome("Home");
    clearPcHudStack();
    const phone = !isWidePcTutor();
    const headerPlan = phone ? null : planLessonHeader(this, t("hub.title"));
    const shell = makeShell(this, phone ? { header: false, footer: false } : { twoRow: false, headerH: headerPlan.headerH, footer: false });
    const v = shell.v;
    paintBackdrop(this);
    if (phone) syncMobileChrome({ title: t("hub.title") });
    addMuteToggle(this);
    watchResize(this, { restart: true });

    narrateLine(this, t("hub.intro"), "beat");
    const voicePad = measureVoicePad();
    const titleProbe = fitBlock(this, t("hub.title"), v.innerW - 8, phone ? 96 : 80, phone ? 34 : 46, 20, hubDisplay);
    const introProbe = fitBlock(this, t("hub.intro"), v.innerW - 8, phone ? 72 : 56, phone ? 18 : 20, 13, (size) => hubUi(size, { color: C.muted }));
    const plan = layoutHub(v, shell.content.top, shell.content.bottom - voicePad, TUTORIALS.length, {
      titleH: titleProbe.height + 10,
      introH: introProbe.height + 6,
    });
    const titleFit = fitBlock(this, t("hub.title"), v.innerW - 8, Math.max(28, plan.slots.title.h - 2), plan.titleSize, 18, hubDisplay);
    const title = this.add
      .text(v.cx, plan.slots.title.cy, titleFit.body, hubDisplay(titleFit.size))
      .setOrigin(0.5);
    title.setName("chapter-title");
    title.setData("kind", "caption");
    title.setData("hubRole", "title");

    const introFit = fitBlock(
      this,
      t("hub.intro"),
      v.innerW - 8,
      Math.max(22, plan.slots.intro.h - 2),
      phone ? 18 : 20,
      13,
      (size) => hubUi(size, { color: C.muted }),
    );
    const intro = this.add
      .text(v.cx, plan.slots.intro.cy, introFit.body, hubUi(introFit.size, { color: C.muted }))
      .setOrigin(0.5);
    intro.setData("kind", "caption");
    intro.setData("hubRole", "sub");

    this.cards = [];
    const slot = plan.slots.cards;
    const cols = plan.cols;
    const rows = plan.rows;
    const rowW = cols * plan.cardW + (cols - 1) * plan.cardGap;
    TUTORIALS.forEach((spec, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = v.cx - rowW / 2 + plan.cardW / 2 + col * (plan.cardW + plan.cardGap);
      const y = slot.top + plan.cardH / 2 + row * (plan.cardH + plan.cardGap);
      this.cards.push(buildCard(this, spec, x, y, plan.cardW, plan.cardH, plan.scale));
    });

    this.pageId = "home";
    this.frame = { stage: { list: [] }, nextBtn: null };
    emitTutor({ id: "home", purpose: t("hub.intro"), caption: t("hub.title") });
    publishHub(this, this.cards);
    installLayoutProbe(this);
  }
}

function measureVoicePad() {
  const note = document.getElementById("voice-note");
  const canvas = document.querySelector("#game canvas");
  if (!note) return 36;
  const n = note.getBoundingClientRect();
  const c = canvas?.getBoundingClientRect();
  const cover = c ? Math.max(0, c.bottom - n.top) : n.height;
  return Math.ceil(Math.max(cover, n.height) + 18);
}

function hubDisplay(size, extra = {}) {
  return displayText(size, { lineSpacing: 2, ...extra });
}

function hubUi(size, extra = {}) {
  return uiText(size, { lineSpacing: 2, ...extra });
}

function layoutHub(v, top, bottom, count, blocks) {
  const cols = v.innerW >= 720 ? Math.min(2, Math.max(1, count)) : 1;
  const rows = Math.ceil(count / Math.max(1, cols));
  const gap = 16;
  const cardGap = 16;
  const available = Math.max(120, bottom - top);
  const measure = (s) => {
    const titleSize = Math.round(Math.min(92, (v.portrait ? 34 : 48) * s));
    const titleH = Math.max(32, Math.round(blocks.titleH * s));
    const introH = Math.max(22, Math.round(blocks.introH * s));
    const cardH = Math.round((v.portrait ? 172 : 210) * s);
    const cardsH = rows * cardH + (rows - 1) * cardGap;
    const items = [
      { id: "title", h: titleH },
      { id: "intro", h: introH },
      { id: "cards", h: cardsH },
    ];
    const raw = titleH + introH + cardsH + gap * 2;
    const rowBudget = Math.max(160, v.innerW - 8 - STICKER_SHADOW_X);
    const cardW = (rowBudget - cardGap * (cols - 1)) / cols;
    return { h: raw, items, gap, cardH, cardW, cardGap, cols, rows, titleSize };
  };
  const base = measure(1);
  // The lesson column can be nearly square on a wide screen (1160×1080) and
  // still have a short stack floating in the middle. Grow on that PC area.
  const roomy = v.w >= 700 && v.h >= 800 && base.h + 80 < available;
  const cap = roomy ? Math.min(2.45, (base.h + (available - base.h) * 0.9) / Math.max(1, base.h)) : 1;
  let chosen = null;
  for (let i = 0; i <= 48; i += 1) {
    const s = cap - ((cap - 0.58) * i) / 48;
    const plan = measure(s);
    if (plan.h <= available + 1) {
      chosen = { ...plan, scale: s };
      break;
    }
  }
  if (!chosen) chosen = { ...measure(0.58), scale: 0.58 };
  const stacked = stackSlots(chosen.items, {
    top,
    bottom,
    gap: chosen.gap,
    justify: "center",
  });
  return { ...chosen, slots: stacked.slots };
}

function fitLine(scene, str, maxW, size, min, styleFn) {
  const probe = scene.add.text(0, 0, str, styleFn(size)).setVisible(false);
  let current = size;
  while (probe.width > maxW && current > min) {
    current -= 1;
    probe.setFontSize(current);
  }
  probe.destroy();
  return current;
}

function fitBlock(scene, str, maxW, maxH, size, min, styleFn) {
  let current = size;
  let body = wrapAtBreaks(scene, str, current, maxW, styleFn);
  const probe = scene.add.text(0, 0, body, styleFn(current)).setVisible(false);
  const crowded = () => probe.width > maxW + 1 || probe.height > maxH || orphanLines(body).length > 0;
  while (crowded() && current > min) {
    current -= 1;
    body = wrapAtBreaks(scene, str, current, maxW, styleFn);
    probe.setStyle(styleFn(current));
    probe.setText(body);
  }
  const height = probe.height;
  probe.destroy();
  return { body, size: current, height };
}

function buildCard(scene, spec, x, y, w, h, scale = 1) {
  const enabled = spec.status === "ready";
  const card = scene.add.container(x, y);
  const plate = scene.add.graphics();
  drawSticker(plate, -w / 2, -h / 2, w, h, 22, enabled ? C.surface : 0xfff4e4, { shadow: true, lineWidth: 6 });
  card.add(plate);
  const stripe = scene.add.rectangle(-w / 2 + 12, 0, 8, Math.max(24, h - 36), enabled ? C.coral : C.gold).setOrigin(0.5);
  card.add(stripe);

  const pad = 12;
  const side = w >= 300 && h >= 148;
  const innerTop = -h / 2 + pad;
  const innerBottom = h / 2 - pad;
  const innerLeft = -w / 2 + 22;
  const innerRight = w / 2 - pad;
  const columnH = Math.max(48, innerBottom - innerTop);
  const columnW = Math.max(80, innerRight - innerLeft);
  const artH = side ? columnH : Math.round(Math.min(columnH * 0.46, 112));
  const artW = side ? Math.round(Math.min(artH * 0.98, columnW * 0.46, 168)) : columnW;
  const art = {
    x: innerLeft,
    y: innerTop,
    w: artW,
    h: artH,
  };
  if (spec.art === "desk") drawHotelDesk(card, art);
  else drawTapeArt(scene, card, art, spec.id);

  const textX = side ? art.x + art.w + 12 : innerLeft;
  const textRight = innerRight;
  const textW = Math.max(72, textRight - textX);
  const textTop = side ? innerTop : art.y + art.h + 8;
  const columnTextH = Math.max(36, innerBottom - textTop);
  const actionH = 30;
  const room = Math.max(24, columnTextH - actionH - 14);
  const typeScale = Math.max(1, Math.min(1.85, scale));
  const titleStart = Math.round((textW > 210 ? 30 : side ? 24 : 22) * typeScale);
  const titleFit = fitBlock(scene, t(spec.titleKey), textW, Math.max(18, Math.floor(room * 0.62)), titleStart, 13, hubDisplay);
  const blurbMax = Math.max(16, room - titleFit.height);
  const blurbStart = Math.round((textW > 210 ? 18 : 16) * typeScale);
  const blurbFit = fitBlock(scene, t(spec.blurbKey), textW, blurbMax, blurbStart, 12, (size) => hubUi(size, { color: C.muted }));
  const title = scene.add.text(textX, textTop, titleFit.body, hubDisplay(titleFit.size)).setOrigin(0, 0);
  tagText(title, spec.id, "card-title");
  card.add(title);
  const blurb = scene.add
    .text(textX, textTop, blurbFit.body, hubUi(blurbFit.size, { color: C.muted }))
    .setOrigin(0, 0);
  tagText(blurb, spec.id, "card-desc");
  card.add(blurb);
  const blockH = title.height + 6 + blurb.height + 8 + actionH;
  const blockTop = textTop + Math.max(0, (columnTextH - blockH) / 2);
  title.setY(blockTop);
  const blurbTop = blockTop + title.height + 6;
  blurb.setY(blurbTop);

  const action = t(spec.actionKey);
  const actionSize = fitLine(scene, action, textW - 8, Math.round(16 * typeScale), 12, (size) => hubUi(size, { color: C.textDark }));
  const actionText = scene.add.text(0, 0, action, hubUi(actionSize)).setOrigin(0, 0.5);
  const badgeW = Math.min(textW, Math.max(72, actionText.width + 22));
  const badgeH = 28;
  const badgeX = textX;
  const badgeY = blurbTop + blurb.height + 8;
  const badge = scene.add.graphics();
  drawSticker(badge, badgeX, badgeY, badgeW, badgeH, 10, enabled ? C.coral : C.gold, { shadow: false, lineWidth: 4 });
  card.add(badge);
  actionText.setPosition(badgeX + (badgeW - actionText.width) / 2, badgeY + badgeH / 2);
  tagText(actionText, spec.id, "card-action");
  card.add(actionText);

  card.setSize(w, h);
  card.setData("kind", "hub-card");
  card.setData("cardId", spec.id);
  card.setData("width", w);
  card.setData("height", h);
  card.setData("shadow", true);
  // Hit area is top-left in origin space. Container origin is the center, and
  // Phaser adds displayOrigin before the contains test.
  card.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
  if (card.input) card.input.cursor = enabled ? "pointer" : "default";
  card.on("pointerdown", (_pointer, _lx, _ly, event) => {
    event?.stopPropagation?.();
    window.__nanoGPTHubLast = spec.id;
    if (!enabled || !spec.scene) return;
    unlockAudio(scene);
    playSfx(scene, "sfx-tap", 0.28);
    scene.scene.start(spec.scene);
  });
  const inner = { left: -w / 2 + 8, top: -h / 2 + 8, right: w / 2 - 8, bottom: h / 2 - 8 };
  card.list.forEach((child) => {
    if (child.getData?.("kind") === "hub-card-text") keepInside(child, inner);
  });
  if (!enabled) card.setAlpha(0.96);
  return { id: spec.id, enabled, scene: spec.scene, container: card };
}

function keepInside(obj, box) {
  const originX = obj.originX ?? 0;
  const originY = obj.originY ?? 0;
  let guard = 0;
  while (guard < 12) {
    const x0 = obj.x - obj.width * originX;
    const y0 = obj.y - obj.height * originY;
    const x1 = x0 + obj.width;
    const y1 = y0 + obj.height;
    if (x0 >= box.left - 0.5 && y0 >= box.top - 0.5 && x1 <= box.right + 0.5 && y1 <= box.bottom + 0.5) return;
    const size = Math.round(parseFloat(obj.style.fontSize)) - 1;
    if (!(size >= 12)) return;
    obj.setFontSize(size);
    guard += 1;
  }
}

function tagText(obj, cardId, hubRole = "letter") {
  obj.setData("kind", "hub-card-text");
  obj.setData("cardId", cardId);
  obj.setData("hubRole", hubRole);
}

function drawHotelDesk(card, art) {
  const g = card.scene.add.graphics();
  const { x, y, w, h } = art;
  g.fillStyle(0xb7e4ff, 1);
  g.fillRoundedRect(x + 4, y + 4, w - 8, h * 0.34, 8);
  g.fillStyle(0xff7a85, 1);
  g.fillRoundedRect(x + 2, y + 2, w - 4, Math.max(12, h * 0.16), 6);
  g.fillStyle(0xfff1d2, 1);
  g.fillRoundedRect(x + 6, y + h * 0.22, w - 12, h * 0.28, 4);
  g.fillStyle(0xc9843a, 1);
  g.fillRoundedRect(x, y + h * 0.55, w, h * 0.4, 8);
  g.fillStyle(0xe7b15d, 1);
  g.fillRoundedRect(x + 6, y + h * 0.68, w - 12, Math.max(8, h * 0.1), 4);
  const bellR = Math.max(6, Math.min(w, h) * 0.1);
  g.fillStyle(0xffc43d, 1);
  g.fillCircle(x + w * 0.3, y + h * 0.52, bellR);
  g.fillStyle(0x3b2a2e, 1);
  g.fillCircle(x + w * 0.3, y + h * 0.52 - bellR * 0.85, Math.max(2, bellR * 0.28));
  const bw = Math.max(18, w * 0.28);
  const bh = Math.max(26, h * 0.42);
  const bx = x + w * 0.58;
  const by = y + h * 0.55 - bh + 8;
  g.fillStyle(0x5eb3ff, 1);
  g.fillRoundedRect(bx, by, bw, bh, 3);
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(bx + bw * 0.18, by + 3, bw * 0.7, bh - 6, 2);
  g.lineStyle(3, 0x3b2a2e, 1);
  g.strokeRoundedRect(bx, by, bw, bh, 3);
  g.lineStyle(2, 0x8b6b5c, 1);
  g.beginPath();
  g.moveTo(bx + bw * 0.42, by + 6);
  g.lineTo(bx + bw * 0.42, by + bh - 6);
  g.strokePath();
  card.add(g);
}

function drawTapeArt(scene, card, art, cardId) {
  const g = scene.add.graphics();
  const { x, y, w, h } = art;
  const tapeH = Math.max(36, Math.min(h * 0.92, w * 0.86));
  const tapeY = y + (h - tapeH) / 2;
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(x, tapeY, w, tapeH, 12);
  g.lineStyle(4, 0x3b2a2e, 1);
  g.strokeRoundedRect(x, tapeY, w, tapeH, 12);
  card.add(g);
  const glyphs = ["A", "l", "l"];
  const cell = Math.min(tapeH - 16, (w - 20) / glyphs.length - 6, 40);
  glyphs.forEach((ch, i) => {
    const cx = x + w / 2 + (i - 1) * (cell + 6);
    const cy = tapeY + tapeH / 2;
    const tile = scene.add.graphics();
    tile.fillStyle(i === 2 ? 0xffc43d : 0xff8b94, 1);
    tile.fillRoundedRect(cx - cell / 2, cy - cell / 2, cell, cell, 6);
    tile.lineStyle(3, 0x3b2a2e, 1);
    tile.strokeRoundedRect(cx - cell / 2, cy - cell / 2, cell, cell, 6);
    card.add(tile);
    const label = scene.add.text(cx, cy, ch, monoText(Math.max(12, Math.round(cell * 0.42)))).setOrigin(0.5);
    tagText(label, cardId);
    card.add(label);
  });
}

function publishHub(scene, cards) {
  window.__nanoGPTHubLast = "";
  window.__nanoGPTHubCards = () => {
    const canvas = scene.game.canvas.getBoundingClientRect();
    return cards.map((card) => {
      const m = card.container.getWorldTransformMatrix();
      const w = card.container.getData("width");
      const h = card.container.getData("height");
      return {
        id: card.id,
        enabled: card.enabled,
        x: canvas.left + m.tx - w / 2,
        y: canvas.top + m.ty - h / 2,
        w,
        h,
      };
    });
  };
  window.__nanoGPTHubCopy = () => ({
    title: t("hub.title"),
    intro: t("hub.intro"),
    soon: t("hub.soon"),
    home: t("hub.home"),
  });
  window.__nanoGPTOpenTutorial = () => {
    const spec = TUTORIALS.find((item) => item.status === "ready" && item.scene);
    if (!spec) return null;
    scene.scene.start(spec.scene);
    return spec.scene;
  };
}
