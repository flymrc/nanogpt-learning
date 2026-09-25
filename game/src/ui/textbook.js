import { LESSON_PHASES, PHASE_COUNT, lessonCaption, phaseText } from "../data/lessons.js";
import { t } from "../i18n/locale.js";
import { syncPseudo } from "./pseudo.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { drawSticker } from "./components.js";
import { lessonRhythm } from "./layout.js";
import { installLayoutProbe } from "./e2e.js";
import { artBandReserve } from "./page-art.js";
import { ctaCeiling, keepStageAboveCta, layerBottom, placeLessonCta } from "./lesson.js";
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
  const blocks = LESSON_PHASES.map((meta) => {
    let body = "";
    if (meta.id === "aim") body = beat.goal || beat.purpose || "";
    else if (meta.id === "look") body = beat.why || "";
    else if (meta.id === "do") body = beat.example || "";
    else if (meta.id === "box") body = (beat.myths || []).join("\n");
    else if (meta.id === "check") body = beat.remember || "";
    return [meta.kicker, body, meta.id];
  });
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
    if (id === "box" && beat.footnote) {
      const foot = document.createElement("p");
      foot.className = "tutor-footnote";
      foot.textContent = beat.footnote;
      sec.append(foot);
    }
    root.appendChild(sec);
  });
  if (beat.detail) {
    const sec = document.createElement("section");
    sec.className = "tutor-block";
    sec.dataset.phase = "detail";
    const h = document.createElement("h3");
    h.textContent = t("adultHeading");
    const p = document.createElement("p");
    p.textContent = beat.detail;
    sec.append(h, p);
    root.appendChild(sec);
  }
}

export function teachLesson(scene, frame, beat, { index, total, phase = 0, instant = false }) {
  const meta = LESSON_PHASES[phase] || LESSON_PHASES[0];
  frame.purpose.set(beat.purpose, index, total, {
    kicker: t("thisLesson"),
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
  syncPseudo(beat);
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

const BOOK_RE = /[A-Za-z][A-Za-z0-9_]*(?:[ :][A-Za-z0-9_][A-Za-z0-9_]*)*:?/g;
const CJK_NEAR = /[\u3040-\u30ff\u3400-\u9fff]/;

/** A single Latin letter glued to 小G / ジー is the name, not a code token. */
function strayNameToken(row, match) {
  const token = String(match[0] || "").replace(/:$/, "");
  if (token.length !== 1) return false;
  const prev = match.index > 0 ? row[match.index - 1] : "";
  const next = row[match.index + match[0].length] || "";
  return CJK_NEAR.test(prev) || CJK_NEAR.test(next);
}

function cardStyle(size, extra = {}) {
  return uiText(size, {
    align: "left",
    lineSpacing: 4,
    fontFamily: '"Fredoka", "Noto Sans SC", "Noto Sans JP", "PingFang SC", sans-serif',
    ...extra,
  });
}

function cardCopy(beat, phase) {
  const meta = LESSON_PHASES[phase] || LESSON_PHASES[0];
  const sum = String(beat?.id || "").endsWith("-sum");
  if (meta.id === "check" && sum && beat.stars?.length) {
    return { shown: beat.stars.map((line) => `⭐ ${line}`).join("\n"), reveal: null };
  }
  if (meta.id === "check" && beat.checkQ) {
    const hidden = `${beat.checkQ}\n${t("tapAnswer")}`;
    const open = [beat.checkQ, beat.checkA].filter(Boolean).join("\n");
    return { shown: hidden, reveal: open };
  }
  let body = phaseText(beat, phase);
  if (meta.id === "box" && beat.footnote) body = `${body}\n${t("asideLabel")}${beat.footnote}`;
  return { shown: body, reveal: null };
}

function fitPlain(scene, body, size, minSize, wrap, maxTextH) {
  let font = size;
  let wrapped = wrapToWidth(scene, body, font, wrap, cardStyle);
  const probe = scene.add.text(0, 0, wrapped, cardStyle(font)).setVisible(false);
  while (probe.height > maxTextH && font > minSize) {
    font -= 1;
    wrapped = wrapToWidth(scene, body, font, wrap, cardStyle);
    probe.setFontSize(font);
    probe.setText(wrapped);
  }
  let truncated = false;
  while (probe.height > maxTextH && wrapped.includes("\n")) {
    truncated = true;
    wrapped = wrapped.split("\n").slice(0, -1).join("\n");
    probe.setText(wrapped);
  }
  if (truncated) {
    const more = t("cardMore");
    let withMore = wrapped ? `${wrapped}\n${more}` : more;
    probe.setText(withMore);
    while (probe.height > maxTextH && wrapped.includes("\n")) {
      wrapped = wrapped.split("\n").slice(0, -1).join("\n");
      withMore = wrapped ? `${wrapped}\n${more}` : more;
      probe.setText(withMore);
    }
    wrapped = probe.text;
  }
  const height = probe.height;
  probe.destroy();
  return { wrapped, font, height, truncated };
}

function paintBookMarks(scene, parent, source, size, originX, originY, lineH) {
  const probe = scene.add.text(0, 0, "", cardStyle(size)).setVisible(false);
  source.split("\n").forEach((row, index) => {
    for (const match of row.matchAll(BOOK_RE)) {
      if (!match[0] || strayNameToken(row, match)) continue;
      probe.setText(row.slice(0, match.index));
      const x = probe.width;
      probe.setText(match[0]);
      const w = Math.max(8, probe.width);
      const g = scene.add.graphics();
      g.fillStyle(C.surface2, 1);
      g.fillRoundedRect(originX + x - 2, originY + index * lineH, w + 4, Math.max(size + 2, lineH - 2), 4);
      parent.add(g);
    }
  });
  probe.destroy();
}

export function drawPhaseCard(scene, stage, beat, phase, { top, reserve = 0 } = {}) {
  const meta = LESSON_PHASES[phase] || LESSON_PHASES[0];
  const rhythm = lessonRhythm(scene.frame.v);
  const phone = !isWidePcTutor();
  const cardTop = (top ?? stage.top) + rhythm;
  const width = phone ? Math.min(stage.w, 640) : Math.min(stage.w - 28, 920);
  const wrap = width - (phone ? 44 : 48);
  const copy = cardCopy(beat, phase);
  const preferred = phone ? Math.min(stage.h * 0.38, 188) : stage.h * 0.4;
  const available = stage.bottom - cardTop - rhythm;
  const yielded = available - Math.max(0, reserve);
  const maxH = Math.min(preferred, Math.max(48, yielded));
  const maxTextH = Math.max(16, maxH - 46);
  const startSize = phone ? 15 : 16;
  const shownFit = fitPlain(scene, copy.shown, startSize, 13, wrap, maxTextH);
  const revealFit = copy.reveal ? fitPlain(scene, copy.reveal, startSize, 13, wrap, maxTextH) : null;
  const font = Math.min(shownFit.font, revealFit?.font || shownFit.font);
  const textH = Math.max(shownFit.height, revealFit?.height || 0);
  const floor = Math.min(phone ? 78 : 86, maxH);
  const height = Math.min(maxH, Math.max(floor, Math.min(maxH, 36 + textH + 12)));
  const box = scene.add.container(stage.cx, cardTop + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, phone ? 14 : 18, C.surface);
  const stripe = scene.add.graphics();
  stripe.fillStyle(phaseAccent(meta.id), 1);
  stripe.fillRoundedRect(-width / 2 + 8, -height / 2 + 8, 8, height - 16, 5);
  const title = scene.add.text(-width / 2 + 22, -height / 2 + 8, meta.kicker, uiText(phone ? 13 : 14, { color: C.goldCss })).setOrigin(0, 0);
  const textX = -width / 2 + 22;
  const textY = -height / 2 + 28;
  const text = scene.add.text(textX, textY, shownFit.wrapped, cardStyle(font)).setOrigin(0, 0);
  box.add([g, stripe, title]);
  const lineCount = Math.max(1, shownFit.wrapped.split("\n").length);
  paintBookMarks(scene, box, shownFit.wrapped, font, textX, textY, text.height / lineCount);
  box.add(text);
  const paint = (source) => {
    text.setText(source);
  };
  paint(shownFit.wrapped);
  if (copy.reveal) {
    box.setSize(width, height);
    box.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    box.on("pointerdown", (pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      paint(revealFit.wrapped);
      window.__nanoGPTCard = {
        ...(window.__nanoGPTCard || {}),
        shown: revealFit.wrapped,
        revealed: true,
      };
    });
  }
  box.setSize(width, height);
  scene.frame.stage.add(box);
  window.__nanoGPTCard = {
    id: beat?.id || "",
    phase,
    full: copy.shown,
    shown: shownFit.wrapped,
    truncated: shownFit.truncated || Boolean(revealFit?.truncated),
    revealed: false,
  };
  return { bottom: cardTop + height, height };
}

export function paintLessonStage(scene, beat, phase, onPick) {
  const phone = !isWidePcTutor();
  const artW = Math.max(80, scene.frame.stageBand.w - (phone ? 16 : 32));
  const reserve = artBandReserve(beat, phase, artW) + 12;
  const tabs = drawPhaseTabs(scene, scene.frame.stageBand, phase, onPick);
  const card = drawPhaseCard(scene, scene.frame.stageBand, beat, phase, { top: tabs.bottom, reserve });
  const band = exampleBand(scene.frame.stageBand, card.bottom, scene.frame.v);
  scene.frame.lastTabs = { left: scene.frame.stageBand.left, top: scene.frame.stageBand.top, w: scene.frame.stageBand.w, h: tabs.height };
  scene.frame.lastCard = { left: scene.frame.stageBand.left, top: card.bottom - card.height, w: scene.frame.stageBand.w, h: card.height };
  scene.frame.lastExample = band;
  scene.frame.tapeRows = [];
  return { tabs, card, band };
}

export function finishLessonStage(scene, band) {
  const phone = !isWidePcTutor();
  const measured = layerBottom(scene.frame.stage, band.top);
  if (phone) {
    placeLessonCta(scene.frame, measured);
  } else {
    const cap = scene.frame.shell.footer.top - scene.frame.rhythm;
    placeLessonCta(scene.frame, Math.min(measured, cap));
  }
  const ceiling = ctaCeiling(scene.frame);
  keepStageAboveCta(scene, band, ceiling);
  const bottom = Math.min(layerBottom(scene.frame.stage, band.top), ceiling);
  scene.frame.lastExample = {
    ...band,
    bottom,
    h: Math.max(16, bottom - band.top),
  };
  installLayoutProbe(scene);
}

function phaseAccent(id) {
  if (id === "look") return C.teal;
  if (id === "do") return C.coral;
  if (id === "box") return C.gold;
  if (id === "check") return C.violet;
  return C.blue;
}

export function exampleBand(stage, cardBottom, v) {
  const rhythm = lessonRhythm(v);
  const top = cardBottom + rhythm;
  const inset = isWidePcTutor() ? 16 : 8;
  const reserve = isWidePcTutor() ? 0 : 12;
  const bottom = stage.bottom - reserve;
  return {
    ...stage,
    top,
    left: stage.left + inset,
    right: stage.right - inset,
    bottom,
    w: Math.max(80, stage.w - inset * 2),
    h: Math.max(64, bottom - top),
    cy: top + Math.max(32, (bottom - top) / 2),
  };
}
