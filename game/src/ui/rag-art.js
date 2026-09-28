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

function stageMinFont() {
  return isWidePcTutor() ? 13 : 12;
}

function cardFont() {
  return isWidePcTutor() ? 14 : 13;
}

function trackTween(scene, config) {
  if (!scene.__ragAnimate) return;
  scene.__ragTweenLeft = (scene.__ragTweenLeft || 0) + 1;
  window.__nanoGPTRagSettled = false;
  const prev = config.onComplete;
  scene.tweens.add({
    ...config,
    onComplete: (...args) => {
      if (typeof prev === "function") prev(...args);
      scene.__ragTweenLeft = Math.max(0, (scene.__ragTweenLeft || 1) - 1);
      if (scene.__ragTweenLeft <= 0) window.__nanoGPTRagSettled = true;
    },
  });
}

function markBox(node, role, { id = "", hold = "", w, h } = {}) {
  if (!node?.setData) return node;
  node.setData("stageRole", role);
  if (id) node.setData("stageId", id);
  if (hold) node.setData("stageHold", hold);
  if (w > 0) node.setData("width", w);
  if (h > 0) node.setData("height", h);
  return node;
}

function addZone(scene, parent, x, y, w, h, role, extra = {}) {
  const zone = scene.add.zone(x, y, Math.max(2, w), Math.max(2, h));
  markBox(zone, role, { ...extra, w: Math.max(2, w), h: Math.max(2, h) });
  parent.add(zone);
  return zone;
}

function redrawArt(scene) {
  const stage = scene.__ragStage;
  const page = scene.__ragBeat;
  if (!stage || !page) return;
  clearArt(scene);
  drawRagArt(scene, stage, page, { phase: scene.phase ?? 0 });
  settleArt(scene, stage);
}

const CARD_FACTS = {
  zh: {
    1: "前台24小时",
    2: "下午3:00",
    3: "上午11:00",
    4: "早上6:30到9:30",
    5: "晚上6:00到9:00",
    6: "在屋顶上",
    7: "在一楼",
    8: "每个房间都有",
    9: "1000日元",
    10: "免费",
    11: "放在前台",
    12: "保管一个月",
  },
  ja: {
    1: "24 hours",
    2: "3:00 PM",
    3: "11:00 AM",
    4: "6:30–9:30",
    5: "6:00–9:00",
    6: "on the roof",
    7: "1st floor",
    8: "every room",
    9: "1,000 yen",
    10: "free",
    11: "front desk",
    12: "one month",
  },
};

function cardFact(item) {
  const lang = getLang() === "ja" ? "ja" : "zh";
  const page = Number(item?.page);
  if (CARD_FACTS[lang][page]) return CARD_FACTS[lang][page];
  const raw = String(item?.text || "").trim();
  const parts = raw.split(/(?<=[。！？.])/u).map((part) => part.trim()).filter(Boolean);
  const withDigit = parts.find((part) => /\d/.test(part));
  return (withDigit || parts[0] || "").trim();
}

function wrapBody(scene, raw, size, maxW) {
  const text = String(raw ?? "");
  if (!text) return "";
  // Latin words stay whole even when the string has no spaces ("checkout", "Swimming").
  if (text.includes(" ") || /[A-Za-z]{2,}/.test(text)) return wrapAtBreaks(scene, text, size, maxW, uiText, { latinWhole: true });
  return wrapToWidth(scene, text, size, maxW);
}

function fitLabel(scene, parent, x, y, raw, { maxW, maxH = 400, size = 16, min, color, bg, originX = 0.5, originY = 0.5, align = "center" } = {}) {
  const source0 = String(raw ?? "");
  let source = source0;
  const floor = Math.max(stageMinFont(), min || 0);
  let font = Math.max(floor, size);
  const node = scene.add.text(x, y, "", uiText(font, { color, align })).setOrigin(originX, originY);
  const apply = (n, value) => {
    node.setFontSize(n);
    node.setText(wrapBody(scene, value, n, maxW));
  };
  apply(font, source);
  let guard = 0;
  while (guard < 28 && font > floor && (node.height > maxH + 0.5 || node.width > maxW + 1)) {
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
      while (guard < 40 && font > floor && (node.height > maxH + 0.5 || node.width > maxW + 1)) {
        guard += 1;
        font -= 1;
        apply(font, source);
      }
    }
  }
  if (node.height > maxH + 0.5) {
    let lines = String(node.text || "").split("\n");
    while (lines.length > 1 && node.height > maxH + 0.5) {
      lines = lines.slice(0, -1);
      node.setText(lines.join("\n"));
    }
    source = String(node.text || "");
  }
  if (node.height > maxH + 0.5 || node.width > maxW + 1) {
    const fit = Math.min(1, maxW / Math.max(1, node.width), maxH / Math.max(1, node.height));
    if (font * fit + 0.05 >= floor) node.setScale(Math.min(1, fit));
  }
  node.setData("source", source);
  node.setData("wrapWidth", maxW);
  if (bg) node.setData("stageBg", bg);
  if (color) node.setData("stageFg", color);
  parent.add(node);
  return node;
}

function placeFly(scene, node, x, y, fromX, fromY) {
  node.setPosition(x, y);
  if (!scene.__ragAnimate) return;
  if (Math.hypot(x - fromX, y - fromY) < 2) return;
  node.setPosition(fromX, fromY);
  trackTween(scene, { targets: node, x, y, duration: 520, ease: "Cubic.Out" });
}

function popIn(scene, node, delay = 0) {
  if (!scene.__ragAnimate) return;
  node.setScale(0.82);
  trackTween(scene, { targets: node, scaleX: 1, scaleY: 1, duration: 320, delay, ease: "Back.Out" });
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
    const pw = s * 0.7;
    const ph = s * 0.42;
    const px = s * 0.22;
    const py = s * 1.05;
    g.fillStyle(0xfffdf8, 1);
    g.fillRoundedRect(px, py, pw, ph, 4);
    g.lineStyle(Math.max(2, s * 0.06), C.blue, 1);
    g.strokeRoundedRect(px, py, pw, ph, 4);
  }
  if (hat === "gold") {
    g.lineStyle(Math.max(4, s * 0.12), C.gold, 1);
    g.lineBetween(x + s * 0.35, y + s * 0.45, x + s * 1.15, y + s * 1.35);
  }
}

function addActor(scene, card, x, y, s, hat, id = "") {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  paintActor(g, 0, 0, s, hat);
  box.add(g);
  if (id) box.setData("stageId", id);
  const hasHat = hat === "blue" || hat === "gold";
  const faceTop = hasHat ? -s * 2.28 : -s * 1.08;
  const faceBottom = s * 0.96;
  const faceH = Math.max(8, faceBottom - faceTop);
  const faceCenter = (faceTop + faceBottom) / 2;
  const visualTop = hasHat ? -s * 2.28 : -s * 1.08;
  const visualH = Math.max(8, s * 1.59 - visualTop);
  markBox(box, "actor", { id, w: s * 2.1, h: visualH });
  addZone(scene, box, 0, faceCenter, s * 2.02, faceH, "face", { id });
  addZone(scene, box, 0, s * 1.18, s * 1.5, s * 0.82, "body", { id });
  if (hat === "blue") {
    addZone(scene, box, s * 0.57, s * 1.3, s * 0.7, s * 0.42, "held", { hold: id });
  }
  card.add(box);
  return box;
}

const CHIP_BG = "#fffdf8";
const ROLE_INK = {
  guest: "#3b2a2e",
  blue: "#0f5fa8",
  gold: "#7a4e00",
};

function textWidth(scene, value, size) {
  const probe = scene.add.text(-9000, -9000, value, uiText(size)).setVisible(false);
  const width = probe.width;
  probe.destroy();
  return width;
}

function latinWords(raw) {
  return String(raw || "").match(/[A-Za-z]{2,}(?:[-'][A-Za-z]+)*/g) || [];
}

function bounceBack(scene, node, x, y, fromX, fromY) {
  node.setPosition(x, y);
  if (!scene.__ragAnimate) return;
  if (Math.hypot(x - fromX, y - fromY) < 2) return;
  node.setPosition(fromX, fromY);
  trackTween(scene, { targets: node, x, y, duration: 720, ease: "Back.Out" });
}

function addNameChip(scene, parent, x, y, text, { id = "", ink = "#3b2a2e", chipW = 72, chipH = 28 } = {}) {
  const box = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-chipW / 2, -chipH / 2, chipW, chipH, Math.min(12, chipH / 2));
  g.lineStyle(3, C.stroke, 1);
  g.strokeRoundedRect(-chipW / 2, -chipH / 2, chipW, chipH, Math.min(12, chipH / 2));
  box.add(g);
  const font = Math.max(stageMinFont(), Math.min(isWidePcTutor() ? 18 : 14, chipH - 10));
  const node = fitLabel(scene, box, 0, 0, text, {
    maxW: chipW - 12,
    maxH: chipH - 8,
    size: font,
    min: stageMinFont(),
    color: ink,
    bg: CHIP_BG,
  });
  markBox(box, "chip", { id, w: chipW, h: chipH });
  markBox(node, "label", { id, w: Math.max(2, node.displayWidth || node.width), h: Math.max(2, node.displayHeight || node.height) });
  parent.add(box);
  return box;
}

function chooseFont(scene, text, maxW, maxH, { max = 26, min = 13 } = {}) {
  const floor = Math.max(stageMinFont(), min);
  let font = Math.max(floor, max);
  while (font > floor) {
    const block = textBlock(scene, text, font, maxW);
    if (block.height <= maxH + 0.5 && block.width <= maxW + 1) return font;
    font -= 1;
  }
  return floor;
}

function castFrame(w, h) {
  const pc = isWidePcTutor();
  const margin = Math.min(8, Math.max(4, h * 0.03));
  const top = -h / 2 + margin;
  const bottom = h / 2 - margin;
  const inner = Math.max(20, bottom - top);
  const front = Math.min(pc ? 22 : 16, Math.max(8, inner * 0.055));
  const chipH = Math.min(pc ? 40 : 26, Math.max(16, inner * (pc ? 0.1 : 0.09)));
  const gap = Math.min(8, Math.max(4, inner * 0.02));
  const desk = bottom - front;
  const chipBottom = desk - gap;
  const chipTop = chipBottom - chipH;
  const feet = chipTop - gap;
  const target = h * (pc ? 0.34 : 0.3);
  const minCard = Math.max(24, inner * (pc ? 0.18 : 0.16));
  const cardGap = Math.min(12, Math.max(4, inner * 0.02));
  let visual = Math.min(target, Math.max(inner * 0.28, feet - top - minCard - cardGap));
  if (feet - visual - cardGap < top + minCard) visual = Math.max(inner * 0.28, feet - top - minCard - cardGap);
  let cardTop = top + 2;
  let cardBottom = feet - visual - cardGap;
  let cardH = cardBottom - cardTop;
  const cardCap = h * (pc ? 0.42 : 0.36);
  if (cardH > cardCap) {
    visual = Math.min(feet - top - cardGap - cardCap, Math.max(visual, target));
    cardBottom = feet - visual - cardGap;
    cardH = cardBottom - cardTop;
    if (cardH > cardCap) {
      cardTop = cardBottom - cardCap;
      cardH = cardCap;
    }
  }
  return { pc, margin, top, bottom, desk, front, chipH, chipTop, chipBottom, feet, visual, cardTop, cardBottom, cardH };
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
  const feet = bubbleAbove ? h * 0.08 : h * 0.3;
  const topLimit = bubbleAbove ? -h / 2 + bubbleH + 14 : -h / 2 + 8;
  const hatRoom = Math.max(40, feet - topLimit);
  const s = Math.max(26, Math.min(hatRoom / 3.7, w * 0.16, h * 0.26));
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
  g.fillTriangle(-10, h / 2 - 2, 10, h / 2 - 2, 0, h / 2 + 6);
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

function gridShape(count, w, h, minInnerW = 0) {
  const cellOf = (cols, rows) => ({
    cols,
    rows,
    cellW: (w - 16 - 8 * (cols - 1)) / cols,
    cellH: (h - 16 - 8 * (rows - 1)) / rows,
  });
  if (count === 12) {
    for (const cols of [4, 3, 2]) {
      const plan = cellOf(cols, Math.ceil(12 / cols));
      if (plan.cellW - 12 >= minInnerW && plan.cellH >= 42) return plan;
    }
    return cellOf(2, 6);
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

function textBlock(scene, raw, size, maxW) {
  const wrapped = wrapBody(scene, raw, size, maxW);
  const probe = scene.add.text(0, 0, wrapped, uiText(size)).setVisible(false);
  const height = probe.height;
  const width = probe.width;
  probe.destroy();
  return { wrapped, height, width };
}

function paintCardZoom(scene, card, w, h, item) {
  const font = Math.max(cardFont(), 15);
  const slipW = w - 16;
  const slipH = h - 16;
  const box = scene.add.container(0, 0);
  markBox(box, "card", { id: `zoom-${item.page}`, w: slipW, h: slipH });
  const g = scene.add.graphics();
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(-slipW / 2, -slipH / 2, slipW, slipH, 16);
  g.lineStyle(4, C.gold, 1);
  g.strokeRoundedRect(-slipW / 2, -slipH / 2, slipW, slipH, 16);
  box.add(g);
  const head = `Page ${item.page}  ${item.title || ""}`.trim();
  const headBlock = textBlock(scene, head, font, slipW - 28);
  const bodyTop = -slipH / 2 + 16 + headBlock.height + 8;
  const bodyH = Math.max(20, slipH / 2 - 12 - bodyTop);
  fitLabel(scene, box, 0, -slipH / 2 + 12 + headBlock.height / 2, head, {
    maxW: slipW - 28,
    maxH: headBlock.height + 4,
    size: font,
    color: C.goldCss,
  });
  fitLabel(scene, box, 0, bodyTop, item.text || "", {
    maxW: slipW - 28,
    maxH: bodyH,
    size: font,
    color: C.text,
    originY: 0,
  });
  card.add(box);
  box.setSize(slipW, slipH);
  box.setInteractive(new Phaser.Geom.Rectangle(-slipW / 2, -slipH / 2, slipW, slipH), Phaser.Geom.Rectangle.Contains);
  box.on("pointerdown", (_pointer, _x, _y, event) => {
    event?.stopPropagation?.();
    scene.__ragZoom = null;
    scene.__ragAnimate = false;
    redrawArt(scene);
  });
}

function paintCardGrid(scene, card, w, h, items) {
  const list = items || [];
  const zoom = scene.__ragZoom;
  if (zoom != null) {
    const item = list.find((entry) => entry.page === zoom) || list[zoom];
    if (item) {
      paintCardZoom(scene, card, w, h, item);
      return;
    }
  }
  const font = cardFont();
  const seen = new Set();
  let minInner = 0;
  list.forEach((item) => {
    const blob = `${item.title || ""} ${cardFact(item)}`;
    latinWords(blob).forEach((word) => {
      if (seen.has(word)) return;
      seen.add(word);
      minInner = Math.max(minInner, textWidth(scene, word, stageMinFont()));
    });
  });
  const shape = gridShape(Math.max(1, list.length), w, h, minInner);
  list.forEach((item, index) => {
    const col = index % shape.cols;
    const row = Math.floor(index / shape.cols);
    const x = -w / 2 + 8 + shape.cellW / 2 + col * (shape.cellW + 8);
    const y = -h / 2 + 8 + shape.cellH / 2 + row * (shape.cellH + 8);
    const cell = scene.add.container(x, y);
    markBox(cell, "card", { id: `page-${item.page}`, w: shape.cellW, h: shape.cellH });
    const g = scene.add.graphics();
    const fill = index % 2 ? 0xfff1c9 : 0xdff8f4;
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-shape.cellW / 2, -shape.cellH / 2, shape.cellW, shape.cellH, 10);
    g.lineStyle(3, C.stroke, 1);
    g.strokeRoundedRect(-shape.cellW / 2, -shape.cellH / 2, shape.cellW, shape.cellH, 10);
    cell.add(g);
    const innerW = Math.max(20, shape.cellW - 12);
    const innerH = Math.max(16, shape.cellH - 12);
    const fact = cardFact(item);
    const title = String(item.title || "").trim();
    const pageLine = `Page ${item.page}`;
    const candidates = [
      [pageLine, title, fact].filter(Boolean).join("\n"),
      [pageLine, title].filter(Boolean).join("\n"),
      pageLine,
    ];
    let chosen = candidates[candidates.length - 1];
    let chosenSize = stageMinFont();
    for (const candidate of candidates) {
      const size = chooseFont(scene, candidate, innerW, innerH, { max: font, min: stageMinFont() });
      const block = textBlock(scene, candidate, size, innerW);
      if (block.height <= innerH + 0.5 && block.width <= innerW + 1) {
        chosen = candidate;
        chosenSize = size;
        break;
      }
    }
    fitLabel(scene, cell, 0, 0, chosen, {
      maxW: innerW,
      maxH: innerH,
      size: chosenSize,
      min: stageMinFont(),
      color: C.text,
      bg: index % 2 ? "#fff1c9" : "#dff8f4",
    });
    card.add(cell);
    cell.setSize(shape.cellW, shape.cellH);
    cell.setInteractive(
      new Phaser.Geom.Rectangle(-shape.cellW / 2, -shape.cellH / 2, shape.cellW, shape.cellH),
      Phaser.Geom.Rectangle.Contains,
    );
    cell.on("pointerdown", (_pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      scene.__ragZoom = item.page;
      scene.__ragAnimate = false;
      redrawArt(scene);
    });
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
  addZone(scene, card, 0, 0, paperW, paperH, "prop", { id: "paper" });
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
    trackTween(scene, { targets: box, x: endX, duration: 680, ease: "Sine.InOut" });
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
  const shareW = (w - 48 - gap * (n - 1)) / n;
  const barW = Math.max(36, isWidePcTutor() ? shareW : Math.min(120, shareW));
  const rowW = n * barW + (n - 1) * gap;
  const base = h / 2 - Math.min(46, h * 0.22);
  const top = -h / 2 + Math.min(28, h * 0.16);
  const span = Math.max(12, base - top);
  addZone(scene, card, 0, (top + base) / 2, Math.max(rowW + 16, w * 0.72), Math.max(12, base - top), "prop", { id: "bars" });
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
      trackTween(scene, { targets: col, scaleY: 1, duration: 480, delay: index * 70, ease: "Cubic.Out" });
    }
    const labelW = Math.max(stageMinFont() * 2, barW + gap - 16);
    fitLabel(scene, card, x, Math.max(top + 16, base - bh), String(item.score), {
      maxW: labelW,
      maxH: 24,
      size: h > 160 ? 20 : 16,
      color: C.goldCss,
      originY: 1,
    });
    fitLabel(scene, card, x, base + 6, item.title ? `${item.title}\nPage ${item.page}` : `Page ${item.page}`, {
      maxW: labelW,
      maxH: Math.max(stageMinFont() + 2, Math.min(36, h / 2 - base - 10)),
      size: cardFont(),
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
      trackTween(scene, { targets: line, alpha: 0.2, yoyo: true, repeat: 3, duration: 140 });
    }
    fitLabel(scene, card, Math.min(w / 2 - 28, w / 2 - 8), Math.max(-h / 2 + 14, y - 14), String(spec.meaningLine), {
      maxW: 48,
      maxH: 20,
      size: 18,
      color: C.coralCss,
    });
  }
  if (step >= 2 && spec.meaningLine) {
    const note = getLang() === "ja" ? "線の 下" : "线的下面";
    fitLabel(scene, card, 0, -h / 2 + 4, note, { maxW: w - 24, maxH: 20, size: 16, color: C.coralCss, originY: 0 });
  }
}

function paintShareRow(scene, parent, x, y, rowW, rowH, word, maxShare, step) {
  const font = cardFont();
  const hot = step >= 1 && word.hot;
  const label = String(word.text ?? "");
  const num = String(word.share ?? "");
  const labelBox = textBlock(scene, label, font, rowW);
  const numBox = textBlock(scene, num, font, rowW);
  const numW = Math.min(rowW * 0.38, Math.max(28, numBox.width + 4));
  const chipW = Math.min(Math.max(28, rowW - numW - 16), Math.max(28, labelBox.width + 12));
  const gap = 6;
  const barRoom = Math.max(6, rowW - chipW - numW - gap * 2);
  const shareRatio = Math.max(0.12, (Number(word.share) || 0) / maxShare);
  const barW = Math.min(barRoom, Math.max(6, barRoom * shareRatio));
  const chipH = Math.min(rowH - 4, Math.max(font + 4, 18));
  const row = scene.add.container(x, y);
  const chip = scene.add.container(-rowW / 2 + chipW / 2, 0);
  const cg = scene.add.graphics();
  cg.fillStyle(hot ? C.gold : 0xfffdf8, 1);
  cg.fillRoundedRect(-chipW / 2, -chipH / 2, chipW, chipH, 6);
  cg.lineStyle(hot ? 3 : 2, hot ? C.coral : C.stroke, 1);
  cg.strokeRoundedRect(-chipW / 2, -chipH / 2, chipW, chipH, 6);
  chip.add(cg);
  fitLabel(scene, chip, 0, 0, label, { maxW: chipW - 8, maxH: chipH - 4, size: font, color: C.text });
  markBox(chip, "word", { id: label, w: chipW, h: chipH });
  row.add(chip);
  const barX = -rowW / 2 + chipW + gap + barW / 2;
  const bar = scene.add.rectangle(barX, 0, barW, Math.max(8, chipH * 0.45), hot ? C.coral : C.teal);
  markBox(bar, "bar", { id: label, w: barW, h: Math.max(8, chipH * 0.45) });
  row.add(bar);
  const numX = rowW / 2 - numW / 2;
  const share = fitLabel(scene, row, numX, 0, num, {
    maxW: numW,
    maxH: rowH - 2,
    size: font,
    color: C.goldCss,
  });
  markBox(share, "share", { id: label, w: share.width, h: share.height });
  parent.add(row);
  return row;
}

function shareColumns(scene, words, inner, avail, font) {
  const minRow = font + 6;
  const { min } = shareWordMin(scene, words, font);
  const minCol = Math.min(inner, min);
  const maxCols = Math.max(1, Math.min(words.length, Math.floor((inner + 6) / (minCol + 6))));
  let chosen = 1;
  for (let cols = 1; cols <= maxCols; cols += 1) {
    chosen = cols;
    const rows = Math.ceil(words.length / cols);
    if (rows * minRow <= avail + 1) return cols;
  }
  return chosen;
}

function paintShareBoard(scene, card, g, x, y, bw, bh, board, step) {
  g.fillStyle(0xfffdf8, 1);
  g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 14);
  g.lineStyle(step >= 2 ? 4 : 3, step >= 2 ? C.gold : C.stroke, 1);
  g.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 14);
  addZone(scene, card, x, y, bw, bh, "prop", { id: `board-${board.page}` });
  const font = cardFont();
  const headerH = font + 10;
  const headerY = y - bh / 2 + headerH / 2 + 4;
  const header = `Page ${board.page}`;
  const score = step >= 2 ? String(board.score ?? "") : "";
  const titleW = score ? bw * 0.62 : bw - 16;
  fitLabel(scene, card, x - (score ? bw * 0.14 : 0), headerY, `${header}  ${board.title || ""}`.trim(), {
    maxW: titleW,
    maxH: headerH - 2,
    size: font,
    color: C.text,
  });
  if (score) {
    fitLabel(scene, card, x + bw / 2 - 8, headerY, score, {
      maxW: bw * 0.22,
      maxH: headerH - 2,
      size: font,
      color: C.goldCss,
      originX: 1,
    });
  }
  const words = board.words || [];
  const top = y - bh / 2 + headerH + 10;
  const bottom = y + bh / 2 - 6;
  const avail = Math.max(font + 6, bottom - top);
  const inner = bw - 14;
  const cols = shareColumns(scene, words, inner, avail, font);
  const rows = Math.max(1, Math.ceil(words.length / cols));
  const rowH = avail / rows;
  const colW = (inner - (cols - 1) * 6) / cols;
  const maxShare = Math.max(0.2, ...words.map((word) => Number(word.share) || 0));
  words.forEach((word, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rowY = top + rowH * row + rowH / 2;
    const rowX = x - inner / 2 + colW / 2 + col * (colW + 6);
    paintShareRow(scene, card, rowX, rowY, colW, Math.max(font + 4, rowH - 4), word, maxShare, step);
  });
}

function shareWordMin(scene, words, font) {
  const longest = words.reduce((best, word) => {
    const box = textBlock(scene, String(word.text ?? ""), font, 480);
    return Math.max(best, box.width);
  }, 24);
  const num = textBlock(scene, "0.000", font, 160).width;
  return { longest, num, min: longest + num + 20 };
}

function boardFits(scene, board, bw, bh, font) {
  const words = board.words || [];
  if (!words.length) return true;
  const { min } = shareWordMin(scene, words, font);
  const header = font + 12;
  const avail = bh - header - 8;
  const inner = bw - 14;
  if (avail < font + 4 || inner < min) return false;
  const cols = Math.max(1, Math.floor((inner + 6) / (min + 6)));
  const rows = Math.ceil(words.length / cols);
  return rows * (font + 6) <= avail + 1;
}

function paintShares(scene, card, g, w, h, spec, step) {
  const boards = spec.boards || [];
  const n = Math.max(1, boards.length);
  const font = cardFont();
  const sideGap = 8;
  const sideW = (w - 16 - sideGap * (n - 1)) / n;
  const sideH = h - 12;
  const sideBySide = boards.every((board) => boardFits(scene, board, sideW, sideH, font));
  if (sideBySide) {
    boards.forEach((board, index) => {
      const x = -w / 2 + 8 + sideW / 2 + index * (sideW + sideGap);
      paintShareBoard(scene, card, g, x, 0, sideW, sideH, board, step);
    });
    return;
  }
  const gap = 6;
  let used = 0;
  const sizes = boards.map((board) => {
    const words = board.words || [];
    const { min } = shareWordMin(scene, words, font);
    const inner = w - 28;
    const cols = Math.max(1, Math.min(words.length || 1, Math.floor((inner + 6) / (min + 6))));
    const rows = Math.max(1, Math.ceil((words.length || 1) / cols));
    return font + 14 + rows * (font + 6);
  });
  const sum = sizes.reduce((total, size) => total + size, 0) + gap * (n - 1);
  if (sum > h - 8) {
    paintShareFlat(scene, card, g, w, h, boards, step, font);
    return;
  }
  boards.forEach((board, index) => {
    const bh = sizes[index];
    const y = -h / 2 + 4 + used + bh / 2;
    used += bh + gap;
    paintShareBoard(scene, card, g, 0, y, w - 12, bh, board, step);
  });
}

function paintShareFlat(scene, card, g, w, h, boards, step, font) {
  const words = [];
  boards.forEach((board) => {
    (board.words || []).forEach((word) => words.push(word));
  });
  const { min } = shareWordMin(scene, words, font);
  const inner = w - 16;
  const cols = Math.max(1, Math.min(words.length, Math.floor((inner + 6) / (Math.min(inner, min) + 6))));
  const rows = Math.max(1, Math.ceil(words.length / cols));
  const headerH = font + 6;
  const header = boards
    .map((board) => (step >= 2 ? `Page ${board.page} ${board.score}` : `Page ${board.page}`))
    .join("  ");
  fitLabel(scene, card, 0, -h / 2 + 4 + headerH / 2, header, {
    maxW: inner,
    maxH: headerH,
    size: font,
    color: C.text,
  });
  const top = -h / 2 + 8 + headerH;
  const avail = Math.max(font + 4, h / 2 - 6 - top);
  const rowH = avail / rows;
  const colW = (inner - (cols - 1) * 6) / cols;
  const maxShare = Math.max(0.2, ...words.map((word) => Number(word.share) || 0));
  words.forEach((word, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rowY = top + rowH * row + rowH / 2;
    const rowX = -inner / 2 + colW / 2 + col * (colW + 6);
    paintShareRow(scene, card, rowX, rowY, colW, Math.max(font + 2, rowH - 3), word, maxShare, step);
  });
}

function paintLobbyFrame(g, w, top, bottom, desk) {
  const left = -w / 2 + 8;
  const width = w - 16;
  const wallH = Math.max(8, desk - top);
  g.fillStyle(0xf6e4cf, 1);
  g.fillRoundedRect(left, top, width, wallH, 16);
  if (w >= 640 && wallH > 78) {
    const winW = Math.min(120, w * 0.16);
    const winH = Math.min(70, wallH - 20);
    g.fillStyle(0xb7e3fb, 1);
    g.fillRoundedRect(left + 12, top + 10, winW, winH, 12);
    g.lineStyle(3, C.stroke, 1);
    g.strokeRoundedRect(left + 12, top + 10, winW, winH, 12);
    g.fillStyle(C.sun, 1);
    g.fillCircle(left + 12 + winW * 0.72, top + 10 + winH * 0.35, Math.min(14, winH * 0.2));
  }
  g.fillStyle(0xf0d2a8, 1);
  g.fillRoundedRect(left, desk - 5, width, 10, 5);
  const frontH = Math.max(8, bottom - desk - 6);
  g.fillStyle(0xc4894a, 1);
  g.fillRoundedRect(left, desk + 6, width, frontH, 12);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(left, desk + 6, width, frontH, 12);
}

function paintTake(scene, card, g, w, h, spec, step) {
  const lang = getLang() === "ja";
  const font = cardFont();
  const pc = isWidePcTutor();
  const tight = h < 220;
  const margin = tight ? 4 : 8;
  const top = -h / 2 + margin;
  const bottom = h / 2 - margin;
  const inner = Math.max(20, bottom - top);
  const front = Math.min(pc ? 24 : 18, Math.max(tight ? 6 : 8, inner * (tight ? 0.04 : 0.05)));
  const chipH = Math.min(pc ? 40 : 26, Math.max(tight ? 14 : (pc ? 28 : 22), tight ? inner * 0.12 : font + 10));
  const desk = bottom - front;
  const chipGap = tight ? 3 : 8;
  const chipTop = desk - chipGap - chipH;
  const feet = chipTop - chipGap;
  const one = spec.one || {};
  const many = (spec.many || []).slice(0, 3);
  const rows = Math.max(1, many.length);
  const stacked = w < 560;
  const slack = tight ? 3 : 8;
  const bannerH = !tight && step >= 3 ? Math.min(pc ? 44 : 30, Math.max(font + 8, inner * (pc ? 0.1 : 0.08))) : 0;
  const rowH = tight ? Math.max(16, font + 2) : font + (pc ? 16 : 10);
  const wantCards = (bannerH ? bannerH + slack : 0) + (stacked ? rows * (rowH + slack) : rowH + slack);
  const targetVisual = h * (pc ? 0.32 : tight ? 0.24 : 0.28);
  const maxVisual = feet - top - wantCards - (tight ? 4 : 16);
  let s = Math.max(2, Math.min(targetVisual, maxVisual) / 3.87);
  const leftX = stacked ? -w * 0.22 : -w * 0.28;
  const rightX = stacked ? w * 0.22 : w * 0.28;
  if (Math.abs(rightX - leftX) < s * 2.3 + 8) s = Math.max(2, (Math.abs(rightX - leftX) - 8) / 2.3);
  const faceY = feet - 1.59 * s;
  const actorTop = faceY - s * 2.28;
  paintLobbyFrame(g, w, top, bottom, desk);
  const blue = addActor(scene, card, leftX, faceY, s, "blue", "blue");
  addActor(scene, card, rightX, faceY, s, "gold", "gold");
  const castSpan = Math.abs(rightX - leftX);
  const chipW = Math.min(140, Math.max(32, castSpan - (tight ? 10 : 16)));
  const chipY = chipTop + chipH / 2;
  [
    ["blue", leftX, lang ? "さがす" : "找"],
    ["gold", rightX, lang ? "書く" : "写"],
  ].forEach(([id, x, text]) => {
    addNameChip(scene, card, x, chipY, text, { id, ink: ROLE_INK[id], chipW, chipH });
  });
  addZone(scene, card, 0, desk, w - 20, 8, "desk");
  if (step === 1 && scene.__ragAnimate) {
    trackTween(scene, { targets: blue, angle: 8, duration: 90, yoyo: true, repeat: 3, onComplete: () => blue.setAngle(0) });
  }
  let areaTop = top + 2;
  if (bannerH) {
    const carry = spec.carry ?? one.page;
    const bannerW = Math.min(w - 24, pc ? Math.max(320, w * 0.62) : 280);
    const sheet = makeSlip(scene, card, bannerW, bannerH, 0xfff1d2, [
      { text: `Page ${carry}  ?`, opts: { maxW: bannerW - 16, maxH: bannerH - 6, size: font, color: C.muted } },
    ]);
    sheet.setPosition(0, areaTop + bannerH / 2);
    markBox(sheet, "card", { id: "carry", w: bannerW, h: bannerH });
    areaTop += bannerH + 6;
  }
  const areaBottom = Math.min(actorTop - 4, faceY - s * 2.4 - 4);
  const areaH = Math.max(0, areaBottom - areaTop);
  const carryNote = tight && step >= 3 ? `Page ${spec.carry ?? one.page} ?\n` : "";
  const oneText = step === 1
    ? `${one.title || ""}\nPage ${one.page ?? ""}\n✗`
    : `${carryNote}${one.title || ""}\nPage ${one.page ?? ""}\n${one.score ?? ""}`;
  if (!stacked) {
    const count = 1 + many.length;
    const gap = 8;
    const colW = Math.max(48, (w - 24 - gap * (count - 1)) / count);
    const slipH = Math.min(areaH, pc ? Math.max(tight ? 28 : 72, Math.min(120, h * 0.18)) : (tight ? 28 : 72));
    const y = areaTop + slipH / 2;
    const start = -((count - 1) * (colW + gap)) / 2;
    const oneBox = makeSlip(scene, card, colW, slipH, 0xfffdf8, [
      { text: oneText, opts: { maxW: colW - 12, maxH: slipH - 8, size: font } },
    ]);
    oneBox.setPosition(start, y);
    markBox(oneBox, "card", { id: "one", w: colW, h: slipH });
    many.forEach((item, index) => {
      const picked = step >= 2 && item.page === spec.pick;
      const x = start + (index + 1) * (colW + gap);
      const slip = makeSlip(scene, card, colW, slipH, picked ? 0xffe08a : 0xfffdf8, [
        { text: `${item.title || ""}  ${item.score}`, opts: { maxW: colW - 12, maxH: slipH - 8, size: font } },
      ]);
      placeFly(scene, slip, x, y, x, y + 8);
      markBox(slip, "card", { id: `many-${item.page}`, w: colW, h: slipH });
      if (picked) popIn(scene, slip);
    });
    return;
  }
  const colW = Math.min(w * 0.42, (w - 28) / 2);
  const oneH = Math.min(areaH, Math.max(rowH, areaH * 0.9));
  const oneBox = makeSlip(scene, card, colW, oneH, 0xfffdf8, [
    { text: oneText, opts: { maxW: colW - 12, maxH: oneH - 8, size: font } },
  ]);
  oneBox.setPosition(leftX, areaTop + oneH / 2);
  markBox(oneBox, "card", { id: "one", w: colW, h: oneH });
  const share = (areaH - 4 * Math.max(0, rows - 1)) / rows;
  const slipH = Math.min(rowH + 6, Math.max(8, share));
  many.forEach((item, index) => {
    const picked = step >= 2 && item.page === spec.pick;
    const y = areaTop + slipH / 2 + index * (slipH + 4);
    const slip = makeSlip(scene, card, colW, slipH, picked ? 0xffe08a : 0xfffdf8, [
      { text: `${item.title || ""}  ${item.score}`, opts: { maxW: colW - 12, maxH: slipH - 6, size: font } },
    ]);
    placeFly(scene, slip, rightX, y, rightX, y + 6);
    markBox(slip, "card", { id: `many-${item.page}`, w: colW, h: slipH });
    if (picked) popIn(scene, slip);
  });
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
  const pc = isWidePcTutor();
  const bw = pc ? Math.max(28, (w - 48) / n - 8) : Math.min(28, (w - 40) / n - 4);
  const tileH = pc ? Math.min(h * 0.12, 52) : Math.min(36, h * 0.1);
  const rowY = pc ? [-h * 0.3, h * 0.3] : [-h * 0.34, h * 0.32];
  [colors, other].forEach((row, rowIndex) => {
    const fromY = rowIndex === 0 ? -h * 0.36 : h * 0.32;
    row.forEach((color, index) => {
      const x = -((n - 1) * (bw + 4)) / 2 + index * (bw + 4);
      const yRow = rowY[rowIndex];
      const box = scene.add.rectangle(x, yRow, bw, tileH, color);
      markBox(box, "swatch", { id: `${rowIndex}-${index}`, w: bw, h: tileH });
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

function paintSignBadge(scene, card, x, y, bw, bh) {
  const box = scene.add.container(x, y);
  const badge = scene.add.graphics();
  badge.fillStyle(C.coral, 1);
  badge.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
  badge.lineStyle(3, C.stroke, 1);
  badge.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
  box.add(badge);
  fitLabel(scene, box, 0, 0, getLang() === "ja" ? "ホテル・ホシ" : "星星酒店", {
    maxW: bw - 10,
    maxH: bh - 6,
    size: Math.max(stageMinFont(), 15),
    color: "#fffdf8",
  });
  markBox(box, "sign", { id: "hotel", w: bw, h: bh });
  card.add(box);
  return box;
}

function lobbyBands(h, { band = 0.24, bandMin = 22, bandMax = 96 } = {}) {
  const margin = 6;
  const top = -h / 2 + margin;
  const bottom = h / 2 - margin;
  const inner = Math.max(24, bottom - top);
  let bandH = Math.min(bandMax, Math.max(bandMin, inner * band));
  let labelH = Math.min(36, Math.max(30, inner * 0.16));
  let lobby = inner - bandH - labelH;
  const minLobby = Math.max(26, inner * 0.28);
  if (lobby < minLobby) {
    const deficit = minLobby - lobby;
    const bandGive = Math.min(deficit, Math.max(0, bandH - 18));
    bandH -= bandGive;
    const labelGive = Math.min(Math.max(0, deficit - bandGive), Math.max(0, labelH - 24));
    labelH -= labelGive;
    lobby = inner - bandH - labelH;
  }
  const bandTop = top;
  return {
    top,
    bottom,
    bandTop,
    bandH,
    desk: bottom - labelH,
    labelH,
    lobbyTop: bandTop + bandH + 10,
    lobbyBottom: bottom - labelH - 4,
  };
}

function fitActorScale(lobbyTop, lobbyBottom, widthCap) {
  const room = Math.max(4, lobbyBottom - lobbyTop);
  let s = Math.min(24, widthCap, room / 4.25);
  if (!(s > 1)) s = 2;
  let faceY = lobbyTop + s * 2.35;
  if (faceY + s * 1.7 > lobbyBottom) {
    s = Math.max(2, room / 4.25);
    faceY = lobbyTop + s * 2.35;
  }
  return { s, faceY };
}

function paintHats(scene, card, g, w, h, spec, step) {
  if (!spec.question) {
    paintHatCompare(scene, card, g, w, h, spec, step);
    return;
  }
  const lang = getLang() === "ja";
  const frame = castFrame(w, h);
  paintLobbyFrame(g, w, frame.top, frame.bottom, frame.desk);
  const signW = Math.min(150, Math.max(92, w * 0.14));
  const signH = Math.min(Math.max(22, frame.cardH - 8), frame.pc ? 46 : 30);
  const showSign = w >= signW + 260 && frame.cardH >= signH + 6;
  const signX = w / 2 - frame.margin - signW / 2;
  const signY = (frame.cardTop + frame.cardBottom) / 2;
  if (showSign) paintSignBadge(scene, card, signX, signY, signW, signH);
  const castRight = w / 2 - frame.margin;
  const castLeft = -w / 2 + frame.margin;
  const span = Math.max(36, castRight - castLeft);
  const xs = [castLeft + span * 0.18, castLeft + span * 0.5, castLeft + span * 0.82];
  let s = Math.max(2, frame.visual / 3.87);
  const spacing = Math.min(xs[1] - xs[0], xs[2] - xs[1]);
  if (spacing < s * 2.2 + 8) s = Math.max(2, (spacing - 8) / 2.2);
  addActor(scene, card, xs[0], frame.feet - 1.59 * s * 0.92, s * 0.92, "", "guest");
  addActor(scene, card, xs[1], frame.feet - 1.59 * s, s, "blue", "blue");
  addActor(scene, card, xs[2], frame.feet - 1.59 * s, s, "gold", "gold");
  const chipW = Math.max(64, Math.min(148, spacing - 12));
  const chipY = frame.chipTop + frame.chipH / 2;
  [
    [xs[0], "guest", lang ? "お客さん" : "客人"],
    [xs[1], "blue", lang ? "さがす" : "找"],
    [xs[2], "gold", lang ? "書く" : "写"],
  ].forEach(([x, id, text]) => {
    addNameChip(scene, card, x, chipY, text, { id, ink: ROLE_INK[id], chipW, chipH: frame.chipH });
  });
  addZone(scene, card, 0, frame.desk, w - 20, 8, "desk");
  const slotRight = showSign ? signX - signW / 2 - 12 : castRight;
  const slotW = Math.max(48, slotRight - castLeft);
  const slotH = Math.max(28, frame.cardBottom - frame.cardTop);
  const slotY = (frame.cardTop + frame.cardBottom) / 2;
  const writing = step >= 4;
  const copy = writing
    ? `Page ${spec.page || 4}\n${spec.line || ""}`
    : step <= 1
      ? (spec.question || "")
      : `Page ${spec.page || 4}`;
  const slipW = step >= 2 && !writing ? Math.min(slotW, Math.max(frame.pc ? 220 : 140, slotW * 0.58)) : slotW;
  const holder = step === 2 ? xs[1] : xs[2];
  const slipX = step >= 2 && !writing
    ? Math.max(castLeft + slipW / 2, Math.min(holder, slotRight - slipW / 2))
    : castLeft + slotW / 2;
  const maxType = frame.pc ? Math.min(28, Math.max(20, Math.round(slotH * 0.28))) : Math.max(cardFont(), 15);
  const font = chooseFont(scene, copy, slipW - 24, slotH - 18, { max: maxType, min: stageMinFont() });
  const slip = makeSlip(scene, card, slipW, slotH, 0xfffdf8, [
    {
      text: copy,
      opts: {
        maxW: slipW - 24,
        maxH: slotH - 18,
        size: font,
        min: font,
        color: C.text,
        bg: CHIP_BG,
      },
    },
  ]);
  if (step >= 2 && !writing) placeFly(scene, slip, slipX, slotY, xs[1], slotY);
  else slip.setPosition(slipX, slotY);
  markBox(slip, writing || step > 1 ? "card" : "bubble", {
    id: writing ? "answer" : step <= 1 ? "ask" : "page",
    w: slipW,
    h: slotH,
  });
  if (writing) popIn(scene, slip);
}

function parkReject(sheet, rejectW, rejectH, bounds) {
  const gap = 12;
  const right = bounds.right;
  const candidates = [
    { x: sheet.right + gap + rejectW / 2, y: sheet.bottom - rejectH / 2 },
    { x: sheet.right - rejectW / 2, y: sheet.bottom + gap + rejectH / 2 },
    { x: sheet.right - rejectW / 2, y: sheet.top - gap - rejectH / 2 },
  ];
  for (const spot of candidates) {
    const left = spot.x - rejectW / 2;
    const top = spot.y - rejectH / 2;
    const clearRight = spot.x + rejectW / 2 <= right;
    const clearDesk = spot.y + rejectH / 2 <= bounds.desk - 12;
    const clearTop = top >= bounds.top + 4;
    const clearActor = left >= bounds.actorRight + 8;
    const hitsSheet = left < sheet.right - 1 && spot.x + rejectW / 2 > sheet.left + 1 && top < sheet.bottom - 1 && spot.y + rejectH / 2 > sheet.top + 1;
    if (clearRight && clearDesk && clearTop && clearActor && !hitsSheet) return spot;
  }
  return {
    x: right - rejectW / 2,
    y: bounds.desk - 12 - rejectH / 2,
  };
}

function paintCite(scene, card, g, w, h, spec, step) {
  const mode = citeMode(spec);
  const lang = getLang() === "ja";
  const frame = castFrame(w, h);
  paintLobbyFrame(g, w, frame.top, frame.bottom, frame.desk);
  let s = Math.max(2, frame.visual / 3.87);
  const ratio = mode === "sheet" ? 0.55 : mode === "idk" ? 0.58 : 0.42;
  let sheetW = w * ratio;
  const actorNeed = s * 2.6 + 20;
  if (frame.margin + actorNeed + sheetW + frame.margin > w) {
    s = Math.max(2, Math.min(s, (w * 0.3) / 2.6));
    sheetW = Math.min(sheetW, w - frame.margin * 2 - s * 2.6 - 20);
  }
  const actorX = -w / 2 + frame.margin + s * 1.2;
  const faceY = frame.feet - 1.59 * s;
  const writer = addActor(scene, card, actorX, faceY, s, "gold", "gold");
  const chipW = Math.max(frame.pc ? 72 : 56, Math.min(140, Math.max(s * 3.2, frame.chipH * 2.4)));
  addNameChip(scene, card, actorX, frame.chipTop + frame.chipH / 2, lang ? "書く" : "写", {
    id: "gold",
    ink: ROLE_INK.gold,
    chipW,
    chipH: frame.chipH,
  });
  addZone(scene, card, 0, frame.desk, w - 20, 8, "desk");
  const sheetLeft = Math.max(actorX + s * 1.45 + 16, actorX + chipW / 2 + 12);
  const sheetRightMax = w / 2 - frame.margin;
  sheetW = Math.max(72, Math.min(sheetW, sheetRightMax - sheetLeft));
  const lobbyTop = frame.top + 4;
  const lobbyBottom = frame.chipTop - 8;
  const lobbyH = Math.max(24, lobbyBottom - lobbyTop);
  let sheetH = Math.min(lobbyH * (mode === "mark" ? 0.62 : 0.78), h * (mode === "sheet" ? 0.58 : 0.62));
  sheetH = Math.max(Math.min(lobbyH, h * 0.36), sheetH);
  let sheetTop = lobbyTop + (lobbyH - sheetH) / 2;
  let sheetBottom = sheetTop + sheetH;
  if (sheetBottom > lobbyBottom) {
    sheetBottom = lobbyBottom;
    sheetTop = sheetBottom - sheetH;
  }
  const paper = scene.add.container(sheetLeft + sheetW / 2, sheetTop + sheetH / 2);
  markBox(paper, "card", { id: "sheet", w: sheetW, h: sheetH });
  const pg = scene.add.graphics();
  pg.fillStyle(0xfffdf8, 1);
  pg.fillRoundedRect(-sheetW / 2, -sheetH / 2, sheetW, sheetH, 16);
  pg.lineStyle(5, mode === "idk" && step >= 1 ? C.coral : C.gold, 1);
  pg.strokeRoundedRect(-sheetW / 2, -sheetH / 2, sheetW, sheetH, 16);
  paper.add(pg);
  card.add(paper);
  let body = spec.line || "";
  if (mode === "sheet" && step === 0) body = lang ? "＿ページ（＿）に よると：＿＿＿＿" : "根据第 ＿ 页（＿）：＿＿＿＿";
  const head = spec.page && mode !== "idk" ? `Page ${spec.page}` : "";
  const copy = head ? `${head}\n${body}` : body;
  const maxType = frame.pc ? Math.min(26, Math.max(20, Math.round(sheetH * 0.16))) : Math.max(cardFont(), 15);
  const ink = mode === "idk" && step >= 1 ? "#9e2430" : C.text;
  const font = chooseFont(scene, copy, sheetW - 28, sheetH - 24, { max: maxType, min: stageMinFont() });
  fitLabel(scene, paper, 0, 0, copy, {
    maxW: sheetW - 28,
    maxH: sheetH - 24,
    size: font,
    min: font,
    color: ink,
    bg: CHIP_BG,
  });
  if (mode === "idk" && step >= 1 && scene.__ragAnimate) {
    trackTween(scene, { targets: writer, angle: 7, duration: 90, yoyo: true, repeat: 3, onComplete: () => writer.setAngle(0) });
  }
  if (mode === "sheet" && step >= 2) {
    const rejectW = Math.min(132, Math.max(frame.pc ? 96 : 78, w * 0.12));
    const rejectH = Math.max(frame.pc ? 40 : 30, stageMinFont() + 16);
    const rejectFont = chooseFont(scene, "Page 5", rejectW - 16, rejectH - 10, { max: frame.pc ? 18 : 14, min: stageMinFont() });
    const reject = makeSlip(scene, card, rejectW, rejectH, 0xffe1e4, [
      {
        text: "Page 5",
        opts: {
          maxW: rejectW - 16,
          maxH: rejectH - 10,
          size: rejectFont,
          min: rejectFont,
          color: "#9e2430",
          bg: "#ffe1e4",
        },
      },
    ]);
    const spot = parkReject(
      { left: sheetLeft, right: sheetLeft + sheetW, top: sheetTop, bottom: sheetBottom },
      rejectW,
      rejectH,
      { right: w / 2 - frame.margin, desk: frame.desk, top: frame.top, actorRight: actorX + s * 1.2 },
    );
    bounceBack(scene, reject, spot.x, spot.y, paper.x, paper.y);
    markBox(reject, "card", { id: "reject", w: rejectW, h: rejectH });
    if (scene.__ragAnimate) {
      trackTween(scene, { targets: paper, angle: 3, duration: 80, yoyo: true, repeat: 3, onComplete: () => paper.setAngle(0) });
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
    addZone(scene, card, x, y, bw, bh, "prop", { id: `step-${index}` });
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
    addZone(scene, card, x, 0, boxW, boxH, "prop", { id: index ? "right" : "left" });
    fitLabel(scene, card, x, -boxH * 0.3, item?.title || "", { maxW: boxW - 20, maxH: boxH * 0.2, size: 26 });
    fitLabel(scene, card, x, boxH * 0.02, item?.body || "", { maxW: boxW - 20, maxH: boxH * 0.24, size: 20, color: C.muted });
    if (step >= 1) {
      fitLabel(scene, card, x, boxH * 0.36, "✓", { maxW: 40, maxH: 28, size: 26, color: "#168f82" });
    }
  });
}

function paintChips(scene, card, g, w, h, spec, step) {
  const chips = spec.chips || [];
  const n = Math.max(1, chips.length);
  const pc = isWidePcTutor();
  const gap = pc ? 16 : 12;
  const side = pc ? 28 : 24;
  const bw = pc
    ? (w - side - gap * (n - 1)) / n
    : Math.min(140, (w - side - gap * (n - 1)) / n);
  const split = pc && step >= 1 && chips.some((chip) => chip.on === false);
  const bh = pc ? h * (split ? 0.4 : 0.64) : Math.min(h * 0.55, 120);
  chips.forEach((chip, index) => {
    const gone = step >= 1 && chip.on === false;
    const x = -((n - 1) * (bw + gap)) / 2 + index * (bw + gap);
    const y = split ? (gone ? -h * 0.18 : h * 0.14) : (gone ? -h * 0.22 : 0);
    const box = scene.add.container(x, 0);
    box.setData("width", bw);
    box.setData("height", bh);
    const bg = scene.add.graphics();
    const fill = chip.on ? 0xfff1c9 : 0xfffdf8;
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
    bg.lineStyle(3, C.stroke, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
    box.add(bg);
    markBox(box, "prop", { id: `chip-${index}`, w: bw, h: bh });
    const font = pc ? Math.min(32, Math.max(18, bh * 0.34)) : 20;
    fitLabel(scene, box, 0, 0, chip.text || "", {
      maxW: bw - 16,
      maxH: bh - 16,
      size: font,
      min: stageMinFont(),
      color: "#3b2a2e",
      bg: chip.on ? "#fff1c9" : CHIP_BG,
    });
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
  addZone(scene, card, 0, 0, bw, bh, "prop", { id: "board" });
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
  const font = cardFont();
  const showSub = step < 1 && Boolean(spec.sub);
  const subH = showSub ? font + 8 : 0;
  const pc = isWidePcTutor();
  const bw = Math.min(w * (pc ? 0.72 : 0.7), pc ? w * 0.72 : 460);
  const wantVisual = h * (pc ? 0.32 : 0.26);
  const signTop = -h / 2 + 6;
  const floorPreview = h / 2 - 6 - subH;
  const actorNeed = (wantVisual / 2.67) * 4.2 + 10;
  const bhCap = Math.max(18, floorPreview - signTop - actorNeed);
  const bh = Math.min(pc ? 64 : 48, bhCap, Math.max(font + 6, Math.min(h * (pc ? 0.18 : 0.16), h * 0.28)));
  const sign = scene.add.container(0, signTop + bh / 2);
  const sg = scene.add.graphics();
  sg.fillStyle(C.coral, 1);
  sg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
  sg.lineStyle(4, C.stroke, 1);
  sg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
  sign.add(sg);
  fitLabel(scene, sign, 0, 0, spec.title || "", {
    maxW: bw - 16,
    maxH: bh - 8,
    size: Math.max(stageMinFont(), Math.min(18, bh - 8)),
    color: "#fffdf8",
  });
  markBox(sign, "sign", { id: "door", w: bw, h: bh });
  card.add(sign);
  const floor = h / 2 - 6 - subH;
  const signBottom = signTop + bh;
  const room = Math.max(8, floor - signBottom - 6);
  let s = Math.min((pc ? h * 0.32 : Math.min(h * 0.26, 86)) / 2.67, w * (pc ? 0.14 : 0.08), room / 4.2);
  if (!(s > 1)) s = 2;
  let faceY = signBottom + s * 2.4 + 4;
  const faceLimit = floor - 4 - s * 1.7;
  if (faceY > faceLimit) faceY = faceLimit;
  if (faceY - s * 1.08 < signBottom + 4) {
    s = Math.max(2, (floor - 8 - signBottom) / 4.2);
    faceY = Math.min(signBottom + s * 2.4 + 4, floor - 4 - s * 1.7);
  }
  addActor(scene, card, 0, faceY, s, "", "guest");
  if (step >= 1) {
    const slipW = Math.min(72, Math.max(36, w * 0.16));
    const slipH = Math.min(32, Math.max(font + 4, s));
    const faceHalf = s * 1.2;
    [-1, 1].forEach((side, index) => {
      const slip = makeSlip(scene, card, slipW, slipH, index ? C.gold : C.blue, []);
      const minX = faceHalf + slipW / 2 + 8;
      const maxX = w / 2 - 8 - slipW / 2;
      const x = side * Math.max(8, Math.min(maxX, Math.max(minX, w * 0.32)));
      let y = Math.min(floor - slipH / 2 - 4, Math.max(faceY, signBottom + slipH / 2 + 8));
      if (minX > maxX) y = Math.min(floor - slipH / 2 - 4, faceY + s * 1.2);
      placeFly(scene, slip, x, y, x, sign.y);
      markBox(slip, "card", { id: `fly-${index}`, w: slipW, h: slipH });
    });
  } else if (showSub) {
    const node = fitLabel(scene, card, 0, h / 2 - 8 - subH / 2, spec.sub, {
      maxW: w - 24,
      maxH: subH,
      size: font,
      color: C.muted,
    });
    markBox(node, "label", { id: "sub", w: node.width, h: node.height });
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
  addZone(scene, card, 0, 0, bw, bh, "prop", { id: "book" });
  fitLabel(scene, card, bw * 0.22, -bh * 0.34, `Page ${spec.page || ""}`, { maxW: bw * 0.4, maxH: 28, size: 24, color: C.goldCss });
  fitLabel(scene, card, bw * 0.22, bh * 0.1, spec.line || spec.badge || "", { maxW: bw * 0.44, maxH: bh * 0.4, size: 16, color: C.text });
}

function paintSwap(scene, card, g, w, h, spec, step) {
  const bw = w - 28;
  const bh = h - 24;
  g.fillStyle(step >= 1 ? 0xd9fbe8 : 0xffe1e4, 1);
  g.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
  g.lineStyle(4, C.stroke, 1);
  g.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
  addZone(scene, card, 0, 0, bw, bh, "prop", { id: "swap" });
  fitLabel(scene, card, 0, 0, step >= 1 ? spec.newLine || "" : spec.oldLine || "", {
    maxW: bw - 28,
    maxH: bh - 24,
    size: 22,
  });
}

function paintMemory(scene, card, g, w, h, spec) {
  const pc = isWidePcTutor();
  if (pc) {
    const pw = w * 0.78;
    const ph = h * 0.76;
    g.fillStyle(0xfffdf8, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 24);
    g.lineStyle(4, C.stroke, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 24);
    addZone(scene, card, 0, 0, pw, ph, "prop", { id: "memory" });
  }
  const s = pc
    ? Math.min(h * 0.2, w * 0.12)
    : Math.max(18, Math.min(h * 0.2, w * 0.14, (h * 0.5 - 28) / 1.5));
  g.fillStyle(0xfffdf8, 0.96);
  g.fillCircle(0, 0, Math.min(s * 2.1, h * 0.42));
  g.lineStyle(4, C.stroke, 1);
  g.strokeCircle(0, 0, Math.min(s * 2.1, h * 0.42));
  paintActor(g, 0, s * 0.1, s);
  fitLabel(scene, card, 0, Math.max(-h / 2 + 16, -s * 1.35), spec.line || "", {
    maxW: w * 0.7,
    maxH: 28,
    size: 22,
    color: C.goldCss,
  });
}

function paintAddress(scene, card, g, w, h, spec) {
  const n = 12;
  const gap = 8;
  const pc = isWidePcTutor();
  const raw = (w - 36 - gap * (n - 1)) / n;
  const bw = pc ? raw : Math.min(48, raw);
  const bh = pc ? Math.min(h * 0.38, 180) : Math.min(h * 0.28, 72);
  const rowY = pc ? -h * 0.08 : 0;
  for (let i = 0; i < n; i += 1) {
    const x = -((n - 1) * (bw + gap)) / 2 + i * (bw + gap);
    g.fillStyle([C.coral, C.gold, C.teal, C.blue, C.violet][i % 5], 1);
    g.fillRoundedRect(x - bw / 2, rowY - bh / 2, bw, bh, 8);
    g.lineStyle(2, C.stroke, 1);
    g.strokeRoundedRect(x - bw / 2, rowY - bh / 2, bw, bh, 8);
    addZone(scene, card, x, rowY, bw, bh, "prop", { id: `addr-${i}` });
  }
  fitLabel(scene, card, 0, h * 0.24, String(spec.n || ""), { maxW: w - 24, maxH: h * 0.28, size: Math.min(pc ? h * 0.18 : 64, h * 0.2), color: C.goldCss });
}

function paintBig(scene, card, g, w, h, spec) {
  paintLongPaper(scene, card, w, h * 0.72, { scissors: false, label: false });
  fitLabel(scene, card, 0, Math.min(h * 0.3, h / 2 - 22), String(spec.words || ""), {
    maxW: w - 24,
    maxH: Math.min(48, h * 0.24),
    size: 42,
    color: C.goldCss,
  });
}

function paintCounts(scene, card, g, w, h, spec) {
  if (isWidePcTutor()) {
    const pw = w * 0.72;
    const ph = h * 0.7;
    g.fillStyle(0xfffdf8, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 22);
    g.lineStyle(4, C.stroke, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 22);
    addZone(scene, card, 0, 0, pw, ph, "prop", { id: "counts" });
  }
  fitLabel(scene, card, 0, -h * 0.06, `${spec.min}–${spec.max}`, {
    maxW: w - 24,
    maxH: Math.min(64, h * 0.28),
    size: 48,
    color: C.goldCss,
  });
  fitLabel(scene, card, 0, h * 0.2, String(spec.focus || ""), {
    maxW: w - 24,
    maxH: Math.min(32, h * 0.18),
    size: 22,
    color: C.muted,
  });
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
  const pc = isWidePcTutor();
  if (!lines.length) {
    const slot = (w - 24) / 3;
    const star = pc ? Math.min(h * 0.62, slot * 0.86) : Math.min(48, h * 0.3);
    const nodes = [0, 1, 2].map((index) => {
      const on = step >= 1 && index === 0;
      return fitLabel(scene, card, 0, 0, on ? "⭐" : "☆", {
        maxW: slot - 10,
        maxH: h * 0.78,
        size: star,
        color: on ? "#7a4e00" : "#3b2a2e",
        bg: "#fffdf6",
      });
    });
    nodes.forEach((node, index) => node.setX(-w / 2 + slot / 2 + 12 + index * slot));
    return;
  }
  if (pc) {
    const pad = 14;
    const gap = 12;
    const innerH = h - pad * 2;
    const bw = w - pad * 2;
    const rowH = (innerH - gap * (lines.length - 1)) / lines.length;
    lines.forEach((line, index) => {
      const y = -innerH / 2 + rowH / 2 + index * (rowH + gap);
      const lit = index <= step;
      g.fillStyle(lit ? 0xfff1c9 : 0xfffdf8, 1);
      g.fillRoundedRect(-bw / 2, y - rowH / 2, bw, rowH, 16);
      g.lineStyle(3, C.stroke, 1);
      g.strokeRoundedRect(-bw / 2, y - rowH / 2, bw, rowH, 16);
      addZone(scene, card, 0, y, bw, rowH, "prop", { id: `rule-${index}` });
      const maxW = bw - 28;
      const maxH = rowH - 14;
      let font = Math.min(34, Math.max(18, rowH * 0.42));
      while (font > stageMinFont() && textWidth(scene, line, font) > maxW) font -= 1;
      fitLabel(scene, card, 0, y, line, {
        maxW,
        maxH,
        size: font,
        min: stageMinFont(),
        color: "#3b2a2e",
        bg: lit ? "#fff1c9" : CHIP_BG,
      });
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
  addZone(scene, card, 0, -h * 0.42 + h * 0.16, bw, h * 0.32, "prop", { id: "question" });
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
    addZone(scene, card, x, h * 0.02 + boxH / 2, boxW, boxH, "prop", { id: `join-${item.page}` });
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
  else if (kind === "counts") paintCounts(scene, card, g, w, h, spec);
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
    scene.__ragZoom = null;
  }
  scene.__ragStage = stage;
  scene.__ragBeat = page;
  scene.__ragTweenLeft = 0;
  const step = Math.max(0, Math.min(lastStep(spec), scene.__ragStep || 0));
  scene.__ragStep = step;
  const phone = !isWidePcTutor();
  const ceiling = ceilingOf(scene, stage);
  const capSize = phone ? 16 : 20;
  const capSlot = phone ? 22 : 34;
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
    scene.__ragZoom = null;
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
  window.__nanoGPTRagSteps = lastStep(spec);
  window.__nanoGPTRagSettled = !(scene.__ragTweenLeft > 0);
  window.__nanoGPTRagTap = () => {
    window.__nanoGPTRagSettled = false;
    card.emit("pointerdown");
  };
}
