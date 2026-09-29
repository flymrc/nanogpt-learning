import { getCourse, getLang, t } from "../i18n/locale.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { STICKER_SHADOW_Y, band, clamp, lessonRhythm, makeShell } from "./layout.js";
import { tutorHangPx } from "./tutor-lane.js";
import { syncHubChrome } from "./chrome.js";
import { addChrome, addFooterCta, bindAdvance, drawSticker, paintBackdrop, planLessonHeader } from "./components.js";
import { addRobot, addSpeechBubble, setSpeech } from "./mascot.js";
import { syncMobileChrome } from "./mode.js";
import { C, displayText, setGluedText, uiText, wrapAtBreaks, wrapToWidth } from "./theme.js";

export function openCopyPop(text) {
  let pop = document.getElementById("copy-pop");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "copy-pop";
    pop.hidden = true;
    pop.innerHTML = '<div class="copy-pop-card" role="dialog"><p id="copy-pop-body"></p><button type="button" id="copy-pop-close"></button></div>';
    document.body.appendChild(pop);
    pop.addEventListener("click", (event) => {
      if (event.target === pop || event.target?.id === "copy-pop-close") closeCopyPop();
    });
  }
  const body = document.getElementById("copy-pop-body");
  const close = document.getElementById("copy-pop-close");
  if (body) setGluedText(body, String(text || ""));
  if (close) close.textContent = t("close");
  pop.hidden = false;
  window.__nanoGPTCopyPopOpen = true;
}

export function closeCopyPop() {
  const pop = document.getElementById("copy-pop");
  if (pop) pop.hidden = true;
  window.__nanoGPTCopyPopOpen = false;
}

export function makeLessonFrame(scene, { level, total, title, startLabel } = {}) {
  syncHubChrome(scene.sys.settings.key);
  const phone = !isWidePcTutor();
  const headerPlan = phone ? null : planLessonHeader(scene, title);
  const shell = makeShell(scene, phone ? { header: false, footerH: 84 } : { headerH: headerPlan.headerH });
  if (headerPlan) shell.headerPlan = headerPlan;
  const v = shell.v;
  paintBackdrop(scene);
  if (phone) syncMobileChrome({ level, total, title });
  else addChrome(scene, { level, total, title, shell });

  const rhythm = lessonRhythm(v);
  const rag = getCourse() === "rag";
  const purposeMin = phone ? (rag ? 108 : 60) : v.h < 560 ? 48 : rag ? 88 : 64;
  const purposeMax = phone ? (rag ? 136 : 76) : rag ? 112 : 88;
  const purposeWant = rag ? (phone ? 124 : 100) : phone ? 68 : v.short ? 70 : v.compact ? 76 : 82;
  const purposeH = clamp(Math.round(purposeWant * v.uiScale), purposeMin, purposeMax);
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

  const frame = { shell, v, purpose, purposeBand, stage, stageBand, speech, nextBtn, showRobot, rhythm };
  frame.fitPurpose = (phase) => {
    const rag = getCourse() === "rag";
    const lookOrDo = phase === 1 || phase === 2;
    // Phone already uses the one-line 全文 toggle. On a wide PC the same
    // toggle applies to 看看 / やって so the picture can take half the column.
    const collapsed = rag && (phone || lookOrDo);
    const pcPack = collapsed && !phone;
    const shortPack = pcPack && v.h < 720;
    const nextH = collapsed ? (shortPack ? 26 : pcPack ? 30 : 32) : purposeH;
    const purposeTop = pcPack ? (shell.header?.bottom ?? shell.content.top) + (shortPack ? 4 : 6) : shell.content.top;
    frame.purposeBand = band(v.left, purposeTop, v.innerW, nextH);
    const nextTop = frame.purposeBand.bottom + (pcPack ? 10 : rhythm);
    frame.purpose.relayout?.(frame.purposeBand, { collapsed, phone });
    if (pcPack) seatCtaLow(frame);
    let bandBottom = shell.content.bottom;
    if (pcPack) {
      const bounds = frame.nextBtn?.getBounds?.();
      const ctaTop = bounds && bounds.height > 2 ? bounds.top : shell.footer.top;
      bandBottom = Math.max(bandBottom, ctaTop - 12);
    }
    frame.stageBand = band(v.left, nextTop, v.innerW, Math.max(80, bandBottom - nextTop));
  };
  return frame;
}

/** Bottom of lesson content must stay this far above the CTA. */
export function ctaClearance(frame) {
  return Math.max(12, frame?.rhythm || lessonRhythm(frame?.v));
}

function pcPackedPicture(frame) {
  return getCourse() === "rag" && isWidePcTutor() && Boolean(frame?.purpose?.collapsed);
}

/** Drop the pink button to the bottom edge so the picture can use the footer padding. */
function seatCtaLow(frame) {
  const btn = frame?.nextBtn;
  if (!btn || !frame?.v) return;
  const hit = btn.input?.hitArea;
  const h = hit?.height || 68;
  const viewH = frame.v.bottom + (frame.v.padBottom || 0);
  btn.y = viewH - h / 2 - 6;
}

/** Highest Y a Phaser label/chip may occupy (CTA top minus gap). */
export function ctaCeiling(frame) {
  const btn = frame?.nextBtn;
  const gap = ctaClearance(frame);
  const footerTop = frame?.shell?.footer?.top ?? 0;
  const bounds = btn?.getBounds?.();
  const ctaTop = bounds && bounds.height > 2 ? bounds.top : footerTop;
  if (pcPackedPicture(frame)) return ctaTop - 12;
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
  if (pcPackedPicture(frame)) {
    seatCtaLow(frame);
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
    } else if (child.getData?.("artPart")) {
      // Lesson pictures stay on the page. Callers shrink them into the band.
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
  const rowY = -rect.h * (phone ? 0.24 : 0.28);
  const kicker = scene.add
    .text(-rect.w / 2 + 26, rowY, "这一课", uiText(phone ? 12 : 13, { color: C.goldCss }))
    .setOrigin(0, 0.5);
  const purpose = scene.add
    .text(-rect.w / 2 + 26, rect.h * 0.16, "", displayText(Math.max(phone ? 16 : 18, Math.round(rect.h * 0.26))))
    .setOrigin(0, 0.5);
  const step = scene.add
    .text(rect.w / 2 - 12 - hang, rowY, "", uiText(phone ? 12 : 14, { color: C.muted }))
    .setOrigin(1, 0.5);
  const more = scene.add
    .text(0, 0, "", uiText(phone ? 13 : 14, { color: C.blueCss }))
    .setOrigin(0, 0.5)
    .setVisible(false);
  more.setData("kind", "banner-more");
  kicker.setData("kind", "banner-kicker");
  purpose.setData("kind", "banner-purpose");
  step.setData("kind", "banner-step");

  box.add([g, stripe, kicker, purpose, step, more]);
  box.setSize(rect.w, rect.h);
  box.layoutRect = rect;
  box.collapsed = false;
  box.relayout = (next, { collapsed = false, phone: isPhone = phone } = {}) => {
    box.layoutRect = next;
    box.collapsed = collapsed;
    box.setPosition(next.cx, next.cy);
    box.setSize(next.w, next.h);
    box.setData("width", next.w);
    box.setData("height", next.h);
    box.setData("shadow", true);
    g.clear();
    drawSticker(g, -next.w / 2, -next.h / 2, next.w, next.h, isPhone ? 16 : 20, C.surface);
    stripe.clear();
    stripe.fillStyle(C.gold, 1);
    stripe.fillRoundedRect(-next.w / 2 + 8, -next.h / 2 + 8, 10, Math.max(12, next.h - 16), 6);
    box.removeAllListeners("pointerdown");
    box.disableInteractive();
    more.setVisible(collapsed);
    purpose.setVisible(!collapsed);
    if (!collapsed) return;
    const row = 0;
    kicker.setY(row);
    step.setY(row);
    more.setText(t("purposeMore"));
    more.setPosition(-next.w / 2 + 26 + kicker.width + 10, row);
    more.setVisible(true);
    box.setInteractive(new Phaser.Geom.Rectangle(-next.w / 2, -next.h / 2, next.w, next.h), Phaser.Geom.Rectangle.Contains);
    box.on("pointerdown", (_pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      openCopyPop(window.__nanoGPTPurposeFull || "");
    });
  };
  box.set = (text, index, total, extra = {}) => {
    const live = box.layoutRect || rect;
    const rowYLive = box.collapsed ? 0 : -live.h * (phone ? 0.24 : 0.28);
    kicker.setText(extra.kicker || t("thisLesson"));
    kicker.setY(rowYLive);
    const detail = extra.detail ? ` · ${extra.detail}` : "";
    step.setText(`${index + 1} / ${total}${detail}`);
    step.setY(rowYLive);
    window.__nanoGPTPurposeFull = String(text || "");
    if (box.collapsed) {
      purpose.setText("");
      purpose.setFontSize(12);
      purpose.setPosition(0, 0);
      purpose.setVisible(false);
      purpose.setAlpha(0);
      more.setText(t("purposeMore"));
      more.setPosition(-live.w / 2 + 26 + kicker.width + 10, rowYLive);
      more.setVisible(true);
      window.__nanoGPTPurposeAlpha = () => 1;
      window.__nanoGPTBannerSettled = true;
      window.__nanoGPTOpenPurpose = () => openCopyPop(window.__nanoGPTPurposeFull || "");
      window.__nanoGPTClosePurpose = () => closeCopyPop();
      return;
    }
    purpose.setVisible(true);
    more.setVisible(false);
    const ragLesson = getCourse() === "rag";
    const ja = getLang() === "ja";
    const wrap = (value, font, width) => (ragLesson && ja
      ? wrapAtBreaks(scene, value, font, width, displayText)
      : wrapToWidth(scene, value, font, width, displayText));
    const gap = 12;
    const stepLeft = rect.w / 2 - 12 - hang - step.width;
    const fullW = Math.max(80, rect.w - 40 - (phone ? 0 : hang));
    const clearW = Math.max(80, stepLeft - (-rect.w / 2 + 26) - gap);
    const maxW = ragLesson ? Math.max(80, rect.w - 48) : Math.min(fullW, clearW);
    let size = Math.max(phone ? 15 : 18, Math.round(rect.h * (ragLesson ? 0.16 : 0.26)));
    if (ragLesson) {
      purpose.setOrigin(0, 0);
      purpose.setPosition(-rect.w / 2 + 26, rowY + 16);
    }
    purpose.setFontSize(size);
    purpose.setText(wrap(text, size, maxW));
    const maxTextH = ragLesson ? rect.h / 2 - purpose.y - 8 : rect.h * 0.5;
    const crowded = () => {
      const tall = purpose.height > maxTextH;
      const wide = purpose.width > maxW + 1;
      const p = purpose.getBounds();
      const s = step.getBounds();
      const k = kicker.getBounds();
      const hitStep = p.right > s.left - 4 && p.bottom > s.top + 1 && p.top < s.bottom - 1;
      const hitKicker = p.top < k.bottom + 2 && p.right > k.left && p.left < k.right;
      return tall || wide || hitStep || hitKicker;
    };
    while (crowded() && size > 13) {
      size -= 1;
      purpose.setFontSize(size);
      purpose.setText(wrap(text, size, maxW));
    }
    purpose.setData("source", text);
    purpose.setData("wrapWidth", maxW);
    purpose.setAlpha(0);
    window.__nanoGPTPurposeAlpha = () => purpose.alpha;
    window.__nanoGPTBannerSettled = false;
    scene.tweens.add({
      targets: purpose,
      alpha: 1,
      duration: 140,
      onComplete: () => {
        purpose.setAlpha(1);
        window.__nanoGPTBannerSettled = true;
      },
    });
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
