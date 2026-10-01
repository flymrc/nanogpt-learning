import Phaser from "phaser";
import { playSfx } from "../audio/sound.js";
import { EMBED_FACTS } from "../data/embed-facts.js";
import { getLang } from "../i18n/locale.js";
import { isWidePcTutor } from "../tutor/bus.js";
import { markCaption } from "./components.js";
import { mapFrame, placeNear, projectMap, rectsOverlap } from "./embed-layout.js";
import { ctaCeiling, keepStageAboveCta, layerBottom } from "./lesson.js";
import { CAPTION_CLEAR, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText, wrapAtBreaks } from "./theme.js";

const CELL = { b: 0x1d4ed8, r: 0xb91c1c, p: 0xf3e6c8 };
const INK = "#3b2a2e";
const PAPER = "#fffdf8";
const CREAM = "#fff1d2";
const NAVY = "#1e3a8a";
const INK_N = 0x3b2a2e;

const CAPTION = {
  zh: {
    hat: "小窗打开了",
    strip: "彩色带子",
    align: "一样长",
    compare: "比一比颜色",
    tags: "贴上名字",
    class: "老师和学生",
    beans: "变成小点",
    map: "词的地图",
    podium: "从高到低",
    ropes: "绳子有长有短",
    rings: "最近的邻居",
    merge: "意思一样就靠拢",
    fan: "张开的角",
    arrows: "每个词一根箭头",
    circle: "先变成一样长",
    angles: "角越小越近",
    ruler: "角变成近分",
    quest: "整句话的箭头",
    shadow: "影子叠在一起",
    rulers: "纸上只有两根",
    squash: "不到一半",
    lift: "抬起来再看",
    trust: "看分，不看地图",
    fly: "飞到那张卡",
    twins: "长得太像了",
    rank: "名次翻开来",
    kana: "两种写法",
    needles: "词和整句话",
    oldnew: "旧的和新的",
    rules: "四条守则",
    stars: "点上星星",
  },
  ja: {
    hat: "まどが ひらく",
    strip: "色の おび",
    align: "同じ 長さ",
    compare: "色を くらべる",
    tags: "名前を はる",
    class: "先生と 生徒",
    beans: "点が ころがる",
    map: "ことばの 地図",
    podium: "高い 順",
    ropes: "なわの 長さ",
    rings: "いちばん 近い 人",
    merge: "同じ いみが そろう",
    fan: "ひらく 角",
    arrows: "語は 1本の 矢",
    circle: "長さを そろえる",
    angles: "角が 小さいほど 近い",
    ruler: "角が 点数に なる",
    quest: "文の 矢",
    shadow: "かげが かさなる",
    rulers: "ものさしは 2本",
    squash: "半分より 少ない",
    lift: "持ち上げて 見る",
    trust: "点数を 見る",
    fly: "カードへ とぶ",
    twins: "そっくり",
    rank: "順位を ひらく",
    kana: "2つの 書き方",
    needles: "語と 文",
    oldnew: "ふるい カードと 新しい カード",
    rules: "四つの きまり",
    stars: "星を つける",
  },
};

const HOUSE = [0xf0a35e, 0x5eb3ff, 0x8d93a8, 0xe7b23c, 0xf29bb8, 0xb79bdc];

export function embedArtReserve(_page, _phase, width = 320) {
  return width < 720 ? 320 : 420;
}

export function embedExpectedArt() {
  return {
    visual: "embed",
    parts: [
      { part: "scheme", min: 1 },
      { part: "scheme-label", min: 1 },
    ],
  };
}

function lang() {
  return getLang() === "ja" ? "ja" : "zh";
}

function fonts() {
  const phone = !isWidePcTutor();
  return { main: phone ? 13 : 16, sub: phone ? 12 : 13, body: phone ? 14 : 15 };
}

function needleCount(spec) {
  const alone = Array.isArray(spec.alone) ? spec.alone.length : spec.alone ? 1 : 0;
  return alone + (spec.meaning || spec.sentence || []).length + (spec.sides || []).length;
}

function lastStep(spec) {
  if (spec.kind === "lift") return 2;
  if (spec.kind === "map") return Math.max(1, (spec.groups || []).length);
  if (spec.kind === "rings") return Math.max(1, (spec.groups || []).length - 1);
  if (spec.kind === "ruler") return Math.max(1, (spec.items || []).length);
  if (spec.kind === "angles") return Math.max(1, (spec.items || []).length - 1);
  if (spec.kind === "rules" || spec.kind === "stars") return Math.max(1, (spec.lines || []).length - 1);
  if (spec.kind === "needles" || spec.kind === "quest") return Math.max(1, Math.ceil(needleCount(spec) / 3) - 1);
  const listed = spec.items || spec.tags || [];
  if (listed.length > 3) return Math.max(1, Math.ceil(listed.length / 3) - 1);
  return 1;
}

function pageSlice(list, step, per = 3) {
  const rows = list || [];
  if (rows.length <= per) return rows;
  const pages = Math.ceil(rows.length / per);
  const index = Math.min(Math.max(0, step), pages - 1);
  return rows.slice(index * per, index * per + per);
}

function glossParts(label) {
  const raw = String(label || "").trim();
  const match = raw.match(/^(.*?)〔([^〕]+)〕$/);
  if (!match) return { main: raw, sub: "" };
  return { main: match[1].trim(), sub: match[2].trim() };
}

function wordFace(word) {
  const gloss = EMBED_FACTS.gloss[word];
  if (gloss && lang() === "ja") return `${gloss}〔${word}〕`;
  return String(word || "");
}

function pairLines(item) {
  const a = glossParts(item?.aLabel || item?.label || "");
  const b = glossParts(item?.bLabel || "");
  return {
    main: b.main ? `${a.main}–${b.main}` : a.main,
    sub: [a.sub, b.sub].filter(Boolean).join(" · "),
  };
}

function hexFill(fill) {
  return `#${Number(fill).toString(16).padStart(6, "0").slice(-6)}`;
}

function lookOf(kind) {
  if (["hat", "strip", "align", "compare", "tags", "class"].includes(kind)) return "desk";
  if (["beans", "map", "podium", "ropes", "rings", "merge"].includes(kind)) return "village";
  if (["fan", "arrows", "circle", "angles", "ruler", "quest"].includes(kind)) return "yard";
  if (["shadow", "rulers", "squash", "lift", "trust", "fly"].includes(kind)) return "night";
  return "hall";
}

function ceilingOf(scene, stage) {
  return Math.min(stage.bottom - 2, ctaCeiling(scene.frame) - 4);
}

function voiceNoteWorld(scene) {
  const note = typeof document !== "undefined" ? document.getElementById("voice-note") : null;
  if (!note) return null;
  const style = getComputedStyle(note);
  if (style.display === "none" || style.visibility === "hidden") return null;
  if (style.position !== "absolute" && style.position !== "fixed") return null;
  const rect = note.getBoundingClientRect();
  const canvas = scene.game?.canvas?.getBoundingClientRect?.();
  if (!canvas || rect.width < 2 || rect.height < 2) return null;
  const box = {
    left: rect.left - canvas.left,
    top: rect.top - canvas.top,
    right: rect.right - canvas.left,
    bottom: rect.bottom - canvas.top,
  };
  if (box.bottom < 4 || box.right < 4 || box.top > canvas.height - 2 || box.left > canvas.width - 2) return null;
  return box;
}

function trackTween(scene, config) {
  if (!scene.__embedAnimate) return;
  scene.__embedTweenLeft = (scene.__embedTweenLeft || 0) + 1;
  window.__nanoGPTRagSettled = false;
  const prev = config.onComplete;
  scene.tweens.add({
    ...config,
    onComplete: (...args) => {
      if (typeof prev === "function") prev(...args);
      scene.__embedTweenLeft = Math.max(0, (scene.__embedTweenLeft || 1) - 1);
      if (scene.__embedTweenLeft <= 0) window.__nanoGPTRagSettled = true;
    },
  });
}

function wrapLine(scene, text, size, maxW) {
  return wrapAtBreaks(scene, text, size, maxW, (n) => uiText(n, { color: INK, align: "center" }), {
    latinWhole: true,
    glue: true,
  });
}

function addText(scene, parent, x, y, text, size, maxW, { color = INK, bg = PAPER, originY = 0.5, originX = 0.5 } = {}) {
  const font = Math.max(fonts().sub, size);
  const body = wrapLine(scene, text, font, maxW);
  const node = scene.add.text(x, y, body, uiText(font, { color, align: originX === 0 ? "left" : "center" })).setOrigin(originX, originY);
  node.setData("source", text);
  node.setData("wrapWidth", maxW);
  node.setData("stageFg", color);
  node.setData("stageBg", bg);
  parent.add(node);
  return node;
}

function plate(scene, parent, x, y, w, h, fill) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, Math.min(14, h * 0.22));
  g.lineStyle(3, INK_N, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, Math.min(14, h * 0.22));
  box.add(g);
  box.setData("width", w);
  box.setData("height", h);
  box.setData("stageRole", "card");
  box.setData("stageBg", hexFill(fill));
  parent.add(box);
  return box;
}

function helperRect(w, h) {
  const ah = Math.round(h * 0.34);
  const aw = Math.round(Math.min(w * 0.3, Math.max(68, ah * 0.66)));
  return { x: -w / 2 + 8, y: h / 2 - ah - 8, w: aw, h: ah };
}

function addSolid(scene, parent, x, y, w, h, id) {
  const zone = scene.add.zone(x + w / 2, y + h / 2, w, h);
  zone.setData("stageRole", "solid");
  zone.setData("stageId", id);
  zone.setData("width", w);
  zone.setData("height", h);
  parent.add(zone);
  return zone;
}

function seatClear(x, y, w, h, taken, bounds, gap = 12) {
  let best = null;
  const step = 8;
  const y0 = bounds.y + h / 2 + 2;
  const y1 = bounds.y + bounds.h - h / 2 - 2;
  const x0 = bounds.x + w / 2 + 2;
  const x1 = bounds.x + bounds.w - w / 2 - 2;
  for (let py = y0; py <= y1 + 0.1; py += step) {
    for (let px = x0; px <= x1 + 0.1; px += step) {
      const rect = { x: px - w / 2, y: py - h / 2, w, h };
      if (taken.some((ob) => rectsOverlap(rect, ob, gap))) continue;
      const dist = Math.hypot(px - x, py - y);
      if (!best || dist < best.dist) best = { x: px, y: py, dist };
    }
  }
  if (!best) return null;
  taken.push({ x: best.x - w / 2, y: best.y - h / 2, w, h });
  return best;
}

function seatNear(x, y, w, h, taken, bounds) {
  let best = null;
  const step = 10;
  const y0 = bounds.y + h / 2 + 2;
  const y1 = bounds.y + bounds.h - h / 2 - 2;
  const x0 = bounds.x + w / 2 + 2;
  const x1 = bounds.x + bounds.w - w / 2 - 2;
  for (let py = y0; py <= y1; py += step) {
    for (let px = x0; px <= x1; px += step) {
      const rect = { x: px - w / 2, y: py - h / 2, w, h };
      if (taken.some((ob) => rectsOverlap(rect, ob, 6))) continue;
      const dist = Math.hypot(px - x, py - y);
      if (!best || dist < best.dist) best = { x: px, y: py, dist };
    }
  }
  if (!best) return { x, y };
  taken.push({ x: best.x - w / 2, y: best.y - h / 2, w, h });
  return best;
}

function contentRect(w, h, block) {
  const y = -h / 2 + 8;
  const bottom = block.y - 8;
  return { x: -w / 2 + 8, y, w: Math.max(80, w - 16), h: Math.max(64, bottom - y) };
}

function backdrop(g, w, h, look) {
  if (look === "desk") {
    g.fillStyle(0xf3d7b5, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h * 0.72, 18);
    g.fillStyle(0xc9845a, 1);
    g.fillRect(-w / 2, h * 0.18, w, h * 0.32);
  g.fillStyle(0xffe566, 1);
  g.fillCircle(-w * 0.32, -h * 0.3, Math.min(22, h * 0.06));
    return;
  }
  if (look === "night") {
    g.fillStyle(0x24345c, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h * 0.62, 18);
    g.fillStyle(0xfff1c7, 1);
    g.fillCircle(w * 0.3, -h * 0.3, Math.min(20, h * 0.05));
    g.fillStyle(0x3c4f34, 1);
    g.fillEllipse(0, h * 0.34, w * 0.96, h * 0.28);
    return;
  }
  if (look === "yard") {
    g.fillStyle(0xb7e4ff, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h * 0.58, 18);
    g.fillStyle(0xffe566, 1);
    g.fillCircle(w * 0.34, -h * 0.32, Math.min(22, h * 0.055));
    g.fillStyle(0x8fd18a, 1);
    g.fillEllipse(0, h * 0.32, w * 0.96, h * 0.3);
    return;
  }
  if (look === "hall") {
    g.fillStyle(0xf7d7e4, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h * 0.34, 18);
    g.fillStyle(0x6d4a86, 1);
    g.fillRect(-w / 2, -h * 0.18, 28, h * 0.5);
    g.fillRect(w / 2 - 28, -h * 0.18, 28, h * 0.5);
    g.fillStyle(0xf0e2c4, 1);
    g.fillRect(-w / 2, h * 0.16, w, h * 0.34);
    return;
  }
  g.fillStyle(0xb7e4ff, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h * 0.62, 18);
  g.fillStyle(0xffe566, 1);
  g.fillCircle(w * 0.32, -h * 0.32, Math.min(22, h * 0.05));
  g.fillStyle(0x86de7a, 1);
  g.fillEllipse(0, h * 0.34, w * 0.92, h * 0.28);
  g.fillStyle(0x5fc46d, 1);
  g.fillEllipse(-w * 0.22, h * 0.38, w * 0.46, h * 0.16);
}

function drawKid(g, w, h, pose) {
  const hw = w / 2;
  const hh = h / 2;
  const headR = Math.min(w * 0.32, h * 0.15);
  const headCy = -hh + Math.max(headR + 6, h * 0.24);
  const inkW = Math.max(3, h * 0.014);
  g.fillStyle(0x1d4ed8, 1);
  g.fillRoundedRect(-headR * 0.42, -hh + 1, headR * 0.84, Math.max(8, headCy - headR - (-hh) - 1), 4);
  g.fillStyle(0x3b82f6, 1);
  g.fillRoundedRect(-headR * 1.2, headCy - headR - h * 0.045, headR * 2.4, h * 0.07, 5);
  g.lineStyle(inkW, INK_N, 1);
  g.strokeRoundedRect(-headR * 1.2, headCy - headR - h * 0.045, headR * 2.4, h * 0.07, 5);
  g.fillStyle(0xffe1c4, 1);
  g.fillCircle(0, headCy, headR);
  g.lineStyle(inkW, INK_N, 1);
  g.strokeCircle(0, headCy, headR);
  g.fillStyle(INK_N, 1);
  g.fillCircle(-headR * 0.34, headCy - headR * 0.08, Math.max(2.2, headR * 0.12));
  g.fillCircle(headR * 0.34, headCy - headR * 0.08, Math.max(2.2, headR * 0.12));
  g.lineStyle(inkW, 0xe24b57, 1);
  g.beginPath();
  g.arc(0, headCy + headR * 0.18, headR * 0.42, 0.25, Math.PI - 0.25, false);
  g.strokePath();
  const bodyTop = headCy + headR * 0.62;
  const bodyW = Math.min(w * 0.86, headR * 3.1);
  const bodyH = Math.max(18, hh - 8 - bodyTop - h * 0.16);
  g.fillStyle(0x5eb3ff, 1);
  g.fillRoundedRect(-bodyW / 2, bodyTop, bodyW, bodyH, 12);
  g.lineStyle(inkW, INK_N, 1);
  g.strokeRoundedRect(-bodyW / 2, bodyTop, bodyW, bodyH, 12);
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-bodyW * 0.28, bodyTop + bodyH * 0.28, bodyW * 0.56, bodyH * 0.42, 6);
  g.lineStyle(Math.max(2, inkW * 0.7), INK_N, 1);
  g.strokeRoundedRect(-bodyW * 0.28, bodyTop + bodyH * 0.28, bodyW * 0.56, bodyH * 0.42, 6);
  const legTop = bodyTop + bodyH - 2;
  const legW = Math.max(8, bodyW * 0.24);
  const legH = Math.max(8, hh - 2 - legTop);
  g.fillStyle(0x1e3a8a, 1);
  g.fillRoundedRect(-bodyW * 0.32, legTop, legW, legH, 5);
  g.fillRoundedRect(bodyW * 0.32 - legW, legTop, legW, legH, 5);
  g.fillStyle(0x3b2a2e, 1);
  g.fillRoundedRect(-bodyW * 0.36, hh - 7, legW + 4, 6, 3);
  g.fillRoundedRect(bodyW * 0.36 - legW - 4, hh - 7, legW + 4, 6, 3);
  const shoulderX = bodyW * 0.46;
  const shoulderY = bodyTop + bodyH * 0.22;
  let handX = hw - 3;
  let handY = -hh + h * 0.58;
  if (pose === "point") {
    handX = hw - 2;
    handY = -hh + h * 0.16;
  } else if (pose === "protractor") {
    handX = hw - 3;
    handY = -hh + 6;
  } else if (pose === "hold" || pose === "crank") {
    handX = hw - 4;
    handY = -hh + h * 0.56;
  }
  const arm = Math.max(6, h * 0.045);
  g.lineStyle(arm, 0xffe1c4, 1);
  g.beginPath();
  g.moveTo(shoulderX * 0.2, shoulderY);
  g.lineTo(handX, handY);
  g.strokePath();
  g.fillStyle(0xffe1c4, 1);
  g.fillCircle(handX, handY, Math.max(5, h * 0.04));
  g.lineStyle(Math.max(2, inkW * 0.7), INK_N, 1);
  g.strokeCircle(handX, handY, Math.max(5, h * 0.04));
  if (pose === "crank") {
    g.lineStyle(Math.max(3, h * 0.02), INK_N, 1);
    g.strokeCircle(handX, handY, Math.max(9, h * 0.055));
    g.beginPath();
    g.moveTo(handX, handY);
    g.lineTo(handX + Math.min(14, w * 0.12), handY - Math.min(16, h * 0.08));
    g.strokePath();
  }
  if (pose === "protractor") {
    g.lineStyle(arm, 0xffe1c4, 1);
    g.beginPath();
    g.moveTo(-shoulderX * 0.15, shoulderY);
    g.lineTo(handX - w * 0.22, handY + h * 0.06);
    g.strokePath();
    g.fillStyle(0xffe1c4, 1);
    g.fillCircle(handX - w * 0.22, handY + h * 0.06, Math.max(5, h * 0.035));
  }
}

function robot(scene, parent, rect, pose = "point") {
  const box = scene.add.container(rect.x + rect.w / 2, rect.y + rect.h / 2);
  const g = scene.add.graphics();
  drawKid(g, rect.w, rect.h, pose);
  box.add(g);
  box.setData("width", rect.w);
  box.setData("height", rect.h);
  box.setData("stageRole", "actor");
  box.setData("stageId", "robot");
  parent.add(box);
  return box;
}

function machine(g, x, y, w, h, { open = true, lit = true } = {}) {
  g.fillStyle(0x3b82f6, 1);
  g.fillRoundedRect(x, y, w, h, 16);
  g.lineStyle(4, INK_N, 1);
  g.strokeRoundedRect(x, y, w, h, 16);
  g.fillStyle(0x1d4ed8, 1);
  g.fillRoundedRect(x + w * 0.12, y - h * 0.12, w * 0.76, h * 0.18, 8);
  g.fillRect(x + w * 0.46, y - h * 0.22, w * 0.08, h * 0.12);
  const winX = x + w * 0.22;
  const winY = y + h * 0.28;
  const winW = w * 0.56;
  const winH = h * 0.42;
  g.fillStyle(open ? 0xfffdf8 : 0x1e3a8a, 1);
  g.fillRoundedRect(winX, winY, winW, winH, 8);
  g.lineStyle(3, INK_N, 1);
  g.strokeRoundedRect(winX, winY, winW, winH, 8);
  if (open) {
    g.fillStyle(0xffe1c4, 1);
    g.fillCircle(winX + winW * 0.5, winY + winH * 0.48, Math.min(winW, winH) * 0.28);
    g.fillStyle(INK_N, 1);
    g.fillCircle(winX + winW * 0.4, winY + winH * 0.42, 2.5);
    g.fillCircle(winX + winW * 0.6, winY + winH * 0.42, 2.5);
  }
  g.fillStyle(lit ? 0xffe566 : 0xf3e6c8, 1);
  g.fillCircle(x + w * 0.82, y + h * 0.22, Math.min(12, h * 0.08));
  g.lineStyle(2, INK_N, 1);
  g.strokeCircle(x + w * 0.82, y + h * 0.22, Math.min(12, h * 0.08));
  const crank = { x: x + Math.min(18, w * 0.08), y: y + h * 0.62 };
  g.lineStyle(Math.max(4, h * 0.025), INK_N, 1);
  g.strokeCircle(crank.x, crank.y, Math.min(16, h * 0.07));
  g.fillStyle(0xfff1d2, 1);
  g.fillCircle(crank.x, crank.y, Math.min(6, h * 0.03));
  return { x: winX, y: winY, w: winW, h: winH, cx: winX + winW / 2, cy: winY + winH / 2, crank };
}

function cells(g, x, y, list, size, count = null) {
  const n = count == null ? list.length : count;
  for (let index = 0; index < n; index += 1) {
    const band = list[index];
    const left = x + index * (size + 6);
    g.fillStyle(band ? CELL[band] || CELL.p : 0xfffdf8, 1);
    g.fillRoundedRect(left, y, size, size, 6);
    g.lineStyle(3, INK_N, 1);
    g.strokeRoundedRect(left, y, size, size, 6);
  }
}

function angleOf(a, b, points) {
  const keys = [`zh:${a}|${b}`, `en:${a}|${b}`, `cross_language:${a}|${b}`, `rag_link_words:${a}|${b}`];
  for (const key of keys) {
    if (typeof EMBED_FACTS.angles[key] === "number") return EMBED_FACTS.angles[key];
  }
  const cosine = Math.min(1, Math.max(-1, Number(points) / 100));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function ray(cx, cy, radius, degrees) {
  const rad = (degrees * Math.PI) / 180;
  return { x: cx + Math.sin(rad) * radius, y: cy - Math.cos(rad) * radius };
}

function arrowTo(g, x0, y0, x1, y1, color, width = 5) {
  g.lineStyle(width, color, 1);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.strokePath();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const ah = Math.max(12, width * 2.1);
  g.fillStyle(color, 1);
  g.fillTriangle(
    x1,
    y1,
    x1 - Math.cos(ang - 0.45) * ah,
    y1 - Math.sin(ang - 0.45) * ah,
    x1 - Math.cos(ang + 0.45) * ah,
    y1 - Math.sin(ang + 0.45) * ah,
  );
}

function wedge(g, cx, cy, radius, degrees, color, width = 4) {
  const end = (Math.min(170, Math.max(0, degrees)) * Math.PI) / 180;
  g.fillStyle(color, 0.3);
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + end, false);
  g.closePath();
  g.fillPath();
  g.lineStyle(width, color, 1);
  const start = ray(cx, cy, radius, 0);
  const stop = ray(cx, cy, radius, degrees);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(start.x, start.y);
  g.moveTo(cx, cy);
  g.lineTo(stop.x, stop.y);
  g.strokePath();
}

function scorePill(scene, parent, x, y, points, bg = 0x1e3a8a) {
  const w = 56;
  const h = 32;
  const pill = plate(scene, parent, x, y, w, h, bg);
  pill.setData("stageId", "score");
  addText(scene, pill, 0, 0, String(points), 16, w - 10, { color: "#ffffff", bg: NAVY });
  return pill;
}

function labelBlock(scene, parent, x, y, maxW, lines, { bg = PAPER, hot = false } = {}) {
  const face = fonts();
  const main = lines.main || (lang() === "ja" ? "ことば" : "词");
  const sub = lines.sub || "";
  const mainNode = addText(scene, parent, x, y, main, face.main, maxW, { bg: hot ? CREAM : bg });
  let subNode = null;
  if (sub) subNode = addText(scene, parent, x, y, sub, face.sub, maxW, { bg: hot ? CREAM : bg });
  if (subNode) {
    const gap = 3;
    const total = mainNode.height + gap + subNode.height;
    mainNode.setY(y - total / 2 + mainNode.height / 2);
    subNode.setY(y + total / 2 - subNode.height / 2);
  }
  return mainNode.height + (subNode ? subNode.height + 3 : 0);
}

function paintBarRows(scene, host, area, rows) {
  const list = rows.length ? rows : [{ lines: { main: lang() === "ja" ? "ことば" : "词", sub: "" }, points: "" }];
  const gap = 8;
  const n = list.length;
  const rh = Math.max(44, (area.h - gap * (n - 1)) / n);
  const total = n * rh + gap * (n - 1);
  const top = area.y + Math.max(0, (area.h - total) / 2);
  list.forEach((row, index) => {
    const y = top + rh / 2 + index * (rh + gap);
    const hot = Boolean(row.hot);
    const box = plate(scene, host, area.x + area.w / 2, y, area.w, rh, hot ? 0xfff1d2 : 0xfffdf8);
    box.setData("stageId", `row-${index}`);
    const scoreW = row.points === "" || row.points == null ? 0 : 64;
    const labelW = Math.max(24, area.w - scoreW - 36);
    labelBlock(scene, box, -area.w / 2 + 10 + labelW / 2, 0, labelW, row.lines, { hot });
    if (scoreW) scorePill(scene, box, area.w / 2 - 36, 0, row.points);
  });
}

function rowsFromItems(items, step) {
  return pageSlice(items, step, 3).map((item, index) => ({
    lines: pairLines(item),
    points: item.points,
    hot: index === 0,
  }));
}

function paintStripScene(scene, host, g, w, h, spec, step) {
  const strip = spec.kind === "strip";
  const into = step > 0 && strip;
  const face = fonts();
  const margin = 10;
  const ah = Math.round(Math.min(h - 16, h * 0.36));
  const aw = Math.round(Math.min(w * 0.26, Math.max(70, ah * 0.64)));
  let machineH = Math.round(strip ? Math.min(h * 0.4, Math.max(ah + 4, h * 0.36)) : Math.min(h * 0.62, Math.max(ah + 8, h * 0.52)));
  let machineW = Math.round(Math.min(w * 0.46, Math.max(160, machineH * 1.2)));
  if (aw + machineW > w - margin * 2) machineW = Math.max(120, w - margin * 2 - aw + 8);
  const hatStick = machineH * 0.24;
  const outputTail = strip ? 36 + 26 + 24 : 0;
  const outputCell = strip ? Math.max(36, Math.min(h * 0.22, Math.floor((w - margin * 2 - 42) / 8))) : 0;
  const blockH = hatStick + machineH + (strip ? 8 + outputCell + outputTail : 0);
  const top = strip ? -h / 2 + margin : Math.max(-h / 2 + hatStick + 4, -blockH / 2);
  const machineY = top + (strip ? hatStick : 0);
  const mx = Math.round(-machineW / 2 + aw * 0.2);
  const crankX = mx + Math.min(18, machineW * 0.08);
  const crankY = machineY + machineH * 0.62;
  const kid = {
    x: Math.max(-w / 2 + 4, Math.min(w / 2 - aw - 4, crankX - aw + 4)),
    y: Math.max(-h / 2 + 4, Math.min(h / 2 - ah - 4, crankY - ah * 0.56)),
    w: aw,
    h: ah,
  };
  robot(scene, host, kid, strip ? "crank" : "hold");
  const win = machine(g, mx, machineY, machineW, machineH, { open: true, lit: into || spec.kind === "hat" || step > 0 });
  addSolid(scene, host, mx, machineY, machineW, machineH, "machine");
  if (!into) {
    const tagW = 62;
    const tagH = 28;
    const tag = plate(scene, host, mx + machineW - tagW / 2 - 12, machineY + machineH - tagH / 2 - 12, tagW, tagH, 0xffc43d);
    tag.setData("stageId", "machine-tag");
    addText(scene, tag, 0, 0, lang() === "ja" ? "まど" : "小窗", 14, tagW - 10, { bg: "#ffc43d" });
  }
  const word = spec.item?.label || (lang() === "ja" ? "朝ごはん〔breakfast〕" : "早饭");
  const parts = glossParts(word);
  const cardW = Math.min(160, Math.max(104, Math.min(win.w - 8, aw)));
  const cardH = parts.sub ? 56 : 44;
  const handX = kid.x + kid.w - 4;
  const handY = kid.y + ah * 0.56;
  let homeX = handX;
  let homeY = handY - cardH * 0.15;
  homeX = Math.max(-w / 2 + cardW / 2 + 4, Math.min(w / 2 - cardW / 2 - 4, homeX));
  homeY = Math.max(-h / 2 + cardH / 2 + 4, Math.min(machineY + machineH * 0.42, homeY));
  const flyW = Math.min(cardW, Math.max(88, win.w - 8));
  const card = plate(
    scene,
    host,
    into ? win.cx : homeX,
    into ? win.cy : homeY,
    into ? flyW : cardW,
    cardH,
    0xfffdf8,
  );
  card.setData("stageId", "word-card");
  labelBlock(scene, card, 0, 0, (into ? flyW : cardW) - 14, parts);
  if (scene.__embedAnimate && into) {
    card.setPosition(homeX, homeY);
    trackTween(scene, { targets: card, x: win.cx, y: win.cy, duration: 420, ease: "Cubic.in" });
  }
  if (!strip) return;
  const bands = spec.item?.cells || [];
  const tailH = 36;
  const rulerH = 24;
  const gap = 8;
  const bandTop = machineY + machineH + gap;
  const bandBottom = h / 2 - margin;
  const chrome = tailH + rulerH + gap * 2;
  const cellCap = Math.max(32, bandBottom - bandTop - chrome);
  const size = Math.max(28, Math.min(cellCap, Math.floor((w - margin * 2 - 7 * 6) / 8)));
  const rowW = 8 * size + 7 * 6;
  const sx = -rowW / 2;
  const sy = bandTop;
  g.fillStyle(0xfff6e4, 1);
  g.fillRoundedRect(sx - 8, sy - 6, rowW + 16, size + 12, 12);
  g.lineStyle(3, INK_N, 1);
  g.strokeRoundedRect(sx - 8, sy - 6, rowW + 16, size + 12, 12);
  if (into) {
    cells(g, sx, sy, bands, size, 8);
    if (scene.__embedAnimate) {
      for (let i = 0; i < 8; i += 1) {
        const flash = scene.add.rectangle(sx + i * (size + 6) + size / 2, sy + size / 2, size, size, CELL[bands[i]] || CELL.p, 0);
        host.add(flash);
        trackTween(scene, { targets: flash, alpha: 1, duration: 140, delay: 420 + i * 50 });
      }
    }
  }
  const rest = Math.max(0, (spec.dim || 384) - 8);
  const tail = into ? (lang() === "ja" ? `あと ${rest}` : `还有 ${rest} 个`) : (lang() === "ja" ? "まだ" : "等一下");
  const tailY = sy + size + gap + tailH / 2;
  const tailW = Math.min(w - margin * 2, Math.max(rowW, 180));
  const tailBox = plate(scene, host, 0, tailY, tailW, tailH, 0xfff1d2);
  tailBox.setData("stageId", "strip-tail");
  addText(scene, tailBox, 0, 0, tail, face.body, tailW - 16, { bg: CREAM });
  const badgeW = 72;
  const rulerW = Math.max(72, Math.min(w - margin * 2 - badgeW - 12, rowW - badgeW));
  const rulerX = -(rulerW + 10 + badgeW) / 2;
  const rulerY = tailY + tailH / 2 + gap;
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(rulerX, rulerY, rulerW, rulerH, 8);
  g.lineStyle(3, INK_N, 1);
  g.strokeRoundedRect(rulerX, rulerY, rulerW, rulerH, 8);
  g.lineStyle(2, INK_N, 1);
  for (let tick = 0; tick <= 8; tick += 1) {
    const tx = rulerX + 8 + ((rulerW - 16) * tick) / 8;
    g.beginPath();
    g.moveTo(tx, rulerY);
    g.lineTo(tx, rulerY + (tick % 4 === 0 ? rulerH : rulerH * 0.55));
    g.strokePath();
  }
  const dimBadge = plate(scene, host, rulerX + rulerW + 10 + badgeW / 2, rulerY + rulerH / 2, badgeW, 32, 0xffc43d);
  dimBadge.setData("stageId", "dim-badge");
  addText(scene, dimBadge, 0, 0, String(spec.dim || 384), 16, 60, { bg: "#ffc43d" });
}

function paintDesk(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const face = fonts();
  if (spec.kind === "hat" || spec.kind === "strip") {
    paintStripScene(scene, host, g, w, h, spec, step);
    return;
  } else if (spec.kind === "align" || spec.kind === "compare" || spec.kind === "class") {
    const items = spec.items || [];
    const gap = 8;
    const rh = (area.h - gap * (items.length - 1)) / Math.max(1, items.length);
    items.forEach((item, index) => {
      const y = area.y + rh / 2 + index * (rh + gap);
      const boxH = Math.max(48, rh - 2);
      const box = plate(scene, host, area.x + area.w / 2, y, area.w, boxH, 0xfffdf8);
      const size = Math.min(26, Math.max(14, Math.floor((area.w - 24 - 7 * 6) / 8)));
      const cellsW = 8 * size + 7 * 6;
      // Short desktop rows cannot stack a bilingual label above the cells.
      // Use the available width while retaining both labels and their font size.
      const compact = boxH < 80 && area.w >= 400;
      const labelW = Math.max(72, area.w - (compact ? cellsW + 120 : 108));
      const labelY = compact ? 0 : -boxH * 0.22;
      labelBlock(scene, box, -area.w / 2 + 12 + labelW / 2, labelY, labelW, glossParts(item.label));
      const badge = spec.kind === "class" && spec.showSame && index === 0 ? `${spec.same}/${spec.cells}` : String(spec.dim || 384);
      const pill = plate(scene, box, area.w / 2 - 42, labelY, 68, 30, 0xffc43d);
      addText(scene, pill, 0, 0, badge, 14, 58, { bg: "#ffc43d" });
      const sx = compact ? area.w / 2 - 92 - cellsW : -cellsW / 2;
      const sy = compact ? -size / 2 : Math.min(boxH * 0.18, boxH / 2 - size - 4);
      cells(box.list[0], sx, sy, item.cells || [], size);
      if (spec.kind === "compare" && index > 0) {
        const first = items[0]?.cells || [];
        const ink = box.list[0];
        (item.cells || []).forEach((band, cell) => {
          if (band === first[cell]) return;
          ink.lineStyle(3, 0xe24b57, 1);
          ink.strokeRoundedRect(sx + cell * (size + 6) - 1, sy - 1, size + 2, size + 2, 5);
        });
      }
    });
  } else if (spec.kind === "tags") {
    const tags = spec.tags || [];
    const gap = 8;
    const rh = (area.h - gap * (tags.length - 1)) / Math.max(1, tags.length);
    tags.forEach((tag, index) => {
      const on = index <= step;
      const y = area.y + rh / 2 + index * (rh + gap);
      const box = plate(scene, host, area.x + area.w / 2, y, area.w, rh, on ? 0xfff1d2 : 0xfffdf8);
      addText(scene, box, 0, 0, on ? tag : (lang() === "ja" ? "なまえ" : "名字"), face.main, area.w - 20, { bg: on ? CREAM : PAPER });
      g.fillStyle(0x86de7a, 1);
      g.fillRoundedRect(area.x + 18, y - 8, area.w * 0.18, 16, 6);
    });
  }
  robot(scene, host, block);
}

function paintBeans(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const count = spec.count || 20;
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(area.x, area.y, area.w, area.h * 0.78, 16);
  g.lineStyle(3, INK_N, 1);
  g.strokeRoundedRect(area.x, area.y, area.w, area.h * 0.78, 16);
  const cols = 10;
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = area.x + 22 + col * ((area.w - 36) / cols);
    const y = area.y + 28 + row * 34 + (step ? 16 : 0);
    g.fillStyle(i % 2 ? 0xf0a35e : 0x1d4ed8, 1);
    g.fillCircle(x, y, step ? 7 : 11);
    g.lineStyle(2, INK_N, 1);
    g.strokeCircle(x, y, step ? 7 : 11);
  }
  const badge = plate(scene, host, area.x + area.w / 2, area.y + area.h - 24, 72, 36, 0xffc43d);
  addText(scene, badge, 0, 0, String(count), 16, 60, { bg: "#ffc43d" });
  robot(scene, host, block);
}

function house(g, x, y, s, wall) {
  g.fillStyle(wall, 1);
  g.fillRoundedRect(x - s, y - s * 0.2, s * 2, s * 1.1, 3);
  g.fillStyle(0xb91c1c, 1);
  g.fillTriangle(x - s * 1.2, y - s * 0.1, x + s * 1.2, y - s * 0.1, x, y - s * 1.15);
  g.fillStyle(0xfffdf8, 1);
  g.fillRect(x - s * 0.28, y + s * 0.15, s * 0.56, s * 0.5);
}

function labelForWord(spec, word) {
  for (const group of spec.groups || []) {
    for (const item of group.words || []) {
      if (item.word === word) return item.label;
    }
  }
  for (const item of spec.items || []) {
    if (item.a === word) return item.aLabel;
    if (item.b === word) return item.bLabel;
  }
  return wordFace(word);
}

function measureSticker(scene, lines, fontMain, fontSub) {
  const face = fonts();
  const mainSize = fontMain || face.main;
  const subSize = fontSub || face.sub;
  const main = scene.add.text(0, 0, lines.main || "·", uiText(mainSize, { color: INK, align: "center" })).setOrigin(0.5, 0.5);
  main.setData("source", lines.main || "·");
  main.setData("stageFg", INK);
  main.setData("stageBg", PAPER);
  let sub = null;
  if (lines.sub) {
    sub = scene.add.text(0, 0, lines.sub, uiText(subSize, { color: INK, align: "center" })).setOrigin(0.5, 0.5);
    sub.setData("source", lines.sub);
    sub.setData("stageFg", INK);
    sub.setData("stageBg", PAPER);
  }
  const w = Math.ceil(Math.max(main.width, sub?.width || 0) + 12);
  const h = Math.ceil(main.height + (sub ? sub.height + 3 : 0) + 8);
  return { w, h, main, sub };
}

function seatLines(main, sub) {
  if (!sub) {
    main.setPosition(0, 0);
    return;
  }
  const gap = 3;
  const total = main.height + gap + sub.height;
  main.setPosition(0, -total / 2 + main.height / 2);
  sub.setPosition(0, total / 2 - sub.height / 2);
}

function insidePaper(pt, bounds, pad = 8) {
  return pt && pt.x >= bounds.x + pad && pt.x <= bounds.x + bounds.w - pad && pt.y >= bounds.y + pad && pt.y <= bounds.y + bounds.h - pad;
}

function clampEllipse(cx, cy, ew, eh, bounds) {
  const pad = 10;
  const minX = bounds.x + pad;
  const maxX = bounds.x + bounds.w - pad;
  const minY = bounds.y + pad;
  const maxY = bounds.y + bounds.h - pad;
  const x0 = Math.max(minX, cx - ew / 2);
  const x1 = Math.min(maxX, cx + ew / 2);
  const y0 = Math.max(minY, cy - eh / 2);
  const y1 = Math.min(maxY, cy + eh / 2);
  const width = Math.max(28, x1 - x0);
  const height = Math.max(24, y1 - y0);
  return { cx: x0 + width / 2, cy: y0 + height / 2, ew: width, eh: height };
}

function paintMap(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const bounds = { x: -w / 2 + 4, y: -h / 2 + 4, w: w - 8, h: Math.max(120, h - block.h * 0.7) };
  if (spec.kind === "lift") {
    g.fillStyle(0x86de7a, 1);
    g.fillEllipse(0, h * 0.34, w * 0.96, h * 0.28);
    g.fillStyle(0x5fc46d, 1);
    g.fillEllipse(-w * 0.22, h * 0.38, w * 0.46, h * 0.16);
  }
  const coords = EMBED_FACTS.map[spec.mapKey] || {};
  const phone = !isWidePcTutor();
  const groups = spec.groups || [];
  const group = spec.kind === "map" && step > 0 && groups.length ? groups[(step - 1) % groups.length] : null;
  const groupWords = group ? (group.words || []).map((item) => item.word) : [];
  const zoom = spec.kind === "map" && phone && groupWords.length ? mapFrame(coords, groupWords, 0.9) : null;
  const dots = projectMap(coords, bounds, Math.min(22, bounds.w * 0.05), zoom);
  const words = Object.keys(dots).filter((word) => !zoom || insidePaper(dots[word], bounds, 4));
  const far = (spec.items || [])[1] || (spec.items || [])[0];
  const lifted = spec.kind === "lift" && step === 1;
  const hot = new Set(group ? (group.words || []).map((item) => item.word) : []);
  if (spec.kind === "lift" && far) {
    hot.add(far.a);
    hot.add(far.b);
  }
  const pairMain = `${glossParts(far?.aLabel || far?.a || "").main}–${glossParts(far?.bLabel || far?.b || "").main}`;
  const signLines = spec.kind === "lift"
    ? { main: pairMain, sub: "" }
    : { main: group?.name || (lang() === "ja" ? "かこむ" : "圈一圈"), sub: "" };
  const signBits = measureSticker(scene, signLines);
  const signW = Math.min(bounds.w - 16, Math.max(96, signBits.w));
  const signH = Math.max(32, signBits.h);
  const sign = { x: -signW / 2, y: bounds.y + 2, w: signW, h: signH };
  let liftGeom = null;
  if (lifted && far && dots[far.a] && dots[far.b]) {
    const degrees = angleOf(far.a, far.b, far.points);
    let arm = Math.min(bounds.w * 0.32, bounds.h * 0.46, h * 0.38);
    const midX = (dots[far.a].x + dots[far.b].x) / 2;
    const midY = (dots[far.a].y + dots[far.b].y) / 2;
    const topLimit = sign.y + sign.h + 30;
    const left = bounds.x + 28;
    const right = bounds.x + bounds.w - 28;
    const bottom = bounds.y + bounds.h - 16;
    let ox = midX;
    let oy = midY + Math.min(28, arm * 0.12);
    for (let pass = 0; pass < 5; pass += 1) {
      const up = ray(ox, oy, arm, 0);
      const side = ray(ox, oy, arm, degrees);
      if (up.y < topLimit) oy += topLimit - up.y;
      const edge = Math.max(up.x, side.x);
      const inner = Math.min(up.x, side.x);
      if (edge > right) ox -= edge - right;
      if (inner < left) ox += left - inner;
      if (oy > bottom) {
        oy = bottom;
        arm *= 0.84;
      }
    }
    arm = Math.max(64, arm);
    liftGeom = {
      origin: { x: ox, y: oy },
      degrees,
      arm,
      tips: {
        [far.a]: ray(ox, oy, arm, 0),
        [far.b]: ray(ox, oy, arm, degrees),
      },
    };
  }
  const mapMain = phone ? 12 : 15;
  const mapSub = phone ? 12 : 13;
  const nearLimit = zoom ? 140 : (phone ? 104 : 150);
  const stickers = words.map((word) => measureSticker(scene, glossParts(labelForWord(spec, word)), mapMain, mapSub));
  const items = words.map((word, index) => ({
    ax: liftGeom?.tips[word]?.x ?? dots[word].x,
    ay: liftGeom?.tips[word]?.y ?? dots[word].y,
    w: stickers[index].w,
    h: stickers[index].h,
  }));
  const obstacles = [{ x: block.x - 4, y: bounds.y + bounds.h - 6, w: block.w + 8, h: block.h }, sign];
  const placed = placeNear(items, bounds, obstacles, phone ? 3 : 4, nearLimit);
  g.fillStyle(0xfffdf8, 0.94);
  g.fillRoundedRect(bounds.x, bounds.y, bounds.w, bounds.h, 16);
  g.lineStyle(3, INK_N, 1);
  g.strokeRoundedRect(bounds.x, bounds.y, bounds.w, bounds.h, 16);
  addSolid(scene, host, bounds.x, bounds.y, bounds.w, bounds.h, "map-paper");
  const houseSize = Math.max(18, Math.min(28, bounds.w * 0.03));
  (groups.length ? groups : [{ words: [] }]).forEach((entry, index) => {
    const pts = (entry.words || []).map((item) => dots[item.word]).filter(Boolean);
    if (!pts.length) return;
    const cx = pts.reduce((sum, pt) => sum + pt.x, 0) / pts.length;
    const cy = pts.reduce((sum, pt) => sum + pt.y, 0) / pts.length;
    if (cx < bounds.x || cx > bounds.x + bounds.w || cy < bounds.y || cy > bounds.y + bounds.h) return;
    house(g, cx, cy - houseSize * 0.8, houseSize, HOUSE[index % HOUSE.length]);
  });
  const stickerOf = words.map((word, index) => {
    const seated = placed[index]?.ok ? placed[index] : null;
    if (!seated) {
      stickers[index].main.destroy();
      stickers[index].sub?.destroy();
    }
    return {
      word,
      index,
      rect: seated,
      labeled: Boolean(seated),
      flying: Boolean(liftGeom?.tips[word]),
    };
  });
  stickerOf.forEach((entry) => {
    const from = dots[entry.word];
    const anchor = liftGeom?.tips[entry.word] || from;
    const dim = lifted && !hot.has(entry.word);
    if (entry.labeled) {
      const lx = entry.rect.x + entry.rect.w / 2;
      const ly = entry.rect.y + entry.rect.h / 2;
      g.lineStyle(2, dim ? 0xd9c7bc : 0x8b6b5c, 1);
      g.beginPath();
      g.moveTo(anchor.x, anchor.y);
      g.lineTo(lx, ly);
      g.strokePath();
    }
    g.fillStyle(hot.has(entry.word) ? 0xe24b57 : (dim ? 0xc5b4aa : 0x1d4ed8), 1);
    g.fillCircle(anchor.x, anchor.y, hot.has(entry.word) ? 7 : 5);
    g.lineStyle(2, 0xfffdf8, 1);
    g.strokeCircle(anchor.x, anchor.y, hot.has(entry.word) ? 7 : 5);
    if (entry.flying) {
      g.fillStyle(0x141824, 0.28);
      g.fillEllipse(from.x + 6, from.y + 16, 48, 16);
    }
    const dot = scene.add.container(anchor.x, anchor.y);
    dot.setData("stageRole", "prop");
    dot.setData("stageId", entry.labeled ? `map-dot:${entry.word}` : `map-pin:${entry.word}`);
    dot.setData("width", 14);
    dot.setData("height", 14);
    host.add(dot);
  });
  if (group && groupWords.length) {
    const members = stickerOf.filter((entry) => hot.has(entry.word) && (entry.labeled || dots[entry.word]));
    const xs = [];
    const ys = [];
    members.forEach((entry) => {
      const from = dots[entry.word];
      xs.push(from.x, entry.rect ? entry.rect.x : from.x, entry.rect ? entry.rect.x + entry.rect.w : from.x);
      ys.push(from.y, entry.rect ? entry.rect.y : from.y, entry.rect ? entry.rect.y + entry.rect.h : from.y);
    });
    if (xs.length) {
      const minX = Math.min(...xs) - 16;
      const maxX = Math.max(...xs) + 16;
      const minY = Math.min(...ys) - 14;
      const maxY = Math.max(...ys) + 14;
      const rawCx = (minX + maxX) / 2;
      const rawCy = (minY + maxY) / 2;
      const ellipse = clampEllipse(rawCx, rawCy, Math.max(36, maxX - minX), Math.max(32, maxY - minY), bounds);
      const lasso = scene.add.graphics();
      lasso.fillStyle(0xe24b57, 0.18);
      lasso.fillEllipse(ellipse.cx, ellipse.cy, ellipse.ew, ellipse.eh);
      lasso.lineStyle(7, 0xe24b57, 1);
      lasso.strokeEllipse(ellipse.cx, ellipse.cy, ellipse.ew, ellipse.eh);
      host.add(lasso);
      const zone = scene.add.zone(ellipse.cx, ellipse.cy, ellipse.ew, ellipse.eh);
      zone.setData("stageRole", "prop");
      zone.setData("stageId", "map-lasso");
      zone.setData("width", ellipse.ew);
      zone.setData("height", ellipse.eh);
      zone.setData("lassoWords", groupWords.join("|"));
      host.add(zone);
      if (scene.__embedAnimate) {
        lasso.setAlpha(0.45);
        trackTween(scene, {
          targets: lasso,
          alpha: 1,
          duration: 180,
          yoyo: true,
          repeat: 2,
          onComplete: () => lasso.setAlpha(1),
        });
      }
    }
  }
  const placeSticker = (entry) => {
    if (!entry.labeled) return;
    const lx = entry.rect.x + entry.rect.w / 2;
    const ly = entry.rect.y + entry.rect.h / 2;
    const dim = lifted && !hot.has(entry.word);
    const sticker = plate(scene, host, lx, ly, entry.rect.w, entry.rect.h, hot.has(entry.word) ? 0xfff1d2 : 0xfffdf8);
    sticker.setData("stageId", `map-sticker:${entry.word}`);
    if (dim) sticker.setAlpha(0.38);
    const bits = stickers[entry.index];
    sticker.add(bits.main);
    if (bits.sub) sticker.add(bits.sub);
    bits.main.setData("stageId", `map-label:${entry.word}`);
    bits.main.setData("stageBg", hot.has(entry.word) ? CREAM : PAPER);
    if (bits.sub) bits.sub.setData("stageBg", hot.has(entry.word) ? CREAM : PAPER);
    seatLines(bits.main, bits.sub);
    if (scene.__embedAnimate && entry.flying) {
      sticker.setPosition(dots[entry.word].x, dots[entry.word].y);
      trackTween(scene, { targets: sticker, x: lx, y: ly, duration: 520, ease: "Sine.out" });
    }
  };
  stickerOf.filter((entry) => !entry.flying).forEach(placeSticker);
  if (liftGeom && far) {
    const ink = scene.add.graphics();
    host.add(ink);
    [far.a, far.b].forEach((word) => {
      const spot = stickerOf.find((entry) => entry.word === word);
      if (!spot?.rect) return;
      ink.fillStyle(0x141824, 0.4);
      ink.fillEllipse(spot.rect.x + spot.rect.w / 2 + 8, spot.rect.y + spot.rect.h + 6, Math.max(64, spot.rect.w * 0.8), 18);
    });
    wedge(ink, liftGeom.origin.x, liftGeom.origin.y, liftGeom.arm, liftGeom.degrees, 0xe24b57, 8);
    arrowTo(ink, liftGeom.origin.x, liftGeom.origin.y, liftGeom.tips[far.a].x, liftGeom.tips[far.a].y, 0x1d4ed8, 10);
    arrowTo(ink, liftGeom.origin.x, liftGeom.origin.y, liftGeom.tips[far.b].x, liftGeom.tips[far.b].y, 0xe24b57, 10);
  }
  stickerOf.filter((entry) => entry.flying).forEach(placeSticker);
  if (liftGeom && far) {
    const taken = stickerOf.filter((entry) => entry.rect).map((entry) => ({ ...entry.rect })).concat([
      sign,
      { x: block.x, y: block.y, w: block.w, h: block.h },
    ]);
    const at = ray(liftGeom.origin.x, liftGeom.origin.y, Math.max(36, liftGeom.arm * 0.42), liftGeom.degrees / 2);
    const picture = { x: -w / 2 + 8, y: -h / 2 + 8, w: w - 16, h: h - 16 };
    const seat = seatClear(at.x, at.y, 64, 40, taken, picture, 14)
      || seatClear(at.x, bounds.y + bounds.h + 28, 64, 40, taken, picture, 8)
      || seatClear(bounds.x + bounds.w - 48, bounds.y + 28, 64, 40, taken, picture, 4);
    const badge = scorePill(scene, host, seat?.x ?? at.x, seat?.y ?? at.y, far.points);
    badge.setData("stageId", "lift-score");
  }
  const signBox = plate(scene, host, sign.x + sign.w / 2, sign.y + sign.h / 2, sign.w, sign.h, 0xfff1d2);
  signBox.setData("stageId", "map-sign");
  signBox.add(signBits.main);
  if (signBits.sub) signBox.add(signBits.sub);
  signBits.main.setData("stageBg", CREAM);
  if (signBits.sub) signBits.sub.setData("stageBg", CREAM);
  seatLines(signBits.main, signBits.sub);
  robot(scene, host, block, "point");
}

function paintPodium(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const items = [...(spec.items || [])].sort((a, b) => b.points - a.points);
  const rows = items.map((item, index) => ({
    lines: pairLines(item),
    points: item.points,
    hot: step ? index === 0 : false,
  }));
  const gap = 10;
  const n = Math.max(1, rows.length);
  const rh = (area.h - gap * (n - 1)) / n;
  const base = area.y + area.h;
  rows.forEach((row, index) => {
    const grow = (step ? 1 : 0.62) * (Number(row.points) / 100);
    const barH = Math.max(18, (area.h - 8) * grow);
    const x = area.x + 2 + index * 12;
    g.fillStyle(index === 0 ? 0xf0a35e : index === 1 ? 0x5eb3ff : 0x8d93a8, 1);
    g.fillRoundedRect(x, base - barH, 10, barH, 3);
  });
  paintBarRows(scene, host, { x: area.x + 40, y: area.y, w: area.w - 40, h: area.h }, rows);
  if (rh < 0) return;
  robot(scene, host, block);
}

function paintRings(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const group = (spec.groups || [])[step % Math.max(1, (spec.groups || []).length)] || { focus: "", items: [] };
  const rows = [
    { lines: glossParts(group.focus), points: group.items?.[0]?.points, hot: true },
    ...(group.items || []).map((item) => ({ lines: glossParts(item.label), points: item.points })),
  ].slice(0, 4);
  const narrow = area.w < 520;
  const dialH = narrow ? Math.min(96, area.h * 0.3) : area.h;
  const cx = narrow ? area.x + area.w * 0.5 : area.x + area.w * 0.28;
  const cy = narrow ? area.y + dialH * 0.55 : area.y + area.h * 0.5;
  const reach = narrow ? dialH * 0.38 : Math.min(area.h * 0.34, area.w * 0.22);
  [0.45, 0.72, 1].forEach((scale, index) => {
    g.lineStyle(3, index === step % 3 ? 0xe24b57 : 0x1d4ed8, 1);
    g.strokeCircle(cx, cy, reach * scale);
  });
  const list = narrow
    ? { x: area.x, y: area.y + dialH + 6, w: area.w, h: Math.max(80, area.h - dialH - 6) }
    : { x: area.x + area.w * 0.46, y: area.y, w: area.w * 0.54, h: area.h };
  paintBarRows(scene, host, list, rows);
  robot(scene, host, block);
}

function paintFan(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const cx = area.x + area.w * 0.42;
  const cy = area.y + area.h * 0.72;
  const radius = Math.min(area.w * 0.36, area.h * 0.42);
  const degrees = 24 + (step % 3) * 28;
  wedge(g, cx, cy, radius, degrees, 0xe24b57);
  const mark = plate(scene, host, cx, cy - radius - 24, 72, 32, 0xfffdf8);
  addText(scene, mark, 0, 0, lang() === "ja" ? "角" : "角", 16, 60);
  robot(scene, host, block);
  if (spec.kind === "fan") return;
}

function paintArrows(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const narrow = area.w < 520;
  const cx = narrow ? area.x + area.w * 0.34 : area.x + area.w * 0.28;
  const cy = narrow ? area.y + area.h * 0.24 : area.y + area.h * 0.58;
  const words = spec.words || [];
  const radius = narrow ? Math.min(area.w, area.h) * 0.18 : Math.min(area.w, area.h) * 0.28;
  words.forEach((word, index) => {
    const show = index <= step;
    const deg = 40 + index * 50;
    const tip = ray(cx, cy, show ? radius : radius * 0.25, deg);
    g.lineStyle(5, index === 0 ? 0xe24b57 : 0x1d4ed8, 1);
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(tip.x, tip.y);
    g.strokePath();
  });
  g.fillStyle(INK_N, 1);
  g.fillCircle(cx, cy, 6);
  const list = narrow
    ? { x: area.x, y: area.y + area.h * 0.46, w: area.w, h: area.h * 0.54 }
    : { x: area.x + area.w * 0.55, y: area.y + 8, w: area.w * 0.45, h: area.h - 16 };
  paintBarRows(scene, host, list, words.map((word, index) => ({
    lines: glossParts(wordFace(word)),
    points: index <= step ? spec.dim : "",
    hot: index === step % Math.max(1, words.length),
  })));
  robot(scene, host, block);
}

function paintCircle(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const cx = area.x + area.w * 0.45;
  const cy = area.y + area.h * 0.55;
  const radius = Math.min(area.w, area.h) * 0.32;
  g.lineStyle(4, 0x1d4ed8, 1);
  g.strokeCircle(cx, cy, radius);
  [0, 70, 150].forEach((deg, index) => {
    const tip = ray(cx, cy, step ? radius : radius * (0.55 + index * 0.15), deg);
    g.lineStyle(4, 0xe24b57, 1);
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(tip.x, tip.y);
    g.strokePath();
  });
  const dim = plate(scene, host, area.x + 48, area.y + 22, 80, 32, 0xffc43d);
  addText(scene, dim, 0, 0, String(spec.dim || 384), 16, 68, { bg: "#ffc43d" });
  robot(scene, host, block);
}

function paintAngles(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const items = spec.items || [];
  const rows = items.map((item, index) => ({
    lines: pairLines(item),
    points: item.points,
    hot: index === step % Math.max(1, items.length),
  }));
  const gap = 8;
  const n = Math.max(1, rows.length);
  const rh = (area.h - gap * (n - 1)) / n;
  rows.forEach((row, index) => {
    const y = area.y + rh / 2 + index * (rh + gap);
    const item = items[index];
    const degrees = angleOf(item.a, item.b, item.points);
    const radius = Math.min(46, rh * 0.42, 54);
    const cx = area.x + radius + 4;
    const cy = y + Math.min(10, rh * 0.12);
    wedge(g, cx, cy, radius, degrees, row.hot ? 0xe24b57 : 0x1d4ed8);
  });
  paintBarRows(scene, host, { x: area.x + 108, y: area.y, w: Math.max(80, area.w - 108), h: area.h }, rows);
  robot(scene, host, block);
}

function paintRuler(scene, host, g, w, h, spec, step) {
  const items = spec.items || [];
  const chosenIndex = step > 0 ? Math.min(step - 1, items.length - 1) : -1;
  const chosen = chosenIndex >= 0 ? items[chosenIndex] : null;
  const degrees = chosen ? angleOf(chosen.a, chosen.b, chosen.points) : 0;
  const chips = items.map((item, index) => ({
    lines: pairLines(item),
    points: item.points,
    hot: index === chosenIndex,
  }));
  if (spec.card) chips.push({ lines: glossParts(spec.card.label), points: spec.card.points, hot: false });
  const margin = 8;
  const ah = Math.round(h * 0.34);
  const aw = Math.round(Math.min(w * 0.22, Math.max(64, ah * 0.66)));
  const wantSide = Math.min(230, Math.max(188, w * 0.24));
  const beside = w >= 760 && w - wantSide >= 220;
  const side = beside
    ? { x: w / 2 - margin - wantSide, y: -h / 2 + margin, w: wantSide, h: h - margin * 2 }
    : {
      x: -w / 2 + margin,
      y: h / 2 - margin - Math.min(h * 0.32, Math.max(1, chips.length) * 48),
      w: w - margin * 2,
      h: Math.min(h * 0.32, Math.max(1, chips.length) * 48),
    };
  const dialRight = beside ? side.x - 14 : w / 2 - margin;
  const dialBottom = beside ? h / 2 - 4 : side.y - 8;
  const dialTop = -h / 2 + margin;
  const dialLeft = -w / 2 + margin;
  const dialW = Math.max(72, dialRight - dialLeft);
  const dialH = Math.max(72, dialBottom - dialTop);
  // Quarter-circle hero. Wide pictures keep it at least 60% of the picture
  // and centred in the sky; the kid stands under the corner and may overlap the dial.
  let radius = Math.min(dialW - 8, dialH - 8, beside ? h * 0.86 : h * 0.58);
  if (beside) radius = Math.max(radius, Math.min(h * 0.6, dialW - 8, dialH - 8));
  radius = Math.max(56, radius);
  let cx = dialLeft + Math.max(4, (dialW - radius) / 2);
  let cy = dialTop + radius;
  let kid = {
    x: cx - aw + 6,
    y: cy - 4,
    w: aw,
    h: ah,
  };
  const minX = dialLeft;
  const maxX = Math.max(minX, dialRight - aw - 4);
  const minY = dialTop;
  const maxY = Math.max(minY, dialBottom - ah);
  const shiftX = Math.max(minX, Math.min(maxX, kid.x)) - kid.x;
  const shiftY = Math.max(minY, Math.min(maxY, kid.y)) - kid.y;
  kid.x += shiftX;
  kid.y += shiftY;
  cx += shiftX;
  cy += shiftY;
  radius = Math.max(56, Math.min(radius, cy - dialTop - 2, dialRight - cx - 4));
  const recentre = dialLeft + Math.max(4, (dialW - radius) / 2) - cx;
  if (kid.x + recentre >= minX && kid.x + recentre <= maxX) {
    cx += recentre;
    kid.x += recentre;
  }
  robot(scene, host, kid, "protractor");
  g.fillStyle(0xfff3c4, 1);
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, radius, -Math.PI / 2, 0, false);
  g.closePath();
  g.fillPath();
  g.lineStyle(8, INK_N, 1);
  g.beginPath();
  g.moveTo(cx, cy - radius);
  g.lineTo(cx, cy);
  g.lineTo(cx + radius, cy);
  g.strokePath();
  g.beginPath();
  g.arc(cx, cy, radius, -Math.PI / 2, 0, false);
  g.strokePath();
  g.lineStyle(2, 0x8b6b5c, 1);
  for (let tick = 0; tick <= 90; tick += 15) {
    const inner = ray(cx, cy, radius - 12, tick);
    const outer = ray(cx, cy, radius - 1, tick);
    g.beginPath();
    g.moveTo(inner.x, inner.y);
    g.lineTo(outer.x, outer.y);
    g.strokePath();
  }
  const taken = [
    { x: side.x - 4, y: side.y - 4, w: side.w + 8, h: side.h + 8 },
    { x: kid.x - 2, y: kid.y - 2, w: kid.w + 4, h: kid.h + 4 },
  ];
  const seatBounds = {
    x: -w / 2 + 4,
    y: -h / 2 + 4,
    w: w - 8,
    h: Math.max(48, (beside ? h / 2 - 4 : side.y - 4) - (-h / 2 + 4)),
  };
  const markW = 42;
  const markH = 26;
  [
    { deg: 0, text: "100" },
    { deg: 60, text: "50" },
    { deg: 90, text: "0" },
  ].forEach((mark) => {
    const at = ray(cx, cy, radius * 0.78, mark.deg);
    const seat = seatNear(at.x, at.y, markW, markH, taken, seatBounds);
    const box = plate(scene, host, seat.x, seat.y, markW, markH, 0xfffdf8);
    box.setData("stageId", `mark-${mark.text}`);
    addText(scene, box, 0, 0, mark.text, 14, markW - 8);
  });
  if (chosen) {
    wedge(g, cx, cy, radius * 0.9, degrees, 0xe24b57, 8);
    const words = [glossParts(chosen.aLabel || chosen.a).main, glossParts(chosen.bLabel || chosen.b).main];
    [0, degrees].forEach((deg, index) => {
      const tip = ray(cx, cy, radius * 0.9, deg);
      arrowTo(g, cx, cy, tip.x, tip.y, index === 0 ? 0x1d4ed8 : 0xe24b57, 8);
      const label = words[index] || (lang() === "ja" ? "語" : "词");
      const lw = Math.min(132, Math.max(72, label.length * 16 + 16));
      const at = ray(cx, cy, radius * 0.52, deg);
      const seat = seatNear(at.x, at.y, lw, 30, taken, seatBounds);
      const box = plate(scene, host, seat.x, seat.y, lw, 30, index === 0 ? 0xfffdf8 : 0xfff1d2);
      box.setData("stageId", `ray-${index}`);
      addText(scene, box, 0, 0, label, 14, lw - 12, { bg: index === 0 ? PAPER : CREAM });
    });
    const scoreAt = ray(cx, cy, radius * 0.3, Math.max(degrees / 2, 6));
    const scoreSeat = seatNear(scoreAt.x, scoreAt.y, 58, 30, taken, seatBounds);
    const badge = plate(scene, host, scoreSeat.x, scoreSeat.y, 58, 30, 0x1e3a8a);
    badge.setData("stageId", "needle");
    addText(scene, badge, 0, 0, String(chosen.points), 16, 48, { color: "#ffffff", bg: NAVY });
  } else {
    const tip = ray(cx, cy, radius * 0.9, 0);
    arrowTo(g, cx, cy, tip.x, tip.y, 0x1d4ed8, 6);
  }
  paintBarRows(scene, host, side, chips);
}

function boardRows(spec, step) {
  const rows = [];
  const alone = Array.isArray(spec.alone) ? spec.alone : spec.alone ? [spec.alone] : [];
  alone.forEach((item) => rows.push({ lines: { main: `${glossParts(item.label).main}`, sub: `Page ${item.page}` }, points: item.points }));
  (spec.meaning || spec.sentence || []).forEach((item) => rows.push({
    lines: { main: item.title || `Page ${item.page}`, sub: `Page ${item.page}` },
    points: item.points,
  }));
  (spec.sides || []).forEach((item) => rows.push({ lines: pairLines(item), points: item.points }));
  if (spec.wordMatch === 0) rows.unshift({ lines: { main: lang() === "ja" ? "単語" : "单词", sub: "" }, points: 0 });
  return pageSlice(rows, step, 3).map((row, index) => ({ ...row, hot: index === 0 }));
}

function paintBoard(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  g.lineStyle(4, 0xe24b57, 1);
  g.beginPath();
  g.moveTo(area.x + 20, area.y + area.h * 0.2);
  g.lineTo(area.x + area.w * 0.28, area.y + area.h * 0.55);
  g.strokePath();
  paintBarRows(scene, host, { x: area.x + area.w * 0.32, y: area.y, w: area.w * 0.68, h: area.h }, boardRows(spec, step));
  robot(scene, host, block);
}

function paintShadow(scene, host, g, w, h, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  g.fillStyle(0xffe7a3, 1);
  g.fillCircle(area.x + area.w * 0.2, area.y + area.h * 0.28, 16);
  g.lineStyle(3, 0xffe566, 1);
  g.beginPath();
  g.moveTo(area.x + area.w * 0.2, area.y + area.h * 0.28);
  g.lineTo(area.x + area.w * 0.42, area.y + area.h * 0.48);
  g.strokePath();
  g.fillStyle(0x5eb3ff, 1);
  g.fillCircle(area.x + area.w * 0.4, area.y + area.h * 0.42, 28);
  g.lineStyle(3, INK_N, 1);
  g.strokeCircle(area.x + area.w * 0.4, area.y + area.h * 0.42, 28);
  g.fillStyle(0xf0a35e, 1);
  g.fillEllipse(area.x + area.w * 0.68, area.y + area.h * 0.4, 70, 22);
  g.lineStyle(3, INK_N, 1);
  g.strokeEllipse(area.x + area.w * 0.68, area.y + area.h * 0.4, 70, 22);
  const sx = step ? area.x + area.w * 0.55 : area.x + area.w * 0.4;
  g.fillStyle(0x141824, 0.45);
  g.fillEllipse(sx, area.y + area.h * 0.78, 64, 16);
  g.fillEllipse(step ? sx : area.x + area.w * 0.68, area.y + area.h * 0.78, 64, 16);
  const tag = plate(scene, host, area.x + area.w * 0.5, area.y + 20, 88, 32, 0xfffdf8);
  addText(scene, tag, 0, 0, lang() === "ja" ? "かげ" : "影子", 16, 72);
  robot(scene, host, block);
}

function paintSquash(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  g.lineStyle(5, 0x1d4ed8, 1);
  g.beginPath();
  g.moveTo(area.x + 16, area.y + area.h * 0.72);
  g.lineTo(area.x + area.w * 0.55, area.y + area.h * 0.72);
  g.strokePath();
  g.lineStyle(5, 0xb91c1c, 1);
  g.beginPath();
  g.moveTo(area.x + area.w * 0.28, area.y + 28);
  g.lineTo(area.x + area.w * 0.28, area.y + area.h * 0.72);
  g.strokePath();
  if (spec.kind === "rulers" && step) {
    g.lineStyle(4, 0x8b6b5c, 1);
    g.beginPath();
    g.moveTo(area.x + area.w * 0.28, area.y + area.h * 0.72);
    g.lineTo(area.x + area.w * 0.48, area.y + area.h * 0.4);
    g.strokePath();
  }
  if (spec.kind === "squash") {
    g.fillStyle(0xffe566, 1);
    g.fillCircle(area.x + area.w * 0.72, area.y + 36, 14);
    g.fillStyle(0x5eb3ff, 1);
    g.fillCircle(area.x + area.w * 0.48, area.y + area.h * 0.4, step ? 18 : 30);
    g.fillStyle(0x141824, 0.4);
    g.fillEllipse(area.x + area.w * 0.5, area.y + area.h * 0.78, step ? 120 : 40, 16);
  }
  const word = spec.kind === "squash"
    ? (lang() === "ja" ? "半分より 少ない" : "不到一半")
    : (lang() === "ja" ? "3本めは むり" : "第三根画不下");
  const box = plate(scene, host, area.x + area.w * 0.72, area.y + area.h * 0.42, Math.min(210, area.w * 0.4), 88, 0xfffdf8);
  addText(scene, box, 0, -16, word, fonts().body, box.getData("width") - 16);
  if (spec.dim) addText(scene, box, 0, 18, String(spec.dim), 16, 80, { bg: PAPER });
  if (spec.count) {
    const count = plate(scene, host, area.x + 48, area.y + 24, 64, 32, 0xffc43d);
    addText(scene, count, 0, 0, String(spec.count), 16, 52, { bg: "#ffc43d" });
  }
  robot(scene, host, block);
}

function paintBalance(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const tilt = step ? 18 : 0;
  const y = area.y + area.h * 0.62;
  g.lineStyle(6, INK_N, 1);
  g.beginPath();
  g.moveTo(area.x + area.w * 0.2, y - tilt);
  g.lineTo(area.x + area.w * 0.8, y + tilt);
  g.strokePath();
  g.fillStyle(0xc9845a, 1);
  g.fillRect(area.x + area.w * 0.48, y, 12, area.h * 0.22);
  const items = spec.items || [
    { aLabel: lang() === "ja" ? "ふるい" : "旧的", points: spec.old },
    { aLabel: lang() === "ja" ? "新しい" : "新的", points: spec.fresh },
  ];
  paintBarRows(scene, host, { x: area.x, y: area.y, w: area.w, h: area.h * 0.42 }, items.slice(0, 2).map((item, index) => ({
    lines: pairLines(item.bLabel || item.aLabel ? item : { aLabel: item.aLabel }),
    points: item.points,
    hot: Boolean(step) && index === items.length - 1,
  })));
  robot(scene, host, block);
}

function paintFly(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  machine(g, area.x + 8, area.y + 8, Math.min(140, area.w * 0.32), Math.min(120, area.h * 0.4), { open: true, lit: step > 0 });
  paintBarRows(scene, host, { x: area.x + area.w * 0.38, y: area.y, w: area.w * 0.62, h: area.h }, (spec.items || []).map((item, index) => ({
    lines: { main: glossParts(item.label).main, sub: step ? `Page ${item.page}` : glossParts(item.label).sub },
    points: item.points,
    hot: index === step % Math.max(1, (spec.items || []).length),
  })));
  robot(scene, host, block);
}

function paintTwins(scene, host, g, w, h) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  [0.32, 0.68].forEach((px, index) => {
    const x = area.x + area.w * px;
    const y = area.y + area.h * 0.42;
    g.fillStyle(0xffe1c4, 1);
    g.fillCircle(x, y, 32);
    g.lineStyle(3, INK_N, 1);
    g.strokeCircle(x, y, 32);
    g.fillStyle(INK_N, 1);
    if (index === 0) {
      g.fillCircle(x - 10, y - 4, 3);
      g.fillCircle(x + 10, y - 4, 3);
    } else {
      g.lineStyle(2, INK_N, 1);
      g.strokeCircle(x - 10, y - 4, 6);
      g.strokeCircle(x + 10, y - 4, 6);
    }
  });
  const tag = plate(scene, host, area.x + area.w / 2, area.y + area.h - 28, 120, 36, 0xfff1d2);
  addText(scene, tag, 0, 0, lang() === "ja" ? "そっくり" : "好像", 16, 100, { bg: CREAM });
  robot(scene, host, block);
}

function paintRank(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const open = step > 0;
  const rows = (spec.items || []).map((item, index) => ({
    lines: open ? glossParts(item.label) : { main: "？", sub: "" },
    points: open ? item.points : "？",
    hot: open && index === 0,
  }));
  if (open && spec.also != null && !(spec.items || []).some((item) => item.points === spec.also) && lang() === "zh") {
    rows.push({ lines: { main: "猫–狗", sub: "" }, points: spec.also, hot: false });
  }
  const focus = plate(scene, host, area.x + area.w / 2, area.y + 28, Math.min(220, area.w - 8), 48, 0xfff1d2);
  labelBlock(scene, focus, 0, 0, Math.min(200, area.w - 24), glossParts(spec.focus || spec.word || ""));
  g.fillStyle(0xf29bb8, 1);
  g.fillCircle(area.x + 28, area.y + area.h - 20, 16);
  paintBarRows(scene, host, { x: area.x, y: area.y + 60, w: area.w, h: area.h - 68 }, rows);
  robot(scene, host, block);
}

function paintRules(scene, host, g, w, h, spec, step) {
  const block = helperRect(w, h);
  const area = contentRect(w, h, block);
  const lines = spec.lines?.length ? spec.lines : ["⭐"];
  const line = lines[Math.min(step, lines.length - 1)];
  const box = plate(scene, host, area.x + area.w / 2, area.y + area.h / 2, Math.min(area.w, 520), Math.min(area.h * 0.62, 160), 0xfffdf8);
  addText(scene, box, 0, 0, line, fonts().body, box.getData("width") - 24);
  if (spec.kind === "stars") {
    g.fillStyle(0xffe566, 1);
    for (let i = 0; i < Math.min(3, lines.length); i += 1) {
      g.fillCircle(area.x + 28 + i * 22, area.y + 24, i <= step ? 8 : 4);
    }
  }
  robot(scene, host, block);
}

function paintSpec(scene, host, _frame, w, h, spec, step) {
  const look = lookOf(spec.kind);
  const sky = scene.add.graphics();
  backdrop(sky, w, h, look);
  host.add(sky);
  const zone = scene.add.zone(0, 0, w, h);
  zone.setData("stageRole", "prop");
  zone.setData("stageId", "sky");
  zone.setData("width", w);
  zone.setData("height", h);
  host.add(zone);
  const kind = spec.kind;
  if (kind === "hat" || kind === "strip" || kind === "align" || kind === "compare" || kind === "tags" || kind === "class") {
    paintDesk(scene, host, sky, w, h, spec, step);
  } else if (kind === "beans") paintBeans(scene, host, sky, w, h, spec, step);
  else if (kind === "map" || kind === "lift") paintMap(scene, host, sky, w, h, spec, step);
  else if (kind === "podium") paintPodium(scene, host, sky, w, h, spec, step);
  else if (kind === "ropes" || kind === "merge" || kind === "kana") {
    const block = helperRect(w, h);
    paintBarRows(scene, host, contentRect(w, h, block), rowsFromItems(spec.items || [], step));
    robot(scene, host, block);
  } else if (kind === "rings") paintRings(scene, host, sky, w, h, spec, step);
  else if (kind === "fan") paintFan(scene, host, sky, w, h, spec, step);
  else if (kind === "arrows") paintArrows(scene, host, sky, w, h, spec, step);
  else if (kind === "circle") paintCircle(scene, host, sky, w, h, spec, step);
  else if (kind === "angles") paintAngles(scene, host, sky, w, h, spec, step);
  else if (kind === "ruler") paintRuler(scene, host, sky, w, h, spec, step);
  else if (kind === "quest" || kind === "needles") paintBoard(scene, host, sky, w, h, spec, step);
  else if (kind === "shadow") paintShadow(scene, host, sky, w, h, step);
  else if (kind === "rulers" || kind === "squash") paintSquash(scene, host, sky, w, h, spec, step);
  else if (kind === "trust" || kind === "oldnew") paintBalance(scene, host, sky, w, h, spec, step);
  else if (kind === "fly") paintFly(scene, host, sky, w, h, spec, step);
  else if (kind === "twins") paintTwins(scene, host, sky, w, h);
  else if (kind === "rank") paintRank(scene, host, sky, w, h, spec, step);
  else paintRules(scene, host, sky, w, h, spec, step);
}

function clearArt(scene) {
  const layer = scene.frame?.stage;
  if (!layer) return;
  for (const child of [...(layer.list || [])]) {
    if (child.getData?.("artPart")) child.destroy();
  }
}

function settleArt(scene, band) {
  if (!band || !scene.frame) return;
  const ceiling = ctaCeiling(scene.frame);
  keepStageAboveCta(scene, band, ceiling);
  const bottom = Math.min(layerBottom(scene.frame.stage, band.top), ceiling);
  scene.frame.lastExample = { ...band, bottom, h: Math.max(16, bottom - band.top) };
}

export function drawEmbedArt(scene, stage, page, { phase = 0 } = {}) {
  const spec = page?.shared?.locales?.[lang()] || page?.shared?.locales?.zh || { kind: "stars", lines: [] };
  if (scene.__embedPage !== page?.id) {
    scene.__embedPage = page?.id || "";
    scene.__embedStep = 0;
  }
  scene.__embedStage = stage;
  scene.__embedBeat = page;
  scene.__embedTweenLeft = 0;
  const step = Math.max(0, Math.min(lastStep(spec), scene.__embedStep || 0));
  scene.__embedStep = step;
  const phone = !isWidePcTutor();
  const ceiling = ceilingOf(scene, stage);
  // Short desktops need 16px captions so real Japanese text bounds keep
  // the 12px card-shadow gap without shrinking the picture.
  const capSize = phone || window.innerHeight < 720 ? 16 : 18;
  const capSlot = phone ? 22 : (typeof window !== "undefined" && window.innerHeight < 720 ? 18 : 26);
  const block = STICKER_SHADOW_Y + CAPTION_CLEAR + capSlot;
  const room = Math.max(48, ceiling - stage.top - 2);
  let height = Math.max(56, room - block);
  const width = Math.max(96, stage.w - 4);
  // The stage already includes the body clearance. Adding another 2px
  // squeezed the caption against the card on short Japanese desktops.
  const top = stage.top;
  const caption = (CAPTION[lang()] || CAPTION.zh)[spec.kind] || (lang() === "ja" ? "え" : "图");
  const voice = voiceNoteWorld(scene);
  const voiceGap = 10;
  let capX = stage.left + 4;
  let capMaxW = Math.max(80, stage.w - 8);
  if (voice) {
    const capY = top + height + STICKER_SHADOW_Y + CAPTION_CLEAR;
    const yHit = capY < voice.bottom + voiceGap && capY + capSlot > voice.top - voiceGap;
    const xHit = capX < voice.right + voiceGap;
    if (yHit && xHit) {
      const shifted = Math.ceil(voice.right + voiceGap);
      const side = stage.left + stage.w - 8 - shifted;
      if (side >= 120) {
        capX = shifted;
        capMaxW = side;
      } else {
        const raised = voice.top - voiceGap - capSlot - STICKER_SHADOW_Y - CAPTION_CLEAR - top;
        const pictureFloor = !phone && (phase === 1 || phase === 2) ? Math.max(56, (window.innerHeight || 0) * 0.5 - 1) : 56;
        if (raised >= pictureFloor && raised < height) height = raised;
      }
    }
  }
  if (!phone && (phase === 1 || phase === 2)) {
    const minH = Math.ceil((window.innerHeight || 0) * 0.495);
    if (height < minH && room - minH >= 16) height = minH;
  }
  const wrappedCap = wrapLine(scene, caption, capSize, capMaxW);
  const capProbe = scene.add.text(0, -4000, wrappedCap, uiText(capSize, { color: C.muted, align: "left" })).setOrigin(0, 0).setVisible(false);
  const capH = Math.ceil(capProbe.height);
  capProbe.destroy();
  const extra = Math.max(0, capH - capSlot + 2);
  const floorH = !phone && (phase === 1 || phase === 2) ? Math.ceil((window.innerHeight || 0) * 0.495) : phone && phase === 2 ? Math.ceil((window.innerHeight || 0) * 0.35) : 56;
  if (extra && height - extra >= floorH) height -= extra;
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  g.fillStyle(C.surface, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
  g.lineStyle(4, INK_N, 1);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  card.add(g);
  paintSpec(scene, card, g, width, height, spec, step);
  card.setSize(width, height);
  card.setData("kind", "card");
  card.setData("width", width);
  card.setData("height", height);
  card.setData("shadow", true);
  card.setData("artPart", "scheme");
  card.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
  card.on("pointerdown", (_pointer, _x, _y, event) => {
    event?.stopPropagation?.();
    playSfx(scene, "sfx-tap", 0.28);
    const max = lastStep(spec);
    const next = step >= max ? 0 : step + 1;
    scene.__embedAnimate = next > step;
    scene.__embedStep = next;
    scene.time.delayedCall(0, () => {
      if (!scene.sys?.isActive()) return;
      clearArt(scene);
      drawEmbedArt(scene, scene.__embedStage || stage, page, { phase: scene.phase ?? phase });
      settleArt(scene, scene.__embedStage || stage);
    });
  });
  scene.frame.stage.add(card);
  const note = markCaption(
    scene.add.text(capX, top + height + STICKER_SHADOW_Y + CAPTION_CLEAR, "", uiText(capSize, { color: C.muted, align: "left" })).setOrigin(0, 0),
  );
  note.setText(wrapLine(scene, caption, capSize, capMaxW));
  note.setData("source", caption);
  note.setData("wrapWidth", capMaxW);
  note.setData("artPart", "scheme-label");
  scene.frame.stage.add(note);
  scene.__embedAnimate = false;
  window.__nanoGPTRagStep = step;
  window.__nanoGPTRagSteps = lastStep(spec);
  window.__nanoGPTRagSettled = !(scene.__embedTweenLeft > 0);
  window.__nanoGPTRagTap = () => {
    window.__nanoGPTRagSettled = false;
    card.emit("pointerdown");
  };
}
