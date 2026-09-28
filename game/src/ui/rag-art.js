import { playSfx } from "../audio/sound.js";
import { getLang, t } from "../i18n/locale.js";
import { isWidePcTutor } from "../tutor/bus.js";
import { drawSticker, markCaption } from "./components.js";
import { ctaCeiling, keepStageAboveCta, layerBottom } from "./lesson.js";
import { CAPTION_CLEAR, STICKER_SHADOW_Y } from "./layout.js";
import { C, uiText, wrapAtBreaks, wrapToWidth } from "./theme.js";

const CAPTION = {
  zh: {
    cut: ["一条长纸", "剪刀在剪", "12 张卡片"],
    hats: ["蓝帽子和黄帽子", "问题飞向蓝帽子", "翻开第 4 页", "第 4 页飞向黄帽子", "黄帽子写下回答"],
    shares: ["卡片上的词", "一样的词亮了", "分数出来了"],
    line: ["三根柱子", "30 分的线", "线的下面"],
    take: ["拿一张和拿三张", "一张里没有对的", "黄帽子抽出对的", "填空纸还是搬第一张"],
    board: ["盖着的牌子", "揭开一看"],
    sign: ["门口", "书飞进脑袋"],
    memory: ["脑袋里的旧话", "旧时间还在"],
    book: ["今天的手册", "这一页打开了"],
    pair: ["两边比一比", "再看一遍"],
    flow: ["一步一步", "走到下一步"],
    swap: ["旧的一页", "换成新的一页"],
    cite: ["填空纸", "写上这一页"],
    idk: ["填空纸", "我不知道"],
    cards: ["12 张卡片", "看清卡片上的字"],
    big: ["一条长纸", "整本只有这一张"],
    counts: ["每张卡的词", "有的多，有的少"],
    address: ["意思的地址", "地址是一排数字"],
    bars: ["分数柱", "柱子长高了"],
    zeros: ["十二张都是 0 分", "没有对上的词"],
    chips: ["问题里的词", "小词飞走了"],
    join: ["问题和卡片", "接成一段"],
    rules: ["三句话", "再看一遍"],
    stars: ["三颗星", "点亮一颗"],
  },
  ja: {
    cut: ["長い 紙", "はさみで 切っている", "12まいの カード"],
    hats: ["青い ぼうしと 黄色い ぼうし", "しつもんが 青い ぼうしへ", "4ページを 見つける", "4ページが 黄色い ぼうしへ", "黄色い ぼうしが 書く"],
    shares: ["カードの 語", "同じ 語が 光る", "点数が 出る"],
    line: ["3本の ぼう", "30てんの 線", "線の 下"],
    take: ["1まいと 3まい", "1まいでは 朝ごはんが ない", "書き係が 正しい カードを ぬく", "あなうめの 紙は 1まいめ"],
    board: ["かくれた ふだ", "めくって 見る"],
    sign: ["いりぐち", "本が 頭に とぶ"],
    memory: ["あたまの 中", "ふるい 時間"],
    book: ["いまの 本", "ページが ひらく"],
    pair: ["左右で くらべる", "もう 一度"],
    flow: ["一つずつ", "つぎの マス"],
    swap: ["ふるい ページ", "新しい ページ"],
    cite: ["あなうめの 紙", "1まいめを はこぶ"],
    idk: ["あなうめの 紙", "わかりません"],
    cards: ["12まいの カード", "カードの 文"],
    big: ["長い 紙", "本が 1まい"],
    counts: ["カードの 語", "多い カードと 少ない カード"],
    address: ["いみの じゅうしょ", "数字の 列"],
    bars: ["てんの ぼう", "ぼうが のびる"],
    zeros: ["12まい ぜんぶ 0てん", "同じ 語が ない"],
    chips: ["しつもんの 語", "小さな 語が とぶ"],
    join: ["しつもんと カード", "1本に つなぐ"],
    rules: ["三つの こと", "もう 一度"],
    stars: ["三つの 星", "星が 光る"],
  },
};

export function ragArtReserve(_page, _phase, width = 320) {
  return width < 720 ? 320 : 420;
}

export function ragExpectedArt() {
  return {
    visual: "rag",
    parts: [
      { part: "scheme", min: 1 },
      { part: "scheme-label", min: 1 },
    ],
  };
}

function ceilingOf(scene, stage) {
  return Math.min(stage.bottom - 2, ctaCeiling(scene.frame) - 4);
}

function citeMode(spec) {
  const line = spec.line || "";
  if (/不知道|don't know|わかりません/i.test(line)) return "idk";
  if (line.length > 24) return "sheet";
  return "mark";
}

function lastStep(spec) {
  if (spec.kind === "hats") return spec.question ? 4 : 2;
  if (spec.kind === "cards" && spec.cut) return 2;
  if (spec.kind === "take") return 3;
  if (spec.kind === "shares" || spec.kind === "line") return 2;
  if (spec.kind === "cite" && citeMode(spec) === "sheet") return 2;
  if (spec.kind === "flow") return Math.max(1, (spec.steps || []).length - 1);
  return 1;
}

function captionFor(spec, step) {
  const lang = getLang() === "ja" ? "ja" : "zh";
  const pack = CAPTION[lang];
  if (spec.kind === "cards" && spec.cut) return pack.cut[Math.min(step, pack.cut.length - 1)];
  if (spec.kind === "cite") {
    const mode = citeMode(spec);
    if (mode === "idk") return pack.idk[Math.min(step, 1)];
    if (mode === "sheet") {
      const sheet = lang === "ja"
        ? ["あなうめの 紙", "4ページが 入る", "5ページは 戻される"]
        : ["填空纸", "第 4 页填好了", "第 5 页被推回去"];
      return sheet[Math.min(step, sheet.length - 1)];
    }
  }
  if (spec.kind === "hats" && !spec.question) {
    const near = lang === "ja"
      ? ["2つの 窓", "数字が 真ん中へ", "近い ところが 光る"]
      : ["两扇小窗", "数字飞到中间", "靠得近的亮了"];
    return near[Math.min(step, near.length - 1)];
  }
  if (spec.kind === "sign" && step === 0 && spec.title) return spec.title;
  const list = pack[spec.kind] || pack.rules;
  return list[Math.min(step, list.length - 1)];
}

function wrapBody(scene, raw, size, maxW) {
  const text = String(raw ?? "");
  if (!text) return "";
  if (text.includes(" ")) return wrapAtBreaks(scene, text, size, maxW);
  return wrapToWidth(scene, text, size, maxW);
}

function fitLabel(scene, parent, x, y, raw, { maxW, maxH = 400, size = 16, color, originX = 0.5, originY = 0.5, align = "center" } = {}) {
  const source0 = String(raw ?? "");
  let source = source0;
  let font = size;
  const node = scene.add.text(x, y, "", uiText(font, { color, align })).setOrigin(originX, originY);
  const apply = (n, value) => {
    node.setFontSize(n);
    node.setText(wrapBody(scene, value, n, maxW));
  };
  apply(font, source);
  let guard = 0;
  while (guard < 20 && node.height > maxH && font > 11) {
    guard += 1;
    font -= 1;
    apply(font, source);
  }
  if (node.height > maxH + 0.5 || node.width > maxW + 1) {
    const sentences = source.split(/(?<=[。！？.])/u).map((part) => part.trim()).filter(Boolean);
    if (sentences.length > 1) {
      source = sentences.slice(0, -1).join("");
      font = size;
      apply(font, source);
      while (guard < 36 && node.height > maxH && font > 11) {
        guard += 1;
        font -= 1;
        apply(font, source);
      }
    }
  }
  if (node.height > maxH + 0.5 || node.width > maxW + 1) {
    const fit = Math.min(1, maxW / Math.max(1, node.width), maxH / Math.max(1, node.height));
    node.setScale(Math.min(1, fit));
  }
  node.setData("source", source);
  node.setData("wrapWidth", maxW);
  parent.add(node);
  return node;
}

function placeFly(scene, node, x, y, fromX, fromY) {
  node.setPosition(x, y);
  if (!scene.__ragAnimate) return;
  if (Math.hypot(x - fromX, y - fromY) < 2) return;
  node.setPosition(fromX, fromY);
  scene.tweens.add({ targets: node, x, y, duration: 520, ease: "Cubic.Out" });
}

function popIn(scene, node, delay = 0) {
  if (!scene.__ragAnimate) return;
  node.setScale(0.82);
  scene.tweens.add({ targets: node, scaleX: 1, scaleY: 1, duration: 320, delay, ease: "Back.Out" });
}

function paintActor(g, x, y, s, hat) {
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(x - s * 0.9, y + s * 0.2, s * 1.8, s * 1.45, s * 0.4);
  g.lineStyle(Math.max(3, s * 0.08), C.stroke, 1);
  g.strokeRoundedRect(x - s * 0.9, y + s * 0.2, s * 1.8, s * 1.45, s * 0.4);
  g.fillStyle(0xffd7c2, 1);
  g.fillCircle(x, y, s);
  g.lineStyle(Math.max(3, s * 0.08), C.stroke, 1);
  g.strokeCircle(x, y, s);
  g.fillStyle(C.stroke, 1);
  g.fillCircle(x - s * 0.32, y - s * 0.06, Math.max(2.5, s * 0.1));
  g.fillCircle(x + s * 0.32, y - s * 0.06, Math.max(2.5, s * 0.1));
  g.lineStyle(Math.max(3, s * 0.08), C.stroke, 1);
  g.beginPath();
  g.arc(x, y + s * 0.16, s * 0.38, 0.2, Math.PI - 0.2, false);
  g.strokePath();
  if (hat === "blue" || hat === "gold") {
    g.fillStyle(hat === "blue" ? C.blue : C.gold, 1);
    g.fillRoundedRect(x - s * 0.95, y - s * 1.55, s * 1.9, s * 0.46, 8);
    g.fillRect(x - s * 0.46, y - s * 2.2, s * 0.92, s * 0.78);
    g.lineStyle(Math.max(3, s * 0.08), C.stroke, 1);
    g.strokeRoundedRect(x - s * 0.95, y - s * 1.55, s * 1.9, s * 0.46, 8);
  }
  if (hat === "blue") {
    g.fillStyle(0xfffdf8, 1);
    g.fillRoundedRect(x + s * 0.15, y + s * 0.55, s * 0.85, s * 1.05, 4);
    g.lineStyle(Math.max(2, s * 0.06), C.blue, 1);
    g.strokeRoundedRect(x + s * 0.15, y + s * 0.55, s * 0.85, s * 1.05, 4);
  }
  if (hat === "gold") {
    g.lineStyle(Math.max(4, s * 0.12), C.gold, 1);
    g.lineBetween(x + s * 0.35, y + s * 0.45, x + s * 1.15, y + s * 1.35);
  }
}

function addActor(scene, card, x, y, s, hat) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  paintActor(g, 0, 0, s, hat);
  box.add(g);
  card.add(box);
  return box;
}

function paintLobby(g, w, h) {
  g.fillStyle(0xf6e4cf, 1);
  g.fillRoundedRect(-w / 2 + 8, -h / 2 + 8, w - 16, h * 0.62, 18);
  if (w >= 560) {
    const winW = Math.min(w * 0.22, 200);
    const winH = Math.min(h * 0.32, 140);
    g.fillStyle(0xb7e3fb, 1);
    g.fillRoundedRect(-w * 0.44, -h * 0.42, winW, winH, 14);
    g.lineStyle(4, C.stroke, 1);
    g.strokeRoundedRect(-w * 0.44, -h * 0.42, winW, winH, 14);
    g.fillStyle(C.sun, 1);
    g.fillCircle(-w * 0.44 + winW * 0.7, -h * 0.42 + winH * 0.35, Math.min(22, winH * 0.2));
    const signW = Math.min(w * 0.26, 220);
    const signH = Math.min(52, h * 0.14);
    g.fillStyle(C.coral, 1);
    g.fillRoundedRect(w * 0.18, -h * 0.4, signW, signH, 12);
    g.lineStyle(4, C.stroke, 1);
    g.strokeRoundedRect(w * 0.18, -h * 0.4, signW, signH, 12);
  }
  g.fillStyle(0xf0d2a8, 1);
  g.fillRoundedRect(-w / 2 + 8, h * 0.06, w - 16, Math.max(16, h * 0.1), 10);
  g.fillStyle(0xc4894a, 1);
  g.fillRoundedRect(-w / 2 + 8, h * 0.14, w - 16, h / 2 - h * 0.14 - 8, 14);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-w / 2 + 8, h * 0.14, w - 16, h / 2 - h * 0.14 - 8, 14);
  g.fillStyle(C.gold, 1);
  g.fillCircle(-w * 0.38, h * 0.05, Math.min(18, h * 0.045));
  g.fillStyle(C.stroke, 1);
  g.fillCircle(-w * 0.38, h * 0.05, Math.min(4, h * 0.012));
}

function lobbySign(scene, card, w, h) {
  if (w < 560) return;
  const signW = Math.min(w * 0.26, 220);
  const signH = Math.min(52, h * 0.14);
  fitLabel(scene, card, w * 0.18 + signW / 2, -h * 0.4 + signH / 2, getLang() === "ja" ? "ホテル・ホシ" : "星星酒店", {
    maxW: signW - 12,
    maxH: signH - 8,
    size: 18,
    color: "#fffdf8",
  });
}

function castLayout(w, h, { bubbleAbove = false } = {}) {
  const bubbleH = bubbleAbove ? Math.min(78, h * 0.2) : 0;
  const feet = h * 0.1;
  const topLimit = bubbleAbove ? -h / 2 + bubbleH + 14 : -h / 2 + 18;
  const available = Math.max(48, feet - topLimit);
  const s = Math.max(20, Math.min(available / 3.55, (w * 0.46) / 3.2, h * 0.22));
  const y = feet - s * 1.45;
  return { s, y, feet, bubbleH };
}

function makeBubble(scene, card, x, y, w, h, text) {
  const box = scene.add.container(0, 0);
  box.setData("width", w);
  box.setData("height", h);
  const g = scene.add.graphics();
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  g.fillTriangle(-12, h / 2 - 2, 12, h / 2 - 2, 0, h / 2 + 16);
  box.add(g);
  fitLabel(scene, box, 0, 0, text, { maxW: w - 16, maxH: h - 12, size: Math.min(22, Math.max(14, h * 0.34)) });
  card.add(box);
  box.setPosition(x, y);
  return box;
}

function makeSlip(scene, card, w, h, fill, lines) {
  const box = scene.add.container(0, 0);
  box.setData("width", w);
  box.setData("height", h);
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  box.add(g);
  lines.forEach((line) => {
    fitLabel(scene, box, line.x || 0, line.y || 0, line.text, line.opts || {});
  });
  card.add(box);
  return box;
}

function gridShape(count, w, h) {
  if (count === 12) {
    const cols = 4;
    const rows = 3;
    return {
      cols,
      rows,
      cellW: (w - 16 - 8 * (cols - 1)) / cols,
      cellH: (h - 16 - 8 * (rows - 1)) / rows,
    };
  }
  let best = null;
  for (let cols = 2; cols <= 6; cols += 1) {
    const rows = Math.ceil(count / cols);
    const cellW = (w - 16 - 8 * (cols - 1)) / cols;
    const cellH = (h - 16 - 8 * (rows - 1)) / rows;
    if (cellW < 64 || cellH < 48) continue;
    const score = Math.min(cellW, 200) * cellH;
    if (!best || score > best.score) best = { cols, rows, cellW, cellH, score };
  }
  if (best) return best;
  const cols = w >= 520 ? 4 : 3;
  const rows = Math.ceil(count / cols);
  return {
    cols,
    rows,
    cellW: (w - 16 - 8 * (cols - 1)) / cols,
    cellH: (h - 16 - 8 * (rows - 1)) / rows,
  };
}

function paintCardGrid(scene, card, w, h, items) {
  const list = items || [];
  const shape = gridShape(Math.max(1, list.length), w, h);
  list.forEach((item, index) => {
    const col = index % shape.cols;
    const row = Math.floor(index / shape.cols);
    const x = -w / 2 + 8 + shape.cellW / 2 + col * (shape.cellW + 8);
    const y = -h / 2 + 8 + shape.cellH / 2 + row * (shape.cellH + 8);
    const cell = scene.add.container(x, y);
    cell.setData("width", shape.cellW);
    cell.setData("height", shape.cellH);
    const g = scene.add.graphics();
    const fill = index % 2 ? 0xfff1c9 : 0xdff8f4;
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-shape.cellW / 2, -shape.cellH / 2, shape.cellW, shape.cellH, 10);
    g.lineStyle(3, C.stroke, 1);
    g.strokeRoundedRect(-shape.cellW / 2, -shape.cellH / 2, shape.cellW, shape.cellH, 10);
    g.fillStyle(index % 2 ? C.gold : C.teal, 1);
    g.fillRoundedRect(-shape.cellW / 2 + 4, -shape.cellH / 2 + 4, shape.cellW - 8, Math.max(16, shape.cellH * 0.22), 8);
    cell.add(g);
    const headH = Math.max(16, shape.cellH * 0.28);
    fitLabel(scene, cell, 0, -shape.cellH / 2 + 4 + headH / 2, `Page ${item.page}  ${item.title || ""}`.trim(), {
      maxW: shape.cellW - 14,
      maxH: headH - 6,
      size: shape.cellH > 90 ? 15 : 13,
      color: "#3b2a2e",
    });
    fitLabel(scene, cell, 0, -shape.cellH / 2 + headH + 6, item.text || "", {
      maxW: shape.cellW - 12,
      maxH: Math.max(12, shape.cellH - headH - 12),
      size: shape.cellW > 160 ? 14 : 12,
      color: C.text,
      originY: 0,
    });
    card.add(cell);
    popIn(scene, cell, index * 28);
  });
}

function paintScissors(g, s) {
  g.lineStyle(Math.max(5, s * 0.14), C.stroke, 1);
  g.beginPath();
  g.moveTo(-s, -s * 0.72);
  g.lineTo(s * 0.2, 0);
  g.lineTo(-s, s * 0.72);
  g.strokePath();
  g.fillStyle(C.coral, 1);
  g.fillCircle(-s, -s * 0.72, s * 0.24);
  g.fillCircle(-s, s * 0.72, s * 0.24);
  g.lineStyle(3, C.gold, 1);
  g.strokeCircle(-s, -s * 0.72, s * 0.24);
  g.strokeCircle(-s, s * 0.72, s * 0.24);
}

function paintLongPaper(scene, card, w, h, { scissors = false, step = 0, label = true } = {}) {
  const paperW = w - 24;
  const paperH = h * (scissors ? 0.7 : 0.78);
  const g = scene.add.graphics();
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-paperW / 2, -paperH / 2, paperW, paperH, 16);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-paperW / 2, -paperH / 2, paperW, paperH, 16);
  const seg = paperW / 12;
  for (let i = 1; i < 12; i += 1) {
    const x = -paperW / 2 + seg * i;
    g.lineStyle(3, 0xc4b8ae, 1);
    const dash = paperH / 14;
    for (let y = -paperH / 2 + 8; y < paperH / 2 - 8; y += dash * 1.6) {
      g.lineBetween(x, y, x, Math.min(paperH / 2 - 8, y + dash));
    }
  }
  card.add(g);
  if (label) {
    fitLabel(scene, card, 0, 0, getLang() === "ja" ? "1 から 12 ページ" : "第 1 页到第 12 页", {
      maxW: paperW - 28,
      maxH: paperH * 0.4,
      size: Math.min(28, paperH * 0.18),
    });
  }
  if (!scissors) return;
  const sc = Math.min(42, h * 0.16);
  const box = scene.add.container(-paperW / 2 + seg, paperH / 2 - sc * 0.35);
  const sg = scene.add.graphics();
  paintScissors(sg, sc);
  box.add(sg);
  card.add(box);
  if (step >= 1 && scene.__ragAnimate) {
    const endX = paperW / 2 - seg;
    scene.tweens.add({ targets: box, x: endX, duration: 680, ease: "Sine.InOut" });
  } else if (step >= 1) {
    box.x = paperW / 2 - seg;
  }
}

function axisMax(spec, showLine) {
  const scores = (spec.items || []).map((item) => Number(item.score) || 0);
  const peak = Math.max(spec.meaningLine || 0, ...scores, 1);
  if (showLine) return Math.max(40, Math.ceil(peak / 10) * 10);
  return Math.max(50, Math.ceil(peak / 10) * 10);
}

function paintBars(scene, card, g, w, h, spec, step, { showLine = false } = {}) {
  const items = spec.items || [];
  const n = Math.max(1, items.length);
  const gap = Math.max(12, Math.min(36, w * 0.04));
  const barW = Math.max(36, Math.min(120, (w - 48 - gap * (n - 1)) / n));
  const rowW = n * barW + (n - 1) * gap;
  const base = h / 2 - 46;
  const top = -h / 2 + 28;
  const span = Math.max(40, base - top);
  const axis = axisMax(spec, showLine);
  const grown = showLine || step >= 1 ? 1 : 0.35;
  const yOf = (score) => base - span * (Math.max(0, Math.min(axis, score)) / axis);
  g.lineStyle(3, C.stroke, 1);
  g.lineBetween(-rowW / 2 - 8, base, rowW / 2 + 8, base);
  items.forEach((item, index) => {
    const x = -rowW / 2 + barW / 2 + index * (barW + gap);
    const full = Math.max(10, base - yOf(item.score));
    const bh = Math.max(8, full * grown);
    const under = spec.meaningLine && item.score < spec.meaningLine;
    g.fillStyle(0xf3e6d8, 1);
    g.fillRoundedRect(x - barW / 2, top, barW, base - top, 12);
    const col = scene.add.container(x, base);
    const bg = scene.add.graphics();
    bg.fillStyle(under ? 0xc4b8ae : item.hot ? C.coral : C.teal, 1);
    bg.fillRoundedRect(-barW / 2, -bh, barW, bh, 12);
    col.add(bg);
    card.add(col);
    if (scene.__ragAnimate && (showLine || step >= 1)) {
      col.setScale(1, 0.12);
      scene.tweens.add({ targets: col, scaleY: 1, duration: 480, delay: index * 70, ease: "Cubic.Out" });
    }
    fitLabel(scene, card, x, Math.max(top + 16, base - bh), String(item.score), {
      maxW: barW + 16,
      maxH: 26,
      size: h > 160 ? 22 : 18,
      color: C.goldCss,
      originY: 1,
    });
    fitLabel(scene, card, x, base + 6, item.title ? `${item.title}\nPage ${item.page}` : `Page ${item.page}`, {
      maxW: barW + 28,
      maxH: 36,
      size: 13,
      color: C.muted,
      originY: 0,
    });
  });
  if (spec.hair && items.length >= 2) {
    const x0 = -rowW / 2 + barW / 2;
    const x1 = x0 + (barW + gap);
    const y = yOf(Math.max(items[0].score, items[1].score) * grown) - 18;
    g.lineStyle(3, C.stroke, 1);
    g.lineBetween(x0 - barW / 2, y, x1 + barW / 2, y);
  }
  if (spec.meaningLine && (showLine || step >= 1)) {
    const y = yOf(spec.meaningLine);
    const line = scene.add.rectangle(0, y, w - 28, 6, C.coral);
    card.add(line);
    if (scene.__ragAnimate) {
      scene.tweens.add({ targets: line, alpha: 0.2, yoyo: true, repeat: 3, duration: 140 });
    }
    fitLabel(scene, card, w / 2 - 36, y - 16, String(spec.meaningLine), {
      maxW: 48,
      maxH: 22,
      size: 18,
      color: C.coralCss,
    });
  }
  if (step >= 2 && spec.meaningLine) {
    const note = getLang() === "ja" ? "線の 下" : "线的下面";
    fitLabel(scene, card, 0, -h / 2 + 4, note, { maxW: w - 24, maxH: 20, size: 16, color: C.coralCss, originY: 0 });
  }
}

function paintShares(scene, card, g, w, h, spec, step) {
  const boards = spec.boards || [];
  const n = Math.max(1, boards.length);
  const gap = 10;
  const colW = (w - 16 - gap * (n - 1)) / n;
  boards.forEach((board, index) => {
    const x0 = -w / 2 + 8 + index * (colW + gap);
    g.fillStyle(index % 2 ? 0xfff6df : 0xe7fbf7, 1);
    g.fillRoundedRect(x0, -h / 2 + 8, colW, h - 16, 16);
    g.lineStyle(index === 0 && step >= 2 ? 5 : 3, index === 0 && step >= 2 ? C.gold : C.stroke, 1);
    g.strokeRoundedRect(x0, -h / 2 + 8, colW, h - 16, 16);
    const header = step >= 2 ? `Page ${board.page}  ${board.score}` : `Page ${board.page}`;
    fitLabel(scene, card, x0 + colW / 2, -h / 2 + 28, `${header}\n${board.title || ""}`.trim(), {
      maxW: colW - 12,
      maxH: 40,
      size: 15,
      color: C.text,
    });
    const words = board.words || [];
    const top = -h / 2 + 54;
    const bottom = h / 2 - 16;
    const rowH = Math.max(16, (bottom - top) / Math.max(1, words.length));
    const maxShare = Math.max(0.2, ...words.map((word) => word.share || 0));
    words.forEach((word, wordIndex) => {
      const y = top + wordIndex * rowH;
      const hot = step >= 1 && word.hot;
      const side = Math.max(12, Math.min(rowH - 4, 18 + 20 * ((word.share || 0) / maxShare)));
      g.fillStyle(hot ? C.gold : 0xfffdf8, 1);
      g.fillRoundedRect(x0 + 8, y + (rowH - side) / 2, side, side, 4);
      g.lineStyle(hot ? 3 : 2, hot ? C.coral : C.stroke, 1);
      g.strokeRoundedRect(x0 + 8, y + (rowH - side) / 2, side, side, 4);
      fitLabel(scene, card, x0 + 12 + side + (colW - side - 20) / 2, y + rowH / 2, `${word.text} ${word.share}`, {
        maxW: Math.max(24, colW - side - 22),
        maxH: rowH - 2,
        size: rowH > 26 ? 13 : 11,
        color: C.text,
        originX: 0.5,
      });
    });
  });
}

function paintTake(scene, card, g, w, h, spec, step) {
  paintLobby(g, w, h);
  lobbySign(scene, card, w, h);
  const gap = 12;
  const colW = (w - 28 - gap) / 2;
  const left = -w / 2 + 10 + colW / 2;
  const right = left + colW + gap;
  const s = Math.max(16, Math.min(h * 0.1, colW * 0.16, 48));
  const actorY = -h * 0.2;
  const blue = addActor(scene, card, left, actorY, s, "blue");
  const gold = addActor(scene, card, right, actorY, s, "gold");
  const one = spec.one || {};
  const many = (spec.many || []).slice(0, 3);
  const oneH = Math.max(78, Math.min(h * 0.34, 150));
  const oneBox = makeSlip(scene, card, colW - 16, oneH, 0xfffdf8, [
    { text: one.title || `Page ${one.page ?? ""}`, y: -oneH * 0.28, opts: { maxW: colW - 28, maxH: oneH * 0.22, size: 16 } },
    { text: `Page ${one.page ?? ""}`, y: 0, opts: { maxW: colW - 28, maxH: oneH * 0.18, size: 14, color: C.muted } },
    { text: String(one.score ?? ""), y: oneH * 0.26, opts: { maxW: colW - 28, maxH: oneH * 0.26, size: 26, color: C.goldCss } },
  ]);
  oneBox.setPosition(left, h * 0.08);
  if (step === 1) {
    fitLabel(scene, card, left, h * 0.08, "✗", { maxW: 48, maxH: 40, size: 32, color: C.coralCss });
    if (scene.__ragAnimate) {
      scene.tweens.add({ targets: blue, angle: 8, duration: 90, yoyo: true, repeat: 3, onComplete: () => blue.setAngle(0) });
    }
  }
  const stackTop = -h * 0.02;
  const stackH = (h * 0.42) / Math.max(1, many.length);
  many.forEach((item, index) => {
    const picked = step >= 2 && item.page === spec.pick;
    const y = stackTop + index * stackH;
    const slip = makeSlip(scene, card, colW - 16, Math.max(36, stackH - 6), picked ? 0xffe08a : 0xfffdf8, [
      {
        text: `${item.title || ""}  ${item.score}`,
        opts: { maxW: colW - 28, maxH: Math.max(20, stackH - 16), size: 15 },
      },
    ]);
    const destY = picked ? y - 18 : y;
    placeFly(scene, slip, right, destY, right, y + 10);
    if (picked) popIn(scene, slip);
  });
  if (step >= 3) {
    const carry = spec.carry ?? one.page;
    const sheet = makeSlip(scene, card, w * 0.7, Math.min(48, h * 0.12), 0xfff1d2, [
      {
        text: `Page ${carry}`,
        opts: { maxW: w * 0.6, maxH: 28, size: 18, color: C.muted },
      },
    ]);
    sheet.setPosition(0, h / 2 - 32);
    fitLabel(scene, card, Math.min(w * 0.3, w / 2 - 22), h / 2 - 32, "?", { maxW: 32, maxH: 28, size: 24, color: C.coralCss });
  }
}

function paintHatCompare(scene, card, g, w, h, spec, step) {
  const lang = getLang() === "ja";
  const s = Math.max(22, Math.min(h * 0.16, w * 0.12, (h * 0.36) / 2.2));
  paintActor(g, 0, h * 0.06, s, "blue");
  const winW = Math.min(140, (w - 40) / 2);
  const winH = Math.min(h * 0.16, 56);
  const y = h * 0.1;
  [-1, 1].forEach((side, index) => {
    const x = side * (winW / 2 + 6);
    g.fillStyle(0xfffdf8, 0.95);
    g.fillRoundedRect(x - winW / 2, y - winH / 2, winW, winH, 8);
    g.lineStyle(3, C.stroke, 1);
    g.strokeRoundedRect(x - winW / 2, y - winH / 2, winW, winH, 8);
    fitLabel(scene, card, x, y, index === 0 ? (lang ? "しつもん" : "问题") : (lang ? "しりょう" : "资料"), {
      maxW: winW - 8,
      maxH: winH - 8,
      size: 16,
    });
  });
  const colors = [C.coral, C.gold, C.teal, C.blue, C.violet, C.coral, C.gold, C.teal];
  const other = [C.blue, C.gold, C.coral, C.blue, C.violet, C.teal, C.gold, C.coral];
  const n = colors.length;
  const bw = Math.min(28, (w - 40) / n - 4);
  const rowY = step === 0 ? [-h * 0.36, h * 0.32] : [-h * 0.16, h * 0.16];
  [colors, other].forEach((row, rowIndex) => {
    const fromY = rowIndex === 0 ? -h * 0.36 : h * 0.32;
    row.forEach((color, index) => {
      const x = -((n - 1) * (bw + 4)) / 2 + index * (bw + 4);
      const yRow = rowY[rowIndex];
      const box = scene.add.rectangle(x, yRow, bw, Math.min(36, h * 0.1), color);
      card.add(box);
      if (step === 0) box.setPosition(x, fromY);
      else placeFly(scene, box, x, yRow, x, fromY);
      const match = step >= 2 && row[index] === colors[index] && rowIndex === 1;
      const matchTop = step >= 2 && colors[index] === other[index] && rowIndex === 0;
      if (match || matchTop) {
        box.setStrokeStyle(3, C.stroke);
        if (scene.__ragAnimate) popIn(scene, box, index * 30);
      }
    });
  });
}

function paintHats(scene, card, g, w, h, spec, step) {
  if (!spec.question) {
    paintHatCompare(scene, card, g, w, h, spec, step);
    return;
  }
  paintLobby(g, w, h);
  lobbySign(scene, card, w, h);
  const narrow = w < 640;
  const cast = castLayout(w, h, { bubbleAbove: false });
  const gap = cast.s * 2.2;
  const xs = [-gap, 0, gap];
  const guest = addActor(scene, card, xs[0], cast.y, cast.s * 0.92);
  const blue = addActor(scene, card, xs[1], cast.y, cast.s, "blue");
  const gold = addActor(scene, card, xs[2], cast.y, cast.s, "gold");
  void guest;
  void blue;
  void gold;
  const lang = getLang();
  const tagY = Math.min(h / 2 - 16, cast.feet + cast.s * 0.15);
  fitLabel(scene, card, xs[0], tagY, lang === "ja" ? "お客さん" : "客人", { maxW: cast.s * 2.2, maxH: 22, size: 15, color: C.muted });
  fitLabel(scene, card, xs[1], tagY, lang === "ja" ? "さがす" : "找", { maxW: cast.s * 2.2, maxH: 22, size: 16, color: C.blueCss });
  fitLabel(scene, card, xs[2], tagY, lang === "ja" ? "書く" : "写", { maxW: cast.s * 2.2, maxH: 22, size: 16, color: C.goldCss });
  const bubbleW = Math.min(narrow ? w * 0.7 : 280, w * 0.42);
  const bubbleH = Math.min(72, Math.max(48, h * 0.16));
  if (step <= 1) {
    const bx = step === 0 ? xs[0] : xs[1];
    const rawY = cast.y - cast.s * 1.55;
    const by = Math.max(-h / 2 + bubbleH / 2 + 6, Math.min(h / 2 - bubbleH / 2 - 6, rawY));
    const clampedBx = Math.max(-w / 2 + bubbleW / 2 + 6, Math.min(w / 2 - bubbleW / 2 - 6, bx));
    const fromX = Math.max(-w / 2 + bubbleW / 2 + 6, Math.min(w / 2 - bubbleW / 2 - 6, xs[0]));
    const bubble = makeBubble(scene, card, clampedBx, by, bubbleW, bubbleH, spec.question || "");
    placeFly(scene, bubble, clampedBx, by, fromX, by);
  }
  if (step >= 2) {
    const writing = step >= 4;
    const slipW = writing ? Math.min(w * 0.46, 340) : Math.min(150, w * 0.28);
    const slipH = writing ? Math.min(h * 0.36, 150) : Math.min(86, h * 0.24);
    const destX = step === 2 ? xs[1] : xs[2];
    const destY = writing ? cast.y - cast.s * 0.2 : cast.y + cast.s * 0.35;
    const fromX = step >= 4 ? xs[2] : xs[1];
    const clampedX = Math.max(-w / 2 + slipW / 2 + 8, Math.min(w / 2 - slipW / 2 - 8, destX));
    const clampedY = Math.max(-h / 2 + slipH / 2 + 8, Math.min(h / 2 - slipH / 2 - 8, destY));
    const lines = [
      { text: `Page ${spec.page || 4}`, y: writing ? -slipH * 0.28 : 0, opts: { maxW: slipW - 16, maxH: 24, size: 16, color: C.goldCss } },
    ];
    if (writing) {
      lines.push({
        text: spec.line || "",
        y: slipH * 0.08,
        opts: { maxW: slipW - 18, maxH: slipH * 0.55, size: 14, color: C.text },
      });
    }
    const slip = makeSlip(scene, card, slipW, slipH, 0xfffdf8, lines);
    placeFly(scene, slip, clampedX, clampedY, fromX, cast.y + cast.s * 0.35);
    if (writing) popIn(scene, slip);
  }
}

function paintCite(scene, card, g, w, h, spec, step) {
  const mode = citeMode(spec);
  paintLobby(g, w, h);
  const s = Math.max(18, Math.min(h * 0.14, w * 0.09, 52));
  const actorX = -w / 2 + s * 1.35 + 12;
  const writer = addActor(scene, card, actorX, h * 0.04, s, "gold");
  const paperW = Math.max(96, w - s * 3.1 - 28);
  const paperH = h - 20;
  const paper = scene.add.container(actorX + s * 1.15 + paperW / 2, 0);
  paper.setData("width", paperW);
  paper.setData("height", paperH);
  const pg = scene.add.graphics();
  pg.fillStyle(0xfffdf8, 1);
  pg.fillRoundedRect(-paperW / 2, -paperH / 2, paperW, paperH, 16);
  pg.lineStyle(5, mode === "idk" && step >= 1 ? C.coral : C.gold, 1);
  pg.strokeRoundedRect(-paperW / 2, -paperH / 2, paperW, paperH, 16);
  paper.add(pg);
  card.add(paper);
  const lang = getLang() === "ja";
  let body = spec.line || "";
  if (mode === "sheet" && step === 0) body = lang ? "＿ページ（＿）に よると：＿＿＿＿" : "根据第 ＿ 页（＿）：＿＿＿＿";
  if (spec.page && mode !== "idk") {
    fitLabel(scene, paper, 0, -paperH * 0.36, `Page ${spec.page}`, {
      maxW: paperW - 20,
      maxH: 26,
      size: 18,
      color: C.goldCss,
    });
  }
  fitLabel(scene, paper, 0, spec.page && mode !== "idk" ? 8 : 0, body, {
    maxW: paperW - 24,
    maxH: paperH * (spec.page && mode !== "idk" ? 0.62 : 0.8),
    size: h > 180 ? 20 : 16,
    color: mode === "idk" && step >= 1 ? C.coralCss : C.text,
  });
  if (mode === "idk" && step >= 1 && scene.__ragAnimate) {
    scene.tweens.add({ targets: writer, angle: 7, duration: 90, yoyo: true, repeat: 3, onComplete: () => writer.setAngle(0) });
  }
  if (mode === "sheet" && step >= 2) {
    const rejectW = Math.min(110, w * 0.28);
    const reject = makeSlip(scene, card, rejectW, 52, 0xffe1e4, [
      { text: "Page 5", opts: { maxW: rejectW - 12, maxH: 28, size: 16, color: C.coralCss } },
    ]);
    const homeX = w / 2 - rejectW / 2 - 10;
    placeFly(scene, reject, homeX, -h / 2 + 36, 0, 0);
    if (scene.__ragAnimate) {
      scene.tweens.add({ targets: paper, angle: 3, duration: 80, yoyo: true, repeat: 3, onComplete: () => paper.setAngle(0) });
    }
  }
  if (mode === "mark" && step >= 1) popIn(scene, paper);
}

function paintFlow(scene, card, g, w, h, spec, step) {
  const steps = spec.steps || [];
  const n = Math.max(1, steps.length);
  const stack = w < n * 150;
  steps.forEach((label, index) => {
    const on = index <= step;
    let x;
    let y;
    let bw;
    let bh;
    if (stack) {
      bh = Math.max(36, (h - 20 - 8 * (n - 1)) / n);
      bw = w - 24;
      x = 0;
      y = -h / 2 + 10 + bh / 2 + index * (bh + 8);
    } else {
      const gap = 12;
      bw = Math.max(64, (w - 24 - gap * (n - 1)) / n);
      bh = h * 0.78;
      x = -w / 2 + 12 + bw / 2 + index * (bw + gap);
      y = 0;
    }
    const box = scene.add.container(x, y);
    box.setData("width", bw);
    box.setData("height", bh);
    const bg = scene.add.graphics();
    bg.fillStyle(on ? (index % 2 ? C.gold : C.blue) : 0xfffdf8, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
    bg.lineStyle(3, C.stroke, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
    box.add(bg);
    fitLabel(scene, box, 0, 0, label, { maxW: bw - 14, maxH: bh - 12, size: 16, color: on ? "#3b2a2e" : C.muted });
    card.add(box);
    if (on && index === step) popIn(scene, box);
  });
}

function paintPair(scene, card, g, w, h, spec, step) {
  const gap = 16;
  const boxW = (w - 28 - gap) / 2;
  const boxH = h - 20;
  [spec.left, spec.right].forEach((item, index) => {
    const x = (index === 0 ? -1 : 1) * (boxW / 2 + gap / 2);
    g.fillStyle(index === 0 ? 0xffe1e4 : 0xe5f8ef, 1);
    g.fillRoundedRect(x - boxW / 2, -boxH / 2, boxW, boxH, 18);
    g.lineStyle(4, C.stroke, 1);
    g.strokeRoundedRect(x - boxW / 2, -boxH / 2, boxW, boxH, 18);
    fitLabel(scene, card, x, -boxH * 0.18, item?.title || "", { maxW: boxW - 20, maxH: boxH * 0.28, size: 26 });
    fitLabel(scene, card, x, boxH * 0.12, item?.body || "", { maxW: boxW - 20, maxH: boxH * 0.32, size: 20, color: C.muted });
    if (step >= 1) {
      fitLabel(scene, card, x, boxH * 0.34, "✓", { maxW: 40, maxH: 36, size: 28, color: "#168f82" });
    }
  });
}

function paintChips(scene, card, g, w, h, spec, step) {
  const chips = spec.chips || [];
  const n = Math.max(1, chips.length);
  const gap = 12;
  const bw = Math.min(140, (w - 24 - gap * (n - 1)) / n);
  const bh = Math.min(h * 0.55, 120);
  chips.forEach((chip, index) => {
    const gone = step >= 1 && chip.on === false;
    const x = -((n - 1) * (bw + gap)) / 2 + index * (bw + gap);
    const y = gone ? -h * 0.22 : 0;
    const box = scene.add.container(x, 0);
    box.setData("width", bw);
    box.setData("height", bh);
    const bg = scene.add.graphics();
    bg.fillStyle(chip.on ? C.gold : 0xfffdf8, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
    bg.lineStyle(3, C.stroke, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
    box.add(bg);
    fitLabel(scene, box, 0, 0, chip.text || "", { maxW: bw - 10, maxH: bh - 10, size: 20 });
    card.add(box);
    placeFly(scene, box, x, y, x, 0);
    if (gone) box.setAlpha(0.45);
  });
}

function paintBoard(scene, card, g, w, h, spec, step) {
  const bw = w - 28;
  const bh = h - 24;
  g.fillStyle(0x3d4a3a, 1);
  g.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 16);
  if (step >= 1) {
    fitLabel(scene, card, 0, 0, spec.open || "", { maxW: bw - 28, maxH: bh - 24, size: 26, color: "#fffdf8" });
  } else {
    g.fillStyle(0xf2efe4, 0.95);
    g.fillRoundedRect(-bw / 2 + 18, -bh / 2 + 18, bw - 36, bh - 36, 10);
    fitLabel(scene, card, 0, 0, spec.covered || "", { maxW: bw - 56, maxH: bh - 48, size: 22, color: C.muted });
  }
}

function paintSign(scene, card, g, w, h, spec, step) {
  paintLobby(g, w, h);
  const bw = Math.min(w * 0.7, 460);
  const bh = Math.min(72, h * 0.18);
  g.fillStyle(C.coral, 1);
  g.fillRoundedRect(-bw / 2, -h * 0.38, bw, bh, 14);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-bw / 2, -h * 0.38, bw, bh, 14);
  fitLabel(scene, card, 0, -h * 0.38 + bh / 2, spec.title || "", {
    maxW: bw - 16,
    maxH: bh - 8,
    size: 24,
    color: "#fffdf8",
  });
  const s = Math.max(24, Math.min(h * 0.18, w * 0.12));
  addActor(scene, card, 0, h * 0.02, s);
  if (step >= 1) {
    [-w * 0.18, w * 0.18].forEach((x, index) => {
      const slip = makeSlip(scene, card, 70, 48, index ? C.gold : C.blue, []);
      placeFly(scene, slip, x, -h * 0.08, x, -h * 0.36);
    });
  } else if (spec.sub) {
    fitLabel(scene, card, 0, h * 0.38, spec.sub, { maxW: w - 24, maxH: 28, size: 16, color: C.muted });
  }
}

function paintBook(scene, card, g, w, h, spec) {
  const bw = w * 0.78;
  const bh = h * 0.78;
  g.fillStyle(C.blue, 1);
  g.fillRoundedRect(-bw / 2, -bh / 2, bw * 0.48, bh, 10);
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-bw * 0.02, -bh / 2, bw * 0.52, bh, 10);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
  fitLabel(scene, card, bw * 0.22, -bh * 0.28, `Page ${spec.page || ""}`, { maxW: bw * 0.4, maxH: 32, size: 26, color: C.goldCss });
  fitLabel(scene, card, bw * 0.22, bh * 0.06, spec.line || spec.badge || "", { maxW: bw * 0.44, maxH: bh * 0.5, size: 16, color: C.text });
}

function paintSwap(scene, card, g, w, h, spec, step) {
  const bw = w - 28;
  const bh = h - 24;
  g.fillStyle(step >= 1 ? 0xd9fbe8 : 0xffe1e4, 1);
  g.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
  fitLabel(scene, card, 0, 0, step >= 1 ? spec.newLine || "" : spec.oldLine || "", {
    maxW: bw - 28,
    maxH: bh - 24,
    size: 22,
  });
}

function paintMemory(scene, card, g, w, h, spec) {
  const s = Math.max(36, Math.min(h * 0.24, w * 0.16));
  g.fillStyle(0xfffdf8, 0.96);
  g.fillCircle(0, 0, s * 2.1);
  g.lineStyle(4, C.stroke, 1);
  g.strokeCircle(0, 0, s * 2.1);
  paintActor(g, 0, s * 0.15, s);
  fitLabel(scene, card, 0, -s * 1.35, spec.line || "", { maxW: w * 0.7, maxH: 36, size: 22, color: C.goldCss });
}

function paintAddress(scene, card, g, w, h, spec) {
  const n = 12;
  const gap = 8;
  const bw = Math.min(48, (w - 36 - gap * (n - 1)) / n);
  const bh = Math.min(h * 0.28, 72);
  for (let i = 0; i < n; i += 1) {
    const x = -((n - 1) * (bw + gap)) / 2 + i * (bw + gap);
    g.fillStyle([C.coral, C.gold, C.teal, C.blue, C.violet][i % 5], 1);
    g.fillRoundedRect(x - bw / 2, -bh / 2, bw, bh, 8);
    g.lineStyle(2, C.stroke, 1);
    g.strokeRoundedRect(x - bw / 2, -bh / 2, bw, bh, 8);
  }
  fitLabel(scene, card, 0, h * 0.22, String(spec.n || ""), { maxW: w - 24, maxH: h * 0.28, size: Math.min(64, h * 0.2), color: C.goldCss });
}

function paintBig(scene, card, g, w, h, spec) {
  paintLongPaper(scene, card, w, h * 0.72, { scissors: false, label: false });
  fitLabel(scene, card, 0, h * 0.34, String(spec.words || ""), { maxW: w - 24, maxH: 56, size: 42, color: C.goldCss });
}

function paintCounts(scene, card, spec) {
  fitLabel(scene, card, 0, -10, `${spec.min}–${spec.max}`, { maxW: 360, maxH: 72, size: 48, color: C.goldCss });
  fitLabel(scene, card, 0, 48, String(spec.focus || ""), { maxW: 280, maxH: 36, size: 22, color: C.muted });
}

function paintZeros(scene, card, g, w, h) {
  paintCardGrid(scene, card, w, h, Array.from({ length: 12 }, (_, index) => ({
    page: index + 1,
    title: "0",
    text: "0",
  })));
}

function paintRules(scene, card, g, w, h, spec, step = 0) {
  const lines = (spec.lines || []).slice(0, 3);
  if (!lines.length) {
    const xs = [-w * 0.22, 0, w * 0.22];
    xs.forEach((x, index) => {
      const on = step >= 1 && index === 0;
      fitLabel(scene, card, x, 0, on ? "⭐" : "☆", { maxW: 64, maxH: 64, size: Math.min(48, h * 0.3), color: on ? C.goldCss : C.muted });
    });
    return;
  }
  const rowH = (h - 16) / lines.length;
  lines.forEach((line, index) => {
    const y = -h / 2 + rowH * (index + 0.5);
    g.fillStyle(index <= step ? C.gold : 0xfffdf8, 1);
    g.fillCircle(-w / 2 + 28, y, 10);
    g.lineStyle(3, C.stroke, 1);
    g.strokeCircle(-w / 2 + 28, y, 10);
    fitLabel(scene, card, 18, y, line, { maxW: w - 72, maxH: rowH - 8, size: 16, originX: 0.5 });
  });
}

function paintJoin(scene, card, g, w, h, spec) {
  const bw = w - 24;
  g.fillStyle(0xfff1d2, 1);
  g.fillRoundedRect(-bw / 2, -h * 0.42, bw, h * 0.32, 14);
  g.lineStyle(3, C.stroke, 1);
  g.strokeRoundedRect(-bw / 2, -h * 0.42, bw, h * 0.32, 14);
  fitLabel(scene, card, 0, -h * 0.26, spec.question || "", { maxW: bw - 20, maxH: h * 0.24, size: 18 });
  const items = spec.items || [];
  items.slice(0, 3).forEach((item, index) => {
    const gap = 10;
    const boxW = (bw - gap * 2) / 3;
    const boxH = h * 0.36;
    const x = -bw / 2 + boxW / 2 + index * (boxW + gap);
    g.fillStyle(index === 0 ? C.gold : 0xfffdf8, 1);
    g.fillRoundedRect(x - boxW / 2, h * 0.02, boxW, boxH, 12);
    g.lineStyle(3, C.stroke, 1);
    g.strokeRoundedRect(x - boxW / 2, h * 0.02, boxW, boxH, 12);
    fitLabel(scene, card, x, h * 0.02 + boxH / 2, `Page ${item.page}`, { maxW: boxW - 10, maxH: boxH - 10, size: 16 });
  });
}

function paintSpec(scene, card, g, w, h, spec, step) {
  const kind = spec.kind;
  if (kind === "bars") paintBars(scene, card, g, w, h, spec, step, { showLine: false });
  else if (kind === "line") paintBars(scene, card, g, w, h, spec, step, { showLine: true });
  else if (kind === "shares") paintShares(scene, card, g, w, h, spec, step);
  else if (kind === "take") paintTake(scene, card, g, w, h, spec, step);
  else if (kind === "zeros") paintZeros(scene, card, g, w, h);
  else if (kind === "cards" && spec.cut && step < 2) paintLongPaper(scene, card, w, h, { scissors: true, step });
  else if (kind === "cards") paintCardGrid(scene, card, w, h, spec.items);
  else if (kind === "pair") paintPair(scene, card, g, w, h, spec, step);
  else if (kind === "flow") paintFlow(scene, card, g, w, h, spec, step);
  else if (kind === "board") paintBoard(scene, card, g, w, h, spec, step);
  else if (kind === "sign") paintSign(scene, card, g, w, h, spec, step);
  else if (kind === "cite") paintCite(scene, card, g, w, h, spec, step);
  else if (kind === "book") paintBook(scene, card, g, w, h, spec);
  else if (kind === "swap") paintSwap(scene, card, g, w, h, spec, step);
  else if (kind === "memory") paintMemory(scene, card, g, w, h, spec);
  else if (kind === "address") paintAddress(scene, card, g, w, h, spec);
  else if (kind === "big") paintBig(scene, card, g, w, h, spec);
  else if (kind === "counts") paintCounts(scene, card, spec);
  else if (kind === "hats") paintHats(scene, card, g, w, h, spec, step);
  else if (kind === "rules" || kind === "stars") paintRules(scene, card, g, w, h, spec, step);
  else if (kind === "join") paintJoin(scene, card, g, w, h, spec);
  else if (kind === "chips") paintChips(scene, card, g, w, h, spec, step);
  else paintRules(scene, card, g, w, h, { lines: [] }, step);
}

function clearArt(scene) {
  const layer = scene.frame?.stage;
  if (!layer) return;
  const kill = (node) => {
    scene.tweens?.killTweensOf(node);
    node.list?.forEach(kill);
  };
  for (const child of [...(layer.list || [])]) {
    if (child.getData?.("artPart")) {
      kill(child);
      child.destroy();
    }
  }
}

function settleArt(scene, band) {
  if (!band || !scene.frame) return;
  const ceiling = ctaCeiling(scene.frame);
  keepStageAboveCta(scene, band, ceiling);
  const bottom = Math.min(layerBottom(scene.frame.stage, band.top), ceiling);
  scene.frame.lastExample = {
    ...band,
    bottom,
    h: Math.max(16, bottom - band.top),
  };
}

export function drawRagArt(scene, stage, page, { phase = 0 } = {}) {
  const lang = getLang();
  const spec = page?.shared?.locales?.[lang] || page?.shared?.locales?.zh || { kind: "stars" };
  if (scene.__ragPage !== page?.id) {
    scene.__ragPage = page?.id || "";
    scene.__ragStep = 0;
  }
  scene.__ragStage = stage;
  scene.__ragBeat = page;
  const step = Math.max(0, Math.min(lastStep(spec), scene.__ragStep || 0));
  scene.__ragStep = step;
  const phone = !isWidePcTutor();
  const ceiling = ceilingOf(scene, stage);
  const capSize = phone ? 18 : 22;
  const capSlot = phone ? 34 : 36;
  const block = STICKER_SHADOW_Y + CAPTION_CLEAR + capSlot;
  const room = Math.max(48, ceiling - stage.top - 2);
  const height = Math.max(56, room - block);
  const width = Math.max(96, stage.w - 4);
  const top = stage.top + 2;
  const card = scene.add.container(stage.cx, top + height / 2);
  const g = scene.add.graphics();
  drawSticker(g, -width / 2, -height / 2, width, height, Math.min(18, height * 0.08), C.surface);
  card.add(g);
  card.setData("width", width);
  paintSpec(scene, card, g, width, height, spec, step);
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
    scene.__ragAnimate = next > step;
    scene.__ragStep = next;
    scene.time.delayedCall(0, () => {
      if (!scene.sys?.isActive()) return;
      clearArt(scene);
      drawRagArt(scene, scene.__ragStage || stage, page, { phase: scene.phase ?? phase });
      settleArt(scene, scene.__ragStage || stage);
    });
  });
  scene.frame.stage.add(card);

  const caption = captionFor(spec, step) || t(page?.keys?.art || "") || " ";
  const capY = top + height + STICKER_SHADOW_Y + CAPTION_CLEAR;
  const note = markCaption(
    scene.add.text(stage.left + 4, capY, "", uiText(capSize, { color: C.muted, align: "left" })).setOrigin(0, 0),
  );
  let font = capSize;
  const maxW = Math.max(80, stage.w - 8);
  const applyCap = (n) => {
    note.setFontSize(n);
    note.setText(wrapBody(scene, caption, n, maxW));
  };
  applyCap(font);
  while (note.height > capSlot && font > 13) {
    font -= 1;
    applyCap(font);
  }
  note.setData("source", caption);
  note.setData("wrapWidth", maxW);
  note.setData("artPart", "scheme-label");
  scene.frame.stage.add(note);
  scene.__ragAnimate = false;
  window.__nanoGPTRagStep = step;
  window.__nanoGPTRagTap = () => card.emit("pointerdown");
}
