import { LESSON_PHASES, PHASE_COUNT, lessonCaption, phaseText } from "../data/lessons.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { drawSticker } from "./components.js";
import { lessonRhythm } from "./layout.js";
import { installLayoutProbe } from "./e2e.js";
import { layerBottom, placeLessonCta } from "./lesson.js";
import { C, uiText, wrapToWidth } from "./theme.js";

let bookMounted = false;

export function mountTutorBook() {
  const overlay = document.getElementById("lesson-book-overlay");
  const btn = document.getElementById("book-toggle");
  const close = document.getElementById("lesson-book-close");
  if (bookMounted || !overlay || !btn) {
    renderTutorBook(window.__nanoGPTTutor || null);
    return;
  }
  bookMounted = true;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleLessonBook();
  });
  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeLessonBook();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeLessonBook();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      event.stopPropagation();
      closeLessonBook();
    }
  });
  window.__nanoGPTBookOpen = () => !overlay.hidden;
  renderTutorBook(window.__nanoGPTTutor || null);
}

export function toggleLessonBook() {
  const overlay = document.getElementById("lesson-book-overlay");
  if (!overlay) return;
  if (overlay.hidden) openLessonBook();
  else closeLessonBook();
}

export function openLessonBook() {
  const overlay = document.getElementById("lesson-book-overlay");
  const btn = document.getElementById("book-toggle");
  if (!overlay) return;
  overlay.hidden = false;
  btn?.setAttribute("aria-expanded", "true");
}

export function closeLessonBook() {
  const overlay = document.getElementById("lesson-book-overlay");
  const btn = document.getElementById("book-toggle");
  if (!overlay) return;
  overlay.hidden = true;
  btn?.setAttribute("aria-expanded", "false");
}

export function renderTutorBook(beat) {
  const root = document.getElementById("tutor-book");
  if (!root) return;
  if (!beat) {
    root.innerHTML = "";
    return;
  }
  const phase = Number.isFinite(beat.phase) ? beat.phase : 0;
  root.innerHTML = "";
  const blocks = [
    ["这一步要干什么", beat.goal || beat.purpose, "goal"],
    ["为什么需要这一步", beat.why, "why"],
    ["具体例子走一遍", beat.example, "example"],
    ["常见误会", (beat.myths || []).map((line) => `· ${line}`).join("\n"), "myth"],
    ["一句话记住", beat.remember, "remember"],
  ];
  blocks.forEach(([title, body, id]) => {
    if (!body) return;
    const sec = document.createElement("section");
    sec.className = `tutor-block${LESSON_PHASES[phase]?.id === id ? " is-on" : ""}`;
    sec.dataset.phase = id;
    const h = document.createElement("h3");
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = body;
    sec.append(h, p);
    if (id === "remember" && beat.footnote) {
      const foot = document.createElement("p");
      foot.className = "tutor-footnote";
      foot.textContent = beat.footnote;
      sec.append(foot);
    }
    root.appendChild(sec);
  });
}

export function teachLesson(scene, frame, beat, { index, total, phase = 0, instant = false }) {
  const meta = LESSON_PHASES[phase] || LESSON_PHASES[0];
  frame.purpose.set(beat.purpose, index, total, {
    kicker: "这一步要干什么",
    detail: `${phase + 1} / ${PHASE_COUNT}`,
  });
  if (frame.speech) {
    const bubble = lessonCaption(beat, phase);
    frame.speech.refresh?.(bubble);
  }
  emitTutor({
    ...beat,
    index,
    total,
    phase,
    kicker: meta.kicker,
    caption: lessonCaption(beat, phase),
  });
  renderTutorBook({ ...beat, index, total, phase });
  if (instant) return meta;
  return meta;
}

export function drawPhaseTabs(scene, stage, phase, onPick) {
  const n = LESSON_PHASES.length;
  const phone = !isWidePcTutor();
  const gap = phone ? 4 : 8;
  const h = phone ? 30 : 32;
  const w = Math.min(phone ? 72 : 78, (stage.w - gap * (n - 1)) / n);
  const y = stage.top + h / 2;
  const start = stage.cx - ((n - 1) * (w + gap)) / 2;
  LESSON_PHASES.forEach((item, i) => {
    const x = start + i * (w + gap);
    const tab = scene.add.container(x, y);
    const g = scene.add.graphics();
    drawSticker(g, -w / 2, -h / 2, w, h, 12, i === phase ? C.gold : C.surface, {
      lineWidth: 4,
      shadow: false,
    });
    const label = scene.add.text(0, 0, item.label, uiText(phone ? 11 : 12)).setOrigin(0.5);
    tab.add([g, label]);
    tab.setSize(w, h);
    tab.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    tab.input.cursor = "pointer";
    tab.on("pointerdown", (pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
      if (i !== phase) onPick(i);
    });
    scene.frame.stage.add(tab);
  });
  return { bottom: stage.top + h, height: h };
}

export function drawPhaseCard(scene, stage, beat, phase, { top } = {}) {
  const meta = LESSON_PHASES[phase] || LESSON_PHASES[0];
  const rhythm = lessonRhythm(scene.frame.v);
  const phone = !isWidePcTutor();
  const cardTop = (top ?? stage.top) + rhythm;
  const width = Math.min(stage.w - (phone ? 0 : 8), 640);
  const wrap = width - (phone ? 44 : 48);
  const body = phaseText(beat, phase);
  const maxH = phone
    ? Math.min(stage.h * 0.42, 220)
    : meta.id === "example"
      ? stage.h * 0.34
      : stage.h * 0.38;
  let size = phone ? 14 : meta.id === "example" ? 14 : 15;
  let wrapped = wrapToWidth(scene, body, size, wrap, uiText);
  const title = scene.add.text(0, 0, meta.kicker, uiText(phone ? 12 : 13, { color: C.goldCss })).setOrigin(0, 0);
  const text = scene.add.text(0, 0, wrapped, uiText(size, { align: "left", lineSpacing: 4 })).setOrigin(0, 0);
  while (text.height > maxH - 48 && size > 12) {
    size -= 1;
    wrapped = wrapToWidth(scene, body, size, wrap, uiText);
    text.setFontSize(size);
    text.setText(wrapped);
  }
  let extraH = 0;
  let footnote = null;
  if (meta.id === "remember" && beat.footnote) {
    const foot = wrapToWidth(scene, beat.footnote, 12, wrap, uiText);
    footnote = scene.add.text(0, 0, foot, uiText(12, { color: C.muted })).setOrigin(0, 0);
    extraH = footnote.height + 8;
  }
  const height = Math.min(maxH, Math.max(phone ? 78 : 86, 36 + text.height + extraH + 16));
  const box = scene.add.container(stage.cx, cardTop + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, phone ? 14 : 18, C.surface);
  const stripe = scene.add.graphics();
  stripe.fillStyle(phaseAccent(meta.id), 1);
  stripe.fillRoundedRect(-width / 2 + 8, -height / 2 + 8, 8, height - 16, 5);
  const textX = -width / 2 + 22;
  title.setPosition(textX, -height / 2 + 10);
  text.setPosition(textX, -height / 2 + 28);
  box.add([g, stripe, title, text]);
  if (footnote) {
    footnote.setPosition(textX, -height / 2 + 28 + text.height + 8);
    box.add(footnote);
  }
  box.setSize(width, height);
  scene.frame.stage.add(box);
  return { bottom: cardTop + height, height };
}

export function paintLessonStage(scene, beat, phase, onPick) {
  const tabs = drawPhaseTabs(scene, scene.frame.stageBand, phase, onPick);
  const card = drawPhaseCard(scene, scene.frame.stageBand, beat, phase, { top: tabs.bottom });
  const band = exampleBand(scene.frame.stageBand, card.bottom, scene.frame.v);
  scene.frame.lastTabs = { left: scene.frame.stageBand.left, top: scene.frame.stageBand.top, w: scene.frame.stageBand.w, h: tabs.height };
  scene.frame.lastCard = { left: scene.frame.stageBand.left, top: card.bottom - card.height, w: scene.frame.stageBand.w, h: card.height };
  scene.frame.lastExample = band;
  return { tabs, card, band };
}

export function finishLessonStage(scene, band) {
  const bottom = layerBottom(scene.frame.stage, band.top);
  placeLessonCta(scene.frame, Math.min(bottom, scene.frame.shell.footer.top - scene.frame.rhythm));
  installLayoutProbe(scene);
}

function phaseAccent(id) {
  if (id === "why") return C.teal;
  if (id === "example") return C.coral;
  if (id === "myth") return C.violet;
  if (id === "remember") return C.gold;
  return C.blue;
}

export function exampleBand(stage, cardBottom, v) {
  const rhythm = lessonRhythm(v);
  const top = cardBottom + rhythm;
  const inset = isWidePcTutor() ? 16 : 8;
  return {
    ...stage,
    top,
    left: stage.left + inset,
    right: stage.right - inset,
    w: Math.max(80, stage.w - inset * 2),
    h: Math.max(80, stage.bottom - top),
    cy: top + Math.max(40, (stage.bottom - top) / 2),
  };
}
