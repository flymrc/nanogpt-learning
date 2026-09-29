import Phaser from "phaser";
import { playSfx } from "../audio/sound.js";
import { EMBED_FACTS } from "../data/embed-facts.js";
import { getLang, t } from "../i18n/locale.js";
import { isWidePcTutor } from "../tutor/bus.js";
import { markCaption } from "./components.js";
import { ctaCeiling, keepStageAboveCta, layerBottom } from "./lesson.js";
import { CAPTION_CLEAR, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText, wrapAtBreaks } from "./theme.js";

const CELL = { b: 0x1d4ed8, r: 0xb91c1c, p: 0xf3e6c8 };
const INK = "#3b2a2e";
const PAPER = "#fffdf8";
const NAVY = "#1e3a8a";

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

function needleCount(spec) {
  const alone = Array.isArray(spec.alone) ? spec.alone.length : spec.alone ? 1 : 0;
  return alone + (spec.meaning || spec.sentence || []).length + (spec.sides || []).length;
}

function lastStep(spec) {
  if (spec.kind === "map" || spec.kind === "lift") return Math.max(1, (spec.groups || []).length - 1);
  if (spec.kind === "rings") return Math.max(1, (spec.groups || []).length - 1);
  if (spec.kind === "ruler" || spec.kind === "angles") return Math.max(1, (spec.items || []).length - 1);
  if (spec.kind === "rules" || spec.kind === "stars") return Math.max(1, (spec.lines || []).length - 1);
  if (spec.kind === "needles" || spec.kind === "quest") return Math.max(1, Math.ceil(needleCount(spec) / 4) - 1);
  const listed = spec.items || spec.tags || [];
  if (listed.length > 4) return Math.max(1, Math.ceil(listed.length / 4) - 1);
  return 1;
}

function pageSlice(list, step, per = 4) {
  const rows = list || [];
  if (rows.length <= per) return rows;
  const pages = Math.ceil(rows.length / per);
  const index = Math.min(Math.max(0, step), pages - 1);
  return rows.slice(index * per, index * per + per);
}

function shortLabel(text) {
  return String(text || "").replace(/〔[^〕]*〕/g, "").replace(/\s+/g, " ").trim();
}

function hexFill(fill) {
  return `#${Number(fill).toString(16).padStart(6, "0").slice(-6)}`;
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

function addText(scene, parent, x, y, text, size, maxW, { color = INK, bg = PAPER, originY = 0.5 } = {}) {
  const font = Math.max(14, size);
  const body = wrapLine(scene, text, font, maxW);
  const node = scene.add.text(x, y, body, uiText(font, { color, align: "center" })).setOrigin(0.5, originY);
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
  g.fillRoundedRect(-w / 2, -h / 2, w, h, Math.min(16, h * 0.2));
  g.lineStyle(3, 0x3b2a2e, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, Math.min(16, h * 0.2));
  box.add(g);
  box.setData("width", w);
  box.setData("height", h);
  box.setData("stageRole", "card");
  box.setData("stageBg", hexFill(fill));
  parent.add(box);
  return box;
}

function sky(g, w, h) {
  g.fillStyle(0xb7e4ff, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h * 0.62, 18);
  g.fillStyle(0xffe566, 1);
  g.fillCircle(w * 0.32, -h * 0.32, Math.min(28, h * 0.08));
  g.fillStyle(0x86de7a, 1);
  g.fillEllipse(0, h * 0.34, w * 0.92, h * 0.28);
  g.fillStyle(0x5fc46d, 1);
  g.fillEllipse(-w * 0.2, h * 0.38, w * 0.4, h * 0.16);
}

function robot(scene, parent, x, y, w, h) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  const s = Math.min(w, h);
  g.fillStyle(0x5eb3ff, 1);
  g.fillRoundedRect(-s * 0.28, -s * 0.08, s * 0.56, s * 0.42, 12);
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-s * 0.16, s * 0.02, s * 0.32, s * 0.22, 6);
  g.lineStyle(3, 0x3b2a2e, 1);
  g.strokeRoundedRect(-s * 0.16, s * 0.02, s * 0.32, s * 0.22, 6);
  g.fillStyle(0xffe1c4, 1);
  g.fillCircle(0, -s * 0.22, s * 0.2);
  g.fillStyle(0x3b82f6, 1);
  g.fillRoundedRect(-s * 0.24, -s * 0.48, s * 0.48, s * 0.16, 8);
  g.fillStyle(0x1d4ed8, 1);
  g.fillRect(-s * 0.04, -s * 0.56, s * 0.08, s * 0.1);
  g.fillStyle(0x3b2a2e, 1);
  g.fillCircle(-s * 0.07, -s * 0.24, s * 0.028);
  g.fillCircle(s * 0.07, -s * 0.24, s * 0.028);
  g.lineStyle(3, 0xe24b57, 1);
  g.beginPath();
  g.arc(0, -s * 0.16, s * 0.06, 0.2, Math.PI - 0.2, false);
  g.strokePath();
  g.fillStyle(0xffc43d, 1);
  g.fillCircle(-s * 0.34, s * 0.08, s * 0.08);
  g.fillCircle(s * 0.34, s * 0.08, s * 0.08);
  box.add(g);
  box.setData("width", w);
  box.setData("height", h);
  box.setData("stageRole", "actor");
  box.setData("stageId", "robot");
  parent.add(box);
  return box;
}

function cells(g, x, y, list, size) {
  list.forEach((band, index) => {
    const color = CELL[band] || CELL.p;
    const left = x + index * (size + 4);
    g.fillStyle(color, 1);
    g.fillRoundedRect(left, y, size, size, 5);
    g.lineStyle(2, 0x3b2a2e, 1);
    g.strokeRoundedRect(left, y, size, size, 5);
  });
}

function angleOf(a, b) {
  const keys = [`zh:${a}|${b}`, `en:${a}|${b}`, `cross_language:${a}|${b}`, `rag_link_words:${a}|${b}`];
  for (const key of keys) {
    if (typeof EMBED_FACTS.angles[key] === "number") return EMBED_FACTS.angles[key];
  }
  return 60;
}

function wedge(g, cx, cy, radius, degrees, color) {
  const start = -Math.PI / 2;
  const end = start + (degrees * Math.PI) / 180;
  g.fillStyle(color, 0.28);
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, radius, start, end, false);
  g.closePath();
  g.fillPath();
  g.lineStyle(4, color, 1);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius);
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(end) * radius, cy + Math.sin(end) * radius);
  g.strokePath();
}

function talkLine(page) {
  const full = t(page?.keys?.talk || "");
  const cut = String(full).split(/[。！？]/)[0].trim();
  return cut || full;
}

function paintTalk(scene, host, area, page) {
  const label = t("talkLabel");
  const line = talkLine(page);
  const size = 14;
  const maxW = Math.max(80, area.w - 20);
  const maxH = Math.max(52, Math.min(area.h * 0.34, 96));
  let text = `${label} ${line}`.trim();
  let body = wrapLine(scene, text, size, maxW);
  let probe = scene.add.text(0, 0, body, uiText(size, { align: "center" })).setVisible(false);
  while (probe.height + 16 > maxH && text.length > label.length + 4) {
    text = text.slice(0, -1).trim();
    body = wrapLine(scene, text, size, maxW);
    probe.setText(body);
  }
  const h = Math.min(maxH, Math.max(48, probe.height + 16));
  probe.destroy();
  const y = area.y + area.h - h / 2;
  const box = plate(scene, host, area.x + area.w / 2, y, area.w, h, 0xfff1d2);
  box.setData("stageId", "talk");
  addText(scene, box, 0, 0, text, size, maxW, { bg: "#fff1d2" });
  return h + 8;
}

function contentArea(w, h) {
  const actorW = Math.max(108, Math.min(w * 0.26, h * 0.5));
  return {
    actor: { x: -w / 2 + actorW / 2 + 8, y: h * 0.02, w: actorW - 12, h: h * 0.78 },
    body: {
      x: -w / 2 + actorW + 12,
      y: -h / 2 + 12,
      w: w - actorW - 24,
      h: h - 24,
    },
  };
}

function paintRows(scene, host, area, rows, step) {
  const gap = 6;
  const n = rows.length;
  const h = Math.max(28, (area.h - gap * (n - 1)) / n);
  rows.forEach((row, index) => {
    const y = area.y + h / 2 + index * (h + gap);
    const hot = index === step % n;
    const box = plate(scene, host, area.x + area.w / 2, y, area.w, h, hot ? 0xfff1d2 : 0xfffdf8);
    box.setData("stageId", `row-${index}`);
    row.draw(box, area.w, h, hot);
    if (scene.__embedAnimate && hot) {
      box.setAlpha(0.2);
      trackTween(scene, { targets: box, alpha: 1, duration: 220 });
    }
  });
}

function labelAndScore(scene, box, w, h, label, points) {
  const badge = Math.min(72, Math.max(52, w * 0.24));
  const labelW = Math.max(48, w - badge - 24);
  addText(scene, box, -w / 2 + 12 + labelW / 2, 0, shortLabel(label), h < 46 ? 14 : 15, labelW, { bg: "#fffdf8" });
  const pill = plate(scene, box, w / 2 - badge / 2 - 8, 0, badge - 12, Math.max(30, h - 14), 0x1e3a8a);
  pill.setData("stageId", "score");
  addText(scene, pill, 0, 0, String(points), 16, badge - 18, { color: "#ffffff", bg: NAVY });
}

function paintSpec(scene, host, g, w, h, spec, step, page) {
  sky(g, w, h);
  const zone = scene.add.zone(0, 0, w, h);
  zone.setData("stageRole", "prop");
  zone.setData("stageId", "sky");
  zone.setData("width", w);
  zone.setData("height", h);
  host.add(zone);
  const area = contentArea(w, h);
  robot(scene, host, area.actor.x, area.actor.y, area.actor.w, area.actor.h);
  const talkH = paintTalk(scene, host, area.body, page);
  const body = { ...area.body, h: area.body.h - talkH };
  const kind = spec.kind;
  if (kind === "hat" || kind === "strip" || kind === "class") paintStrips(scene, host, g, body, spec, step);
  else if (kind === "align" || kind === "compare") paintStrips(scene, host, g, body, spec, step);
  else if (kind === "tags") paintTags(scene, host, body, spec, step);
  else if (kind === "beans") paintBeans(scene, host, g, body, spec, step);
  else if (kind === "map" || kind === "lift") paintMap(scene, host, g, body, spec, step);
  else if (kind === "podium" || kind === "ropes" || kind === "merge" || kind === "rank" || kind === "kana") paintPairs(scene, host, body, spec, step);
  else if (kind === "rings") paintRings(scene, host, body, spec, step);
  else if (kind === "fan" || kind === "arrows" || kind === "circle" || kind === "angles" || kind === "ruler") paintAngles(scene, host, g, body, spec, step);
  else if (kind === "quest" || kind === "needles") paintNeedles(scene, host, g, body, spec, step);
  else if (kind === "shadow") paintShadow(scene, host, g, body, step);
  else if (kind === "rulers" || kind === "squash") paintSquash(scene, host, g, body, spec, step);
  else if (kind === "trust" || kind === "oldnew") paintBalance(scene, host, body, spec, step);
  else if (kind === "fly") paintFly(scene, host, body, spec, step);
  else if (kind === "twins") paintTwins(scene, host, g, body);
  else if (kind === "rules" || kind === "stars") paintRules(scene, host, body, spec, step);
  else paintRules(scene, host, body, { lines: [spec.kind] }, 0);
}

function paintStrips(scene, host, g, area, spec, step) {
  const items = spec.items || (spec.item ? [spec.item] : [{ label: lang() === "ja" ? "語" : "词", cells: ["b", "r", "p", "b", "r", "p", "b", "r"] }]);
  const show = step > 0 || spec.kind === "align" || spec.kind === "compare" || spec.kind === "class";
  paintRows(scene, host, area, items.map((item, index) => ({
    draw: (box, w, h) => {
      addText(scene, box, 0, -h * 0.28, shortLabel(item.label), 14, w - 80);
      if (show || index === 0) {
        const size = Math.min(22, Math.max(14, (w - 100) / 8 - 4));
        const rowW = 8 * size + 28;
        cells(box.list[0], -rowW / 2, h * 0.08, item.cells || [], size);
      }
      const badge = spec.kind === "class" && spec.showSame && index === 0 ? `${spec.same}/${spec.cells}` : spec.dim ? String(spec.dim) : "";
      if (badge) {
        const pill = plate(scene, box, w / 2 - 40, 0, 64, Math.max(30, h * 0.42), 0xffc43d);
        addText(scene, pill, 0, 0, badge, 14, 56, { bg: "#ffc43d" });
      }
    },
  })), step);
}

function paintTags(scene, host, area, spec, step) {
  paintRows(scene, host, area, (spec.tags || []).map((tag, index) => ({
    draw: (box, w, h) => {
      const on = index <= step;
      addText(scene, box, 0, 0, on ? shortLabel(tag) : (lang() === "ja" ? "なまえ" : "名字"), 16, w - 16, { bg: on ? "#fff1d2" : PAPER });
    },
  })), step);
}

function paintBeans(scene, host, g, area, spec, step) {
  const count = spec.count || 20;
  const cols = 10;
  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = area.x + 16 + col * ((area.w - 24) / cols);
    const y = area.y + 28 + row * 36 + (step ? 10 : 0);
    g.fillStyle(i % 2 ? 0xff7a85 : 0x5eb3ff, 1);
    g.fillCircle(x, y, step ? 8 : 12);
    g.lineStyle(2, 0x3b2a2e, 1);
    g.strokeCircle(x, y, step ? 8 : 12);
  }
  addText(scene, host, area.x + area.w / 2, area.y + area.h - 16, String(count), 18, 80, { bg: "#86de7a" });
}

function paintMap(scene, host, g, area, spec, step) {
  const coords = EMBED_FACTS.map[spec.mapKey] || {};
  const words = Object.keys(coords);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  words.forEach((word) => {
    const [x, y] = coords[word];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const plotW = area.w * 0.58;
  const plotH = area.h * 0.92;
  const scale = (Math.min(plotW, plotH) * 0.78) / span;
  const originX = area.x + plotW / 2;
  const originY = area.y + area.h / 2;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(area.x, area.y, plotW, area.h, 16);
  g.lineStyle(3, 0x3b2a2e, 1);
  g.strokeRoundedRect(area.x, area.y, plotW, area.h, 16);
  const group = (spec.groups || [])[step % Math.max(1, (spec.groups || []).length)] || { name: "", words: [] };
  const hot = new Set((group.words || spec.items || []).map((item) => item.word || item.a));
  words.forEach((word) => {
    const [x, y] = coords[word];
    const px = originX + (x - midX) * scale;
    const py = originY - (y - midY) * scale;
    g.fillStyle(hot.has(word) ? 0xe24b57 : 0x1d4ed8, 1);
    g.fillCircle(px, py, hot.has(word) ? 7 : 5);
  });
  const legendX = area.x + plotW + 8;
  const legendW = area.w - plotW - 8;
  const names = [group.name, ...(group.words || []).map((item) => item.label)].filter(Boolean);
  paintRows(scene, host, { x: legendX, y: area.y, w: legendW, h: area.h }, pageSlice(names, 0, 5).map((name) => ({
    draw: (box, w) => addText(scene, box, 0, 0, shortLabel(name), 14, w - 12),
  })), 0);
}

function paintPairs(scene, host, area, spec, step) {
  const items = pageSlice(spec.items || [], step, 4);
  paintRows(scene, host, area, items.map((item) => ({
    draw: (box, w, h) => {
      const label = item.aLabel ? `${shortLabel(item.aLabel)} · ${shortLabel(item.bLabel)}` : shortLabel(item.label);
      labelAndScore(scene, box, w, h, label, item.points);
    },
  })), step);
}

function paintRings(scene, host, area, spec, step) {
  const group = spec.groups[step % spec.groups.length];
  const rows = [{ label: group.focus, points: group.items[0]?.points }, ...group.items];
  paintRows(scene, host, area, rows.map((item, index) => ({
    draw: (box, w, h) => labelAndScore(scene, box, w, h, index === 0 ? item.label : item.label, item.points),
  })), 0);
}

function paintAngles(scene, host, g, area, spec, step) {
  const items = spec.items || [{ aLabel: lang() === "ja" ? "矢" : "箭头", points: 100 }];
  const current = items[Math.min(step, items.length - 1)] || items[0];
  const degrees = current.a ? angleOf(current.a, current.b) : 40 + step * 25;
  const plotW = Math.max(80, area.w * 0.56);
  const cx = area.x + plotW * 0.5;
  const cy = area.y + area.h * 0.62;
  const radius = Math.min(plotW * 0.38, area.h * 0.34);
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(area.x, area.y, plotW, area.h, 16);
  if (spec.kind === "ruler") {
    g.lineStyle(4, 0x3b2a2e, 1);
    g.beginPath();
    g.arc(cx, cy, radius, Math.PI, 0, false);
    g.strokePath();
  }
  wedge(g, cx, cy, radius * (spec.kind === "circle" && step === 0 ? 0.72 : 1), degrees, 0xe24b57);
  if (spec.kind === "circle") {
    g.lineStyle(3, 0x1d4ed8, 1);
    g.strokeCircle(cx, cy, radius);
  }
  const side = { x: area.x + plotW + 8, y: area.y, w: Math.max(72, area.w - plotW - 8), h: area.h };
  const rows = [];
  if (spec.dim) rows.push({ label: String(spec.dim), points: spec.dim });
  const name = current.aLabel ? shortLabel(current.aLabel) : (lang() === "ja" ? "矢" : "箭头");
  if (current.points != null && String(current.points) !== String(spec.dim || "")) rows.push({ label: name, points: current.points });
  if (spec.kind === "ruler") {
    rows.push({ label: "100", points: 100 });
    rows.push({ label: "50", points: 50 });
    rows.push({ label: "0", points: 0 });
  }
  if (spec.card) rows.push({ label: shortLabel(spec.card.label || "卡"), points: spec.card.points });
  paintRows(scene, host, side, pageSlice(rows, 0, 5).map((item) => ({
    draw: (box, w) => {
      const same = String(item.label) === String(item.points);
      const line = same ? String(item.points) : `${shortLabel(item.label)} ${item.points}`;
      addText(scene, box, 0, 0, line, 15, w - 12);
    },
  })), 0);
}

function paintNeedles(scene, host, g, area, spec, step) {
  const rows = [];
  const alone = Array.isArray(spec.alone) ? spec.alone : spec.alone ? [spec.alone] : [];
  alone.forEach((item) => rows.push({ label: `${item.label} P${item.page}`, points: item.points }));
  (spec.meaning || spec.sentence || []).forEach((item) => rows.push({ label: `P${item.page}`, points: item.points }));
  (spec.sides || []).forEach((item) => rows.push({ label: `${item.aLabel}`, points: item.points }));
  if (spec.wordMatch === 0) rows.unshift({ label: lang() === "ja" ? "単語" : "单词", points: 0 });
  const shown = pageSlice(rows, step, 4);
  paintRows(scene, host, area, shown.map((item) => ({
    draw: (box, w, h) => labelAndScore(scene, box, w, h, item.label, item.points),
  })), 0);
}

function paintShadow(scene, host, g, area, step) {
  g.fillStyle(0xffc43d, 1);
  g.fillCircle(area.x + area.w * 0.3, area.y + area.h * 0.28, 18);
  g.fillStyle(0x5eb3ff, 1);
  g.fillCircle(area.x + area.w * 0.28, area.y + area.h * 0.48, 26);
  g.fillStyle(0xff7a85, 1);
  g.fillRoundedRect(area.x + area.w * 0.55, area.y + area.h * 0.34, 54, 18, 8);
  const shadowX = step ? area.x + area.w * 0.48 : area.x + area.w * 0.28;
  g.fillStyle(0x3b2a2e, 0.35);
  g.fillEllipse(shadowX, area.y + area.h * 0.78, 70, 18);
  g.fillEllipse(step ? shadowX : area.x + area.w * 0.62, area.y + area.h * 0.78, 70, 18);
  addText(scene, host, area.x + area.w / 2, area.y + 8, lang() === "ja" ? "かげ" : "影子", 16, 80, { originY: 0, bg: "#b7e4ff" });
}

function paintSquash(scene, host, g, area, spec, step) {
  g.lineStyle(4, 0x1d4ed8, 1);
  g.beginPath();
  g.moveTo(area.x + 20, area.y + area.h * 0.72);
  g.lineTo(area.x + area.w * 0.42, area.y + area.h * 0.72);
  g.strokePath();
  g.lineStyle(4, 0xb91c1c, 1);
  g.beginPath();
  g.moveTo(area.x + area.w * 0.22, area.y + 18);
  g.lineTo(area.x + area.w * 0.22, area.y + area.h * 0.72);
  g.strokePath();
  if (step) {
    g.fillStyle(0x3b2a2e, 1);
    g.fillCircle(area.x + area.w * 0.34, area.y + area.h * 0.4, 8);
  }
  const word = spec.kind === "squash"
    ? (lang() === "ja" ? "半分より 少ない" : "不到一半")
    : (lang() === "ja" ? "3本めは むり" : "第三根画不下");
  const bits = [word];
  if (spec.dim) bits.push(String(spec.dim));
  if (spec.count) bits.push(String(spec.count));
  const box = plate(scene, host, area.x + area.w * 0.72, area.y + area.h * 0.42, Math.min(190, area.w * 0.42), Math.min(120, area.h * 0.46), 0xfffdf8);
  addText(scene, box, 0, 0, bits.join("\n"), 16, box.getData("width") - 16);
}

function paintBalance(scene, host, area, spec, step) {
  const items = spec.items || [
    { aLabel: lang() === "ja" ? "ふるい" : "旧的", points: spec.old },
    { aLabel: lang() === "ja" ? "新しい" : "新的", points: spec.fresh },
  ];
  paintRows(scene, host, area, items.map((item) => ({
    draw: (box, w, h) => labelAndScore(scene, box, w, h, item.aLabel || item.label, item.points),
  })), step);
}

function paintFly(scene, host, area, spec, step) {
  paintRows(scene, host, area, (spec.items || []).map((item) => ({
    draw: (box, w, h) => labelAndScore(scene, box, w, h, step ? `P${item.page} ${item.label}` : item.label, item.points),
  })), step);
}

function paintTwins(scene, host, g, area) {
  [0.28, 0.62].forEach((px) => {
    g.fillStyle(0xffe1c4, 1);
    g.fillCircle(area.x + area.w * px, area.y + area.h * 0.42, 28);
    g.fillStyle(0x3b2a2e, 1);
    g.fillCircle(area.x + area.w * px - 8, area.y + area.h * 0.4, 3);
    g.fillCircle(area.x + area.w * px + 8, area.y + area.h * 0.4, 3);
  });
  addText(scene, host, area.x + area.w / 2, area.y + area.h * 0.78, lang() === "ja" ? "そっくり" : "好像", 16, 100, { bg: "#86de7a" });
}

function paintRules(scene, host, area, spec, step) {
  const lines = spec.lines?.length ? spec.lines : ["⭐"];
  const line = lines[Math.min(step, lines.length - 1)];
  paintRows(scene, host, area, [{
    draw: (box, w) => addText(scene, box, 0, 0, line, 15, w - 20),
  }], 0);
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
  const capSize = phone ? 16 : 18;
  const capSlot = phone ? 22 : (typeof window !== "undefined" && window.innerHeight < 720 ? 18 : 26);
  const block = STICKER_SHADOW_Y + CAPTION_CLEAR + capSlot;
  const room = Math.max(48, ceiling - stage.top - 2);
  let height = Math.max(56, room - block);
  const width = Math.max(96, stage.w - 4);
  const top = stage.top + 2;
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
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  g.fillStyle(C.surface, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
  g.lineStyle(4, 0x3b2a2e, 1);
  g.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  card.add(g);
  paintSpec(scene, card, g, width, height, spec, step, page);
  card.setSize(width, height);
  card.setData("kind", "card");
  card.setData("width", width);
  card.setData("height", height);
  card.setData("shadow", true);
  card.setData("artPart", "scheme");
  card.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
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
