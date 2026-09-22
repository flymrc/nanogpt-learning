import { t } from "../i18n/locale.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { STICKER_SHADOW_Y, band, clamp, lessonRhythm, makeShell } from "./layout.js";
import { tutorHangPx } from "./tutor-lane.js";
import { addChrome, addFooterCta, bindAdvance, drawSticker, paintBackdrop } from "./components.js";
import { addRobot, addSpeechBubble, setSpeech } from "./mascot.js";
import { syncMobileChrome } from "./mode.js";
import { C, displayText, uiText, wrapToWidth } from "./theme.js";

export function makeLessonFrame(scene, { level, total, title, startLabel } = {}) {
  const phone = !isWidePcTutor();
  const shell = makeShell(scene, phone ? { header: false, footerH: 84 } : {});
  const v = shell.v;
  paintBackdrop(scene);
  if (phone) syncMobileChrome({ level, total, title });
  else addChrome(scene, { level, total, title, shell });

  const rhythm = lessonRhythm(v);
  const purposeH = clamp(Math.round((phone ? 68 : v.short ? 70 : v.compact ? 76 : 82) * v.uiScale), phone ? 60 : 64, phone ? 76 : 88);
  const purposeBand = band(v.left, shell.content.top, v.innerW, purposeH);
  const stageTop = purposeBand.bottom + rhythm;
  const stageBand = band(v.left, stageTop, v.innerW, Math.max(80, shell.content.bottom - stageTop));

  const purpose = addPurposeBanner(scene, purposeBand, { phone });
  const stage = scene.add.container(0, 0);

  const live2dOn = isWidePcTutor();
  const showRobot = !live2dOn && !phone && !v.compact && stageBand.h > 280;
  let speech = null;
  if (showRobot) {
    const robotX = v.left + (v.compact ? 32 : 48);
    const robotY = stageBand.top + 36;
    addRobot(scene, robotX, robotY, { scale: v.short ? 0.22 : 0.28 });
    speech = addSpeechBubble(scene, robotX + 132, robotY - 6, "", {
      maxWidth: Math.min(200, v.right - robotX - 70),
      fontSize: 18,
    });
    speech.setAlpha(0.95);
  }

  const nextBtn = addFooterCta(scene, {
    shell,
    label: startLabel || t("nextPage"),
    caption: t("tap"),
    onClick: () => scene.advance?.(),
  });

  bindAdvance(scene, () => scene.advance?.());

  return { shell, v, purpose, purposeBand, stage, stageBand, speech, nextBtn, showRobot, rhythm };
}

/** Bottom of lesson content must stay this far above the CTA. */
export function ctaClearance(frame) {
  return Math.max(12, frame?.rhythm || lessonRhythm(frame?.v));
}

/** Highest Y a Phaser label/chip may occupy (CTA top minus gap). */
export function ctaCeiling(frame) {
  const btn = frame?.nextBtn;
  const gap = ctaClearance(frame);
  const footerTop = frame?.shell?.footer?.top ?? 0;
  const bounds = btn?.getBounds?.();
  const ctaTop = bounds && bounds.height > 2 ? bounds.top : footerTop;
  return Math.min(footerTop, ctaTop) - gap;
}

/** Sit the CTA in the footer. On phone it stays pinned so example art cannot share that band. */
export function placeLessonCta(frame, contentBottom) {
  const btn = frame?.nextBtn;
  if (!btn) return;
  const phone = !isWidePcTutor();
  if (phone) {
    btn.y = frame.shell.footer.cy;
    return;
  }
  const rhythm = frame.rhythm || lessonRhythm(frame.v);
  const hit = btn.input?.hitArea;
  const h = hit?.height || 68;
  const raw = (contentBottom || frame.stageBand.bottom) + rhythm + h / 2;
  btn.y = Math.min(frame.shell.footer.cy, raw);
}

function layoutSpan(child) {
  const height = child?.getData?.("height");
  if (!(height > 1)) return null;
  const scale = Math.abs(child.scaleY || 1);
  const shadow = child.getData("shadow") === true ? STICKER_SHADOW_Y * scale : 0;
  return {
    top: child.y - (height * scale) / 2,
    bottom: child.y + (height * scale) / 2 + shadow,
  };
}

/** Drop or nudge example-layer children that would sit on the CTA. */
export function keepStageAboveCta(scene, band, ceiling) {
  const layer = scene.frame?.stage;
  if (!layer) return;
  for (const child of [...(layer.list || [])]) {
    const span = layoutSpan(child);
    const bounds = span || child.getBounds?.();
    const top = span ? span.top : bounds?.top;
    const bottom = span ? span.bottom : bounds?.bottom;
    if (bottom == null || bottom - top < 2) continue;
    if (bottom <= ceiling + 1) continue;
    if (bottom <= (band?.top || 0) + 8) continue;
    const dy = ceiling - bottom;
    if (top + dy >= (band?.top || 0) + 2) {
      child.y += dy;
    } else {
      scene.tweens?.killTweensOf(child);
      child.destroy();
    }
  }
}

export function layerBottom(layer, fallback) {
  let bottom = fallback || 0;
  for (const child of layer?.list || []) {
    const span = layoutSpan(child);
    if (span) {
      bottom = Math.max(bottom, span.bottom);
      continue;
    }
    const bounds = child.getBounds?.();
    if (bounds) bottom = Math.max(bottom, bounds.bottom);
  }
  return bottom;
}

export function addPurposeBanner(scene, rect, { phone = false } = {}) {
  const box = scene.add.container(rect.cx, rect.cy);
  const g = scene.add.graphics();
  drawSticker(g, -rect.w / 2, -rect.h / 2, rect.w, rect.h, phone ? 16 : 20, C.surface);
  const stripe = scene.add.graphics();
  stripe.fillStyle(C.gold, 1);
  stripe.fillRoundedRect(-rect.w / 2 + 8, -rect.h / 2 + 8, 10, rect.h - 16, 6);

  const hang = tutorHangPx();
  const kicker = scene.add
    .text(-rect.w / 2 + 26, -rect.h * 0.24, "这一课", uiText(phone ? 12 : 13, { color: C.goldCss }))
    .setOrigin(0, 0.5);
  const purpose = scene.add
    .text(-rect.w / 2 + 26, rect.h * 0.16, "", displayText(Math.max(phone ? 16 : 18, Math.round(rect.h * 0.26))))
    .setOrigin(0, 0.5);
  const step = scene.add
    .text(rect.w / 2 - 12 - hang, phone ? -rect.h * 0.24 : 0, "", uiText(phone ? 12 : 14, { color: C.muted }))
    .setOrigin(1, 0.5);

  box.add([g, stripe, kicker, purpose, step]);
  box.setSize(rect.w, rect.h);
  box.set = (text, index, total, extra = {}) => {
    kicker.setText(extra.kicker || t("thisLesson"));
    const detail = extra.detail ? ` · ${extra.detail}` : "";
    step.setText(`${index + 1} / ${total}${detail}`);
    const maxW = phone ? rect.w - 40 : rect.w - 88 - hang;
    let size = Math.max(phone ? 15 : 18, Math.round(rect.h * 0.26));
    const wrapped = wrapToWidth(scene, text, size, maxW, displayText);
    purpose.setFontSize(size);
    purpose.setText(wrapped);
    while (purpose.height > rect.h * 0.58 && size > 13) {
      size -= 1;
      purpose.setFontSize(size);
      purpose.setText(wrapToWidth(scene, text, size, maxW, displayText));
    }
    purpose.setAlpha(0);
    scene.tweens.add({ targets: purpose, alpha: 1, duration: 140 });
  };
  return box;
}

export function teach(scene, purposeUi, speech, beat, { index, total }) {
  purposeUi.set(beat.purpose, index, total);
  if (speech) setSpeech(speech, beat.caption);
  emitTutor({
    ...beat,
    index,
    total,
    kicker: "这一课",
  });
}

export function clearLayer(layer) {
  if (!layer) return;
  const scene = layer.scene;
  for (const child of [...(layer.list || [])]) {
    scene?.tweens?.killTweensOf(child);
  }
  layer.removeAll(true);
}

export function makeIconCard(scene, x, y, { glyph, label, accent = C.gold, width = 120, height = 110 }) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 20, C.surface);
  const stripe = scene.add.rectangle(-width / 2 + 10, 0, 10, height - 18, accent).setOrigin(0.5);
  const icon = scene.add
    .text(6, -height * 0.14, glyph, displayText(Math.max(22, Math.round(height * 0.32))))
    .setOrigin(0.5);
  const cap = scene.add
    .text(6, height * 0.28, label, uiText(Math.max(12, Math.round(height * 0.16)), { color: C.muted }))
    .setOrigin(0.5);
  box.add([g, stripe, icon, cap]);
  box.setSize(width, height);
  box.setData("kind", "card");
  box.setData("width", width);
  box.setData("height", height);
  box.setData("shadow", true);
  return box;
}

export function makeBigStat(scene, x, y, { value, label, width, height, accent = C.coral }) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, 22, C.surface);
  const bar = scene.add.rectangle(-width / 2 + 12, 0, 12, height - 20, accent).setOrigin(0.5);
  const val = scene.add
    .text(8, -height * 0.12, value, displayText(Math.max(22, Math.round(Math.min(40, height * 0.34)))))
    .setOrigin(0.5);
  const cap = scene.add
    .text(8, height * 0.28, label, uiText(Math.max(13, Math.round(height * 0.16)), { color: C.muted }))
    .setOrigin(0.5);
  box.add([g, bar, val, cap]);
  box.setSize(width, height);
  box.setData("kind", "card");
  box.setData("width", width);
  box.setData("height", height);
  box.setData("shadow", true);
  return box;
}

export function popIn(scene, targets, { instant = false, delay = 0 } = {}) {
  const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
  list.forEach((obj, i) => {
    if (instant) {
      obj.setAlpha(1);
      obj.setScale(1);
      return;
    }
    obj.setAlpha(0);
    obj.setScale(0.86);
    scene.tweens.add({
      targets: obj,
      alpha: 1,
      scale: 1,
      delay: delay + i * 50,
      duration: 220,
      ease: "Back.Out",
    });
  });
}
