import Phaser from "phaser";
import { narrateLine } from "../audio/narrate.js";
import { playSfx, unlockAudio } from "../audio/sound.js";
import { TUTORIALS } from "../data/tutorials.js";
import { setCourse, t } from "../i18n/locale.js";
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
    setCourse("nanogpt");
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.documentElement.style.setProperty("--hub-scale", "1");
    });

    narrateLine(this, t("hub.intro"), "beat");
    document.documentElement.style.setProperty("--hub-scale", "1");
    const titleProbe = fitBlock(this, t("hub.title"), v.innerW - 8, phone ? 96 : 80, phone ? 34 : 46, 20, hubDisplay);
    const introProbe = fitBlock(this, t("hub.intro"), v.innerW - 8, phone ? 72 : 56, phone ? 18 : 20, 13, (size) => hubUi(size, { color: C.muted }));
    const blocks = {
      titleH: titleProbe.height + 10,
      introH: introProbe.height + 6,
    };
    let voicePad = measureVoicePad();
    let plan = layoutHub(v, shell.content.top, shell.content.bottom - voicePad, TUTORIALS.length, blocks);
    for (let pass = 0; pass < 3; pass += 1) {
      const nextScale = plan.scale > 1.001 ? plan.scale.toFixed(3) : "1";
      document.documentElement.style.setProperty("--hub-scale", nextScale);
      const grown = measureVoicePad();
      if (Math.abs(grown - voicePad) <= 1) break;
      voicePad = grown;
      plan = layoutHub(v, shell.content.top, shell.content.bottom - voicePad, TUTORIALS.length, blocks);
    }
    const titleFit = fitBlock(this, t("hub.title"), v.innerW - 8, Math.max(28, plan.slots.title.h - 2), plan.titleSize, 18, hubDisplay);
    const title = this.add
      .text(v.cx, plan.slots.title.cy, titleFit.body, hubDisplay(titleFit.size))
      .setOrigin(0.5);
    title.setName("chapter-title");
    title.setData("kind", "caption");
    title.setData("hubRole", "title");
    title.setData("source", t("hub.title"));
    title.setData("wrapWidth", v.innerW - 8);

    const subSize = plan.scale > 1.001 ? Math.round((phone ? 18 : 20) * plan.scale) : phone ? 18 : 20;
    const introFit = fitBlock(
      this,
      t("hub.intro"),
      v.innerW - 8,
      Math.max(22, plan.slots.intro.h - 2),
      subSize,
      13,
      (size) => hubUi(size, { color: C.muted }),
    );
    const intro = this.add
      .text(v.cx, plan.slots.intro.cy, introFit.body, hubUi(introFit.size, { color: C.muted }))
      .setOrigin(0.5);
    intro.setData("kind", "caption");
    intro.setData("hubRole", "sub");
    intro.setData("source", t("hub.intro"));
    intro.setData("wrapWidth", v.innerW - 8);

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

/** Row width of the 1024×640 home (two cards + the 16px gap). Larger screens zoom that row. */
const REF_ROW = 757;
const REF_CARD_H = 210;
const HUB_GAP = 16;
/** Narrowest plate that still holds a title, a blurb, and the enter badge. */
const HUB_MIN_CARD_W = 220;

function pickHubCols(v, count) {
  const rowBudget = Math.max(160, v.innerW - 8 - STICKER_SHADOW_X);
  let cols = 1;
  for (let next = Math.min(3, count); next >= 1; next -= 1) {
    const cardW = (rowBudget - HUB_GAP * (next - 1)) / next;
    if (cardW >= HUB_MIN_CARD_W) {
      cols = next;
      break;
    }
  }
  return cols;
}

function layoutHub(v, top, bottom, count, blocks) {
  const cols = pickHubCols(v, count);
  const rows = Math.ceil(count / Math.max(1, cols));
  const gap = HUB_GAP;
  const cardGap = HUB_GAP;
  const available = Math.max(120, bottom - top);
  const rowBudget = Math.max(160, v.innerW - 8 - STICKER_SHADOW_X);
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
    const cardW = (rowBudget - cardGap * (cols - 1)) / cols;
    return { h: raw, items, gap, cardH, cardW, cardGap, cols, rows, titleSize };
  };
  const zoomMeasure = (s) => {
    const zoomGap = 16 * s;
    const titleSize = Math.round(48 * s);
    const titleH = Math.round(blocks.titleH * s);
    const introH = Math.round(blocks.introH * s);
    const cardH = REF_CARD_H * s;
    const cardW = (rowBudget - zoomGap * (cols - 1)) / cols;
    const cardsH = rows * cardH + (rows - 1) * zoomGap;
    const items = [
      { id: "title", h: titleH },
      { id: "intro", h: introH },
      { id: "cards", h: cardsH },
    ];
    const raw = titleH + introH + cardsH + zoomGap * 2;
    return { h: raw, items, gap: zoomGap, cardH, cardW, cardGap: zoomGap, cols, rows, titleSize };
  };
  const base = measure(1);
  // Wide PC keeps one row of cards and zooms it. A nearly square lesson
  // (1920×1080) is still this row, not the phone stack. 390 and the short
  // 1024 viewports stay on measure(1).
  const roomy = rows === 1 && cols >= 2 && v.w >= 700 && v.h >= 800 && base.h + 40 < available;
  const place = (chosen) => {
    const stacked = stackSlots(chosen.items, {
      top,
      bottom,
      gap: chosen.gap,
      justify: "center",
    });
    return { ...chosen, slots: stacked.slots };
  };
  if (roomy) {
    const unit = zoomMeasure(1).h;
    let s = Math.min(1.85, rowBudget / REF_ROW, available / Math.max(1, unit));
    if (s > 1.001) {
      let chosen = zoomMeasure(s);
      let guard = 0;
      while (chosen.h > available + 1 && s > 1.001 && guard < 6) {
        s *= available / chosen.h;
        chosen = zoomMeasure(s);
        guard += 1;
      }
      if (s > 1.001 && chosen.h <= available + 1) return place({ ...chosen, scale: s });
    }
  }
  let chosen = null;
  for (let i = 0; i <= 48; i += 1) {
    const s = 1 - ((1 - 0.58) * i) / 48;
    const plan = measure(s);
    if (plan.h <= available + 1) {
      chosen = { ...plan, scale: s };
      break;
    }
  }
  if (!chosen) chosen = { ...measure(0.58), scale: 0.58 };
  return place(chosen);
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
  const u = scale > 1.001 ? scale : 1;
  const px = (n) => (u === 1 ? n : n * u);
  const font = (n) => (u === 1 ? n : Math.max(1, Math.round(n * u)));
  const card = scene.add.container(x, y);
  const plate = scene.add.graphics();
  drawSticker(plate, -w / 2, -h / 2, w, h, px(22), enabled ? C.surface : 0xfff4e4, {
    shadow: true,
    lineWidth: font(6),
    shadowScale: u,
  });
  card.add(plate);
  const stripe = scene.add.rectangle(-w / 2 + px(12), 0, px(8), Math.max(px(24), h - px(36)), enabled ? C.coral : C.gold).setOrigin(0.5);
  card.add(stripe);

  const pad = px(12);
  const innerTop = -h / 2 + pad;
  const innerBottom = h / 2 - pad;
  const innerLeft = -w / 2 + px(22);
  const innerRight = w / 2 - pad;
  const columnH = Math.max(px(48), innerBottom - innerTop);
  const columnW = Math.max(px(80), innerRight - innerLeft);
  const textGap = px(8);
  const titleBlurbGap = px(6);
  const blurbActionGap = px(8);
  const padX = Math.round(11 * u);
  const padY = Math.round(4 * u);
  const action = t(spec.actionKey);
  const titleKey = t(spec.titleKey);
  const blurbKey = t(spec.blurbKey);

  const measureAction = (textW) => {
    let actionSize = fitLine(scene, action, Math.max(px(40), textW - padX * 2), font(16), 12, (size) => hubUi(size, { color: C.textDark }));
    const probe = scene.add.text(0, 0, action, hubUi(actionSize)).setVisible(false);
    while (probe.width + padX * 2 > textW + 0.5 && actionSize > 12) {
      actionSize -= 1;
      probe.setFontSize(actionSize);
    }
    const badgeW = Math.min(textW, Math.max(Math.round(64 * u), probe.width + padX * 2));
    const badgeH = Math.max(Math.round(24 * u), probe.height + padY * 2);
    probe.destroy();
    return { actionSize, badgeW, badgeH };
  };

  const compose = (useSide, artHeight) => {
    const aH = useSide ? columnH : artHeight;
    const aW = useSide ? Math.round(Math.min(aH * 0.98, columnW * 0.42, px(168))) : columnW;
    const tX = useSide ? innerLeft + aW + px(10) : innerLeft;
    const tW = Math.max(px(64), innerRight - tX);
    const titleBase = tW > px(210) ? 28 : useSide ? 22 : 20;
    const blurbBase = tW > px(210) ? 16 : 15;
    const act = measureAction(tW);
    const actionSlot = Math.max(px(26), act.badgeH);
    const textBudget = useSide ? columnH : Math.max(px(36), columnH - aH - textGap);
    const room = Math.max(px(20), textBudget - actionSlot - blurbActionGap - titleBlurbGap);
    const title = fitBlock(scene, titleKey, tW, Math.max(font(16), room * 0.58), font(titleBase), 12, hubDisplay);
    const blurbMax = Math.max(font(14), room - title.height);
    const blurb = fitBlock(scene, blurbKey, tW, blurbMax, font(blurbBase), 12, (size) => hubUi(size, { color: C.muted }));
    const nextBlock = title.height + titleBlurbGap + blurb.height + blurbActionGap + actionSlot;
    return { aW, aH, tX, tW, title, blurb, act, blockH: nextBlock, actionSlot };
  };

  let side = w >= 300 && h >= 168 && columnW >= 280;
  let laid = side ? compose(true, columnH) : null;
  if (!laid || laid.blockH > columnH + 1 || laid.tW < px(72)) {
    side = false;
    const words = compose(false, px(28));
    const minArt = Math.min(px(40), Math.max(px(28), columnH * 0.22));
    let artHeight = columnH - textGap - words.blockH;
    artHeight = Math.max(minArt, Math.min(artHeight, px(112), columnH * 0.5));
    laid = compose(false, artHeight);
    let guard = 0;
    while (laid.aH + textGap + laid.blockH > columnH + 1 && artHeight > minArt + 0.5 && guard < 8) {
      artHeight = Math.max(minArt, artHeight - px(8));
      laid = compose(false, artHeight);
      guard += 1;
    }
  }

  const art = { x: innerLeft, y: innerTop, w: laid.aW, h: laid.aH };
  const textW = laid.tW;
  const textX = laid.tX;
  const titleFit = laid.title;
  const blurbFit = laid.blurb;
  const actionSize = laid.act.actionSize;
  const badgeW = laid.act.badgeW;
  const badgeH = laid.act.badgeH;
  const actionSlot = laid.actionSlot;
  const blockH = laid.blockH;
  const groupH = side ? Math.max(art.h, blockH) : art.h + textGap + blockH;
  const slack = Math.max(0, columnH - groupH);
  const contentTop = innerTop + slack / 2;
  art.y = contentTop + (side ? Math.max(0, (Math.max(art.h, blockH) - art.h) / 2) : 0);
  if (spec.art === "desk") drawHotelDesk(card, art, u);
  else if (spec.art === "map") drawMapArt(card, art, u);
  else drawTapeArt(scene, card, art, spec.id, u);
  const textTop = side ? contentTop + Math.max(0, (Math.max(art.h, blockH) - blockH) / 2) : art.y + art.h + textGap;
  const actionText = scene.add.text(0, 0, action, hubUi(actionSize)).setOrigin(0, 0.5);
  const title = scene.add.text(textX, textTop, titleFit.body, hubDisplay(titleFit.size)).setOrigin(0, 0);
  tagText(title, spec.id, "card-title");
  title.setData("source", t(spec.titleKey));
  title.setData("wrapWidth", textW);
  card.add(title);
  const blurbTop = textTop + title.height + titleBlurbGap;
  const blurb = scene.add
    .text(textX, blurbTop, blurbFit.body, hubUi(blurbFit.size, { color: C.muted }))
    .setOrigin(0, 0);
  tagText(blurb, spec.id, "card-desc");
  blurb.setData("source", t(spec.blurbKey));
  blurb.setData("wrapWidth", textW);
  card.add(blurb);
  const badgeX = textX;
  const badgeY = blurbTop + blurb.height + blurbActionGap + Math.max(0, (actionSlot - badgeH) / 2);
  const badge = scene.add.graphics();
  drawSticker(badge, badgeX, badgeY, badgeW, badgeH, px(10), enabled ? C.coral : C.gold, { shadow: false, lineWidth: font(4) });
  card.add(badge);
  actionText.setPosition(badgeX + (badgeW - actionText.width) / 2, badgeY + badgeH / 2);
  actionText.setData("pill", { x: badgeX, y: badgeY, w: badgeW, h: badgeH });
  tagText(actionText, spec.id, "card-action");
  card.add(actionText);
  card.bringToTop(actionText);

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

function drawHotelDesk(card, art, unit = 1) {
  const u = unit > 1.001 ? unit : 1;
  const px = (n) => (u === 1 ? n : n * u);
  const g = card.scene.add.graphics();
  const { x, y, w, h } = art;
  g.fillStyle(0xb7e4ff, 1);
  g.fillRoundedRect(x + px(4), y + px(4), w - px(8), h * 0.34, px(8));
  g.fillStyle(0xff7a85, 1);
  g.fillRoundedRect(x + px(2), y + px(2), w - px(4), Math.max(px(12), h * 0.16), px(6));
  g.fillStyle(0xfff1d2, 1);
  g.fillRoundedRect(x + px(6), y + h * 0.22, w - px(12), h * 0.28, px(4));
  g.fillStyle(0xc9843a, 1);
  g.fillRoundedRect(x, y + h * 0.55, w, h * 0.4, px(8));
  g.fillStyle(0xe7b15d, 1);
  g.fillRoundedRect(x + px(6), y + h * 0.68, w - px(12), Math.max(px(8), h * 0.1), px(4));
  const bellR = Math.max(px(6), Math.min(w, h) * 0.1);
  g.fillStyle(0xffc43d, 1);
  g.fillCircle(x + w * 0.3, y + h * 0.52, bellR);
  g.fillStyle(0x3b2a2e, 1);
  g.fillCircle(x + w * 0.3, y + h * 0.52 - bellR * 0.85, Math.max(px(2), bellR * 0.28));
  const bw = Math.max(px(18), w * 0.28);
  const bh = Math.max(px(26), h * 0.42);
  const bx = x + w * 0.58;
  const by = y + h * 0.55 - bh + px(8);
  g.fillStyle(0x5eb3ff, 1);
  g.fillRoundedRect(bx, by, bw, bh, px(3));
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(bx + bw * 0.18, by + px(3), bw * 0.7, bh - px(6), px(2));
  g.lineStyle(px(3), 0x3b2a2e, 1);
  g.strokeRoundedRect(bx, by, bw, bh, px(3));
  g.lineStyle(px(2), 0x8b6b5c, 1);
  g.beginPath();
  g.moveTo(bx + bw * 0.42, by + px(6));
  g.lineTo(bx + bw * 0.42, by + bh - px(6));
  g.strokePath();
  card.add(g);
}

function drawMapArt(card, art, unit = 1) {
  const u = unit > 1.001 ? unit : 1;
  const px = (n) => (u === 1 ? n : n * u);
  const g = card.scene.add.graphics();
  const { x, y, w, h } = art;
  g.fillStyle(0xb7e4ff, 1);
  g.fillRoundedRect(x, y, w, h * 0.72, px(10));
  g.fillStyle(0x86de7a, 1);
  g.fillEllipse(x + w * 0.5, y + h * 0.78, w * 0.92, h * 0.36);
  g.fillStyle(0xffe566, 1);
  g.fillCircle(x + w * 0.78, y + h * 0.18, Math.max(px(6), Math.min(w, h) * 0.08));
  const dots = [
    [0.28, 0.42, 0xe24b57],
    [0.4, 0.36, 0xe24b57],
    [0.62, 0.58, 0x1d4ed8],
    [0.48, 0.66, 0x1d4ed8],
  ];
  g.lineStyle(px(3), 0x3b2a2e, 1);
  g.beginPath();
  g.moveTo(x + w * dots[0][0], y + h * dots[0][1]);
  g.lineTo(x + w * dots[1][0], y + h * dots[1][1]);
  g.moveTo(x + w * dots[2][0], y + h * dots[2][1]);
  g.lineTo(x + w * dots[3][0], y + h * dots[3][1]);
  g.strokePath();
  dots.forEach(([dx, dy, color]) => {
    g.fillStyle(color, 1);
    g.fillCircle(x + w * dx, y + h * dy, Math.max(px(4), Math.min(w, h) * 0.06));
  });
  card.add(g);
}

function drawTapeArt(scene, card, art, cardId, unit = 1) {
  const u = unit > 1.001 ? unit : 1;
  const px = (n) => (u === 1 ? n : n * u);
  const g = scene.add.graphics();
  const { x, y, w, h } = art;
  const tapeH = Math.max(px(36), Math.min(h * 0.92, w * 0.86));
  const tapeY = y + (h - tapeH) / 2;
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(x, tapeY, w, tapeH, px(12));
  g.lineStyle(px(4), 0x3b2a2e, 1);
  g.strokeRoundedRect(x, tapeY, w, tapeH, px(12));
  card.add(g);
  const glyphs = ["A", "l", "l"];
  const cell = Math.min(tapeH - px(16), (w - px(20)) / glyphs.length - px(6), px(40));
  glyphs.forEach((ch, i) => {
    const cx = x + w / 2 + (i - 1) * (cell + px(6));
    const cy = tapeY + tapeH / 2;
    const tile = scene.add.graphics();
    tile.fillStyle(i === 2 ? 0xffc43d : 0xff8b94, 1);
    tile.fillRoundedRect(cx - cell / 2, cy - cell / 2, cell, cell, px(6));
    tile.lineStyle(px(3), 0x3b2a2e, 1);
    tile.strokeRoundedRect(cx - cell / 2, cy - cell / 2, cell, cell, px(6));
    card.add(tile);
    const label = scene.add.text(cx, cy, ch, monoText(Math.max(px(12), Math.round(cell * 0.42)))).setOrigin(0.5);
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
