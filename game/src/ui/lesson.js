import { cueVoice } from "../audio/sound.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { band, clamp, lessonRhythm, makeShell } from "./layout.js";
import { addChrome, addFooterCta, bindAdvance, drawSticker, paintBackdrop } from "./components.js";
import { addRobot, addSpeechBubble, setSpeech } from "./mascot.js";
import { C, displayText, uiText } from "./theme.js";

export function makeLessonFrame(scene, { level, total, title, startLabel = "下一步" }) {
  const shell = makeShell(scene);
  const v = shell.v;
  paintBackdrop(scene);
  addChrome(scene, { level, total, title, shell });

  const rhythm = lessonRhythm(v);
  const purposeH = clamp(Math.round((v.short ? 70 : v.compact ? 76 : 82) * v.uiScale), 64, 88);
  const purposeBand = band(v.left, shell.content.top, v.innerW, purposeH);
  const stageTop = purposeBand.bottom + rhythm;
  const stageBand = band(v.left, stageTop, v.innerW, Math.max(80, shell.content.bottom - stageTop));

  const purpose = addPurposeBanner(scene, purposeBand);
  const stage = scene.add.container(0, 0);

  const live2dOn = isWidePcTutor();
  const showRobot = !live2dOn && !v.compact && stageBand.h > 280;
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
    label: startLabel,
    caption: "点一下",
    onClick: () => scene.advance?.(),
  });

  bindAdvance(scene, () => scene.advance?.());

  return { shell, v, purpose, purposeBand, stage, stageBand, speech, nextBtn, showRobot, rhythm };
}

/** Sit the CTA 12–24px under the last lesson block, never below the shell footer. */
export function placeLessonCta(frame, contentBottom) {
  const btn = frame?.nextBtn;
  if (!btn) return;
  const rhythm = frame.rhythm || lessonRhythm(frame.v);
  const hit = btn.input?.hitArea;
  const h = hit?.height || 68;
  const raw = (contentBottom || frame.stageBand.bottom) + rhythm + h / 2;
  btn.y = Math.min(frame.shell.footer.cy, raw);
}

export function layerBottom(layer, fallback) {
  let bottom = fallback || 0;
  for (const child of layer?.list || []) {
    const bounds = child.getBounds?.();
    if (bounds) bottom = Math.max(bottom, bounds.bottom);
  }
  return bottom;
}

export function addPurposeBanner(scene, rect) {
  const box = scene.add.container(rect.cx, rect.cy);
  const g = scene.add.graphics();
  drawSticker(g, -rect.w / 2, -rect.h / 2, rect.w, rect.h, 20, C.surface);
  const stripe = scene.add.graphics();
  stripe.fillStyle(C.gold, 1);
  stripe.fillRoundedRect(-rect.w / 2 + 8, -rect.h / 2 + 8, 12, rect.h - 16, 7);

  const kicker = scene.add
    .text(-rect.w / 2 + 32, -rect.h * 0.22, "这一步要干什么", uiText(13, { color: C.goldCss }))
    .setOrigin(0, 0.5);
  const purpose = scene.add
    .text(-rect.w / 2 + 32, rect.h * 0.16, "", displayText(Math.max(18, Math.round(rect.h * 0.28))))
    .setOrigin(0, 0.5);
  const step = scene.add
    .text(rect.w / 2 - 16, 0, "", uiText(14, { color: C.muted }))
    .setOrigin(1, 0.5);

  box.add([g, stripe, kicker, purpose, step]);
  box.setSize(rect.w, rect.h);
  box.set = (text, index, total, extra = {}) => {
    kicker.setText(extra.kicker || "这一步要干什么");
    purpose.setText(text);
    const maxW = rect.w - 88;
    let size = Math.max(18, Math.round(rect.h * 0.28));
    purpose.setFontSize(size);
    while (purpose.width > maxW && size > 13) {
      size -= 1;
      purpose.setFontSize(size);
    }
    const detail = extra.detail ? ` · ${extra.detail}` : "";
    step.setText(`${index + 1} / ${total}${detail}`);
    purpose.setAlpha(0);
    scene.tweens.add({ targets: purpose, alpha: 1, duration: 140 });
  };
  return box;
}

export function teach(scene, purposeUi, speech, beat, { index, total }) {
  purposeUi.set(beat.purpose, index, total);
  if (speech) setSpeech(speech, beat.caption);
  if (beat.vo) cueVoice(scene, beat.vo);
  emitTutor({
    ...beat,
    index,
    total,
    kicker: "这一步在干什么",
  });
}

export function clearLayer(layer) {
  if (!layer) return;
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
