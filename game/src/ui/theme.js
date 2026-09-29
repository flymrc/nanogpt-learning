import { displayRatio } from "./dpr.js";
import { getCourse, getLang } from "../i18n/locale.js";

/** Landscape design reference only — scenes should use getView(). */
export const W = 1280;
export const H = 720;

export const C = {
  skyTop: 0xf6efe4,
  skyBot: 0xead6c4,
  hill: 0x86de7a,
  hillDark: 0x5fc46d,
  sun: 0xffe566,
  page: 0xf3ebe0,
  surface: 0xfffdf6,
  surface2: 0xfff1d2,
  stroke: 0x3b2a2e,
  text: "#3b2a2e",
  textDark: "#3b2a2e",
  muted: "#8b6b5c",
  teal: 0x3dcec0,
  tealCss: "#168f82",
  gold: 0xffc43d,
  goldCss: "#c48400",
  blue: 0x5eb3ff,
  blueCss: "#1f7ed0",
  violet: 0xc084fc,
  violetCss: "#8b4ed4",
  coral: 0xff7a85,
  coralCss: "#e24b57",
  pink: 0xff9ecb,
  peach: 0xffc2a8,
  cream: 0xfff8ee,
  white: 0xfffdf8,
  lime: 0xb8f2a0,
};

export const STICKERS = [0xff8b94, 0xffd166, 0x7ee8d8, 0x8ec5ff, 0xe5b3ff, 0xffb4d9, 0xffc9a3, 0xb8f2a0];

/** Symbol faces sit after the locale face so a kanji is never drawn from the other script. */
const FONT_SYMBOLS = '"Noto Sans Symbols 2", "Noto Emoji", sans-serif';

export const FONT_UI_ZH = `"Noto Sans SC", ${FONT_SYMBOLS}`;
export const FONT_UI_JA = `"Noto Sans JP", "Noto Sans SC", ${FONT_SYMBOLS}`;
export const FONT_DISPLAY_ZH = `"ZCOOL QingKe HuangYou", "Noto Sans SC", ${FONT_SYMBOLS}`;
export const FONT_DISPLAY_JA = `"Noto Sans JP", "Noto Sans SC", ${FONT_SYMBOLS}`;
export const FONT_MONO_ZH = `"Fredoka", "Noto Sans SC", ${FONT_SYMBOLS}`;

export const FONT_UI = FONT_UI_ZH;
export const FONT_DISPLAY = FONT_DISPLAY_ZH;
export const FONT_MONO = FONT_MONO_ZH;

function localeFamily(kind) {
  const ja = getLang() === "ja";
  if (kind === "display") return ja ? FONT_DISPLAY_JA : FONT_DISPLAY_ZH;
  if (kind === "mono") return ja ? FONT_UI_JA : FONT_MONO_ZH;
  return ja ? FONT_UI_JA : FONT_UI_ZH;
}

function textStyle(fontFamily, size, extra = {}) {
  const { resolution, fontFamily: familyOverride, ...rest } = extra;
  return {
    fontFamily: familyOverride || fontFamily,
    fontSize: `${Math.max(1, Math.round(size))}px`,
    color: C.text,
    ...rest,
    // Phaser Text rasterizes to an internal canvas; without this, retina
    // just magnifies a 1× bitmap (the “马赛克” look).
    resolution: resolution ?? displayRatio(),
  };
}

export function uiText(size, extra = {}) {
  return textStyle(localeFamily("ui"), size, { fontStyle: "500", ...extra });
}

export function displayText(size, extra = {}) {
  const ja = getLang() === "ja";
  return textStyle(localeFamily("display"), size, {
    ...(ja ? { fontStyle: "700" } : {}),
    ...extra,
  });
}

export function monoText(size, extra = {}) {
  return textStyle(localeFamily("mono"), size, extra);
}

export function stickerColor(seed) {
  const n = typeof seed === "number" ? seed : String(seed).charCodeAt(0) || 0;
  return STICKERS[Math.abs(n) % STICKERS.length];
}

/** No line may start with closing punctuation (禁则). */
const KINSOKU_HEAD = "。，、！？）」』】》〉";

/**
 * Times, thousands, ranges, and page marks stay on one line.
 * 6:30, 9:30, 1,000, 6:30–9:30, Page 4, 第 4 页, 4ページ.
 */
const GLUE_SOURCE = "第\\s*\\d+\\s*页|Page\\s+\\d+|\\d+\\s*ページ|\\d+(?:[:.\\u2013\\u2014\\u2212,/\\-]\\d+)+";

export function glueRegExp() {
  return new RegExp(GLUE_SOURCE, "g");
}

export function isGluedUnit(value) {
  return new RegExp(`^(?:${GLUE_SOURCE})$`).test(String(value ?? ""));
}

export function glueUnits(text) {
  const src = String(text ?? "");
  const units = [];
  if (!src) return units;
  let last = 0;
  for (const match of src.matchAll(glueRegExp())) {
    if (match.index > last) {
      for (const ch of src.slice(last, match.index)) units.push(ch);
    }
    units.push(match[0]);
    last = match.index + match[0].length;
  }
  if (last < src.length) {
    for (const ch of src.slice(last)) units.push(ch);
  }
  return units;
}

/**
 * Space-delimited phrases. A glued run stays inside its phrase, and a run
 * that itself contains spaces (Page 4, 第 4 页) is one phrase.
 */
export function glueWords(text) {
  const src = String(text ?? "");
  if (!src) return [];
  const saved = [];
  const masked = src.replace(glueRegExp(), (match) => {
    const token = `\uE000${saved.length}\uE001`;
    saved.push(match);
    return token;
  });
  return masked
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.replace(/\uE000(\d+)\uE001/g, (_, index) => saved[Number(index)] || ""));
}

function useGlue(flag) {
  if (flag === false) return false;
  if (flag === true) return true;
  return getCourse() === "rag";
}

/** A glued run in `source` must occupy one rendered line. */
export function gluedRunSplits(source, rendered) {
  const src = String(source || "");
  const lines = String(rendered || "").split("\n");
  const hits = [];
  const seen = new Set();
  for (const match of src.matchAll(glueRegExp())) {
    const compact = match[0].replace(/\s+/g, "");
    if (!compact || seen.has(compact)) continue;
    seen.add(compact);
    if (lines.some((line) => line.replace(/\s+/g, "").includes(compact))) continue;
    if (lines.join("").replace(/\s+/g, "").includes(compact)) hits.push(compact);
  }
  return hits;
}

/** Keep glued runs in one nowrap span when the course is RAG. */
export function setGluedText(el, text) {
  if (!el) return;
  const value = String(text ?? "");
  if (typeof document === "undefined" || getCourse() !== "rag") {
    el.textContent = value;
    return;
  }
  el.replaceChildren();
  value.split("\n").forEach((line, index) => {
    if (index) el.appendChild(document.createElement("br"));
    let last = 0;
    for (const match of line.matchAll(glueRegExp())) {
      if (match.index > last) el.appendChild(document.createTextNode(line.slice(last, match.index)));
      const span = document.createElement("span");
      span.className = "rag-glue";
      span.textContent = match[0];
      el.appendChild(span);
      last = match.index + match[0].length;
    }
    if (last < line.length || line === "") el.appendChild(document.createTextNode(line.slice(last)));
  });
}

function applyKinsoku(lines, widthOf, maxWidth, glue = false) {
  const out = [];
  for (const line of lines) {
    let rest = line;
    while (out.length && out[out.length - 1] !== "" && rest && KINSOKU_HEAD.includes(rest[0])) {
      const prev = out[out.length - 1];
      const joined = prev + rest[0];
      if (!widthOf || widthOf(joined) <= maxWidth) {
        out[out.length - 1] = joined;
        rest = rest.slice(1);
        continue;
      }
      if (glue) {
        const units = glueUnits(prev);
        const last = units[units.length - 1];
        if (last && isGluedUnit(last) && prev.endsWith(last)) {
          const head = prev.slice(0, -last.length).replace(/\s+$/u, "");
          if (head) {
            out[out.length - 1] = head;
            rest = `${last}${rest}`;
          }
          break;
        }
      }
      const chars = [...prev];
      let take = 1;
      while (take < chars.length && KINSOKU_HEAD.includes(chars[chars.length - take])) take += 1;
      if (take >= chars.length) break;
      out[out.length - 1] = chars.slice(0, chars.length - take).join("");
      rest = chars.slice(chars.length - take).join("") + rest;
      break;
    }
    if (rest || line === "") out.push(rest);
  }
  return out;
}

/** Phaser wordWrap ignores CJK (no spaces). Split on glyphs to a pixel width. */
export function wrapToWidth(scene, raw, size, maxWidth, styleFn = uiText, options = {}) {
  const glue = useGlue(options.glue);
  const probe = scene.add.text(-4000, -4000, "", styleFn(size)).setVisible(false);
  const widthOf = (value) => {
    probe.setText(value);
    return probe.width;
  };
  const lines = [];
  const paras = String(raw || "").split("\n");
  paras.forEach((para, index) => {
    let current = "";
    const units = glue ? glueUnits(para) : [...para];
    for (const unit of units) {
      if (current && widthOf(current + unit) > maxWidth) {
        lines.push(current);
        current = unit;
      } else {
        current += unit;
      }
    }
    lines.push(current);
    if (index < paras.length - 1) lines.push("");
  });
  const wrapped = applyKinsoku(lines, widthOf, maxWidth, glue).join("\n");
  probe.destroy();
  return wrapped;
}

/** Punctuation does not count toward the visible length of a wrapped line. */
function visibleCount(line) {
  let count = 0;
  for (const ch of String(line ?? "")) {
    if (/\s/u.test(ch) || /\p{P}/u.test(ch)) continue;
    count += 1;
  }
  return count;
}

/**
 * Lines left over after a wrap. A one-character string is not an orphan.
 * Any raw one-character line is. The last line is also an orphan when it
 * has ≤2 visible characters (punctuation counts toward nothing), such as 「字。」.
 */
export function orphanLines(body) {
  const lines = String(body ?? "").split("\n");
  if (lines.length < 2) return [];
  const hits = [];
  lines.forEach((line, index) => {
    const compact = [...line.replace(/\s+/g, "")];
    if (compact.length === 1 || (index === lines.length - 1 && visibleCount(line) <= 2)) hits.push(line);
  });
  return hits;
}

/**
 * Fix a short last line without cutting a space-delimited phrase.
 * Half-width spaces are bunsetsu breaks. A phrase is split only when that
 * phrase alone is wider than the line (`wide` marks those fragments).
 * Otherwise move a whole phrase, or leave the orphan so the caller shrinks the font.
 */
function rebalancePhrases(lines, wideFlags, widthOf, maxWidth, glue = false) {
  const out = lines.slice();
  const wide = wideFlags.slice();
  let guard = 0;
  while (out.length >= 2 && guard < 40) {
    guard += 1;
    const lastIdx = out.length - 1;
    const last = out[lastIdx];
    if (!last) break;
    const compact = [...String(last).replace(/\s+/g, "")];
    if (visibleCount(last) > 2 && compact.length !== 1) break;
    const prev = String(out[lastIdx - 1] ?? "").replace(/\s+$/u, "");
    const parts = glue ? glueWords(prev) : prev.split(/\s+/).filter(Boolean);
    if (!parts.length) break;
    if (parts.length >= 2) {
      const moved = parts.pop();
      const nextPrev = parts.join(" ");
      const nextLast = `${moved} ${String(last).replace(/^\s+/u, "")}`;
      if (widthOf && widthOf(nextLast) > maxWidth) break;
      out[lastIdx - 1] = nextPrev;
      out[lastIdx] = nextLast;
      wide[lastIdx] = false;
      continue;
    }
    if (!wide[lastIdx - 1]) break;
    const prevUnits = glue ? glueUnits(prev) : [...prev];
    while (prevUnits.length && /^\s+$/u.test(prevUnits[prevUnits.length - 1])) prevUnits.pop();
    if (prevUnits.length <= 1) break;
    const moved = prevUnits.pop();
    while (prevUnits.length && /^\s+$/u.test(prevUnits[prevUnits.length - 1])) prevUnits.pop();
    const nextPrev = prevUnits.join("");
    const nextLast = `${moved}${String(last).replace(/^\s+/u, "")}`;
    if (widthOf && widthOf(nextLast) > maxWidth) break;
    if (!nextPrev) {
      out.splice(lastIdx - 1, 1);
      wide.splice(lastIdx - 1, 1);
      out[out.length - 1] = nextLast;
      wide[out.length - 1] = true;
      continue;
    }
    out[lastIdx - 1] = nextPrev;
    out[lastIdx] = nextLast;
    wide[lastIdx - 1] = true;
    wide[lastIdx] = true;
  }
  return { lines: out, wide };
}

/**
 * Wrap at half-width spaces first (bunsetsu), then glyphs inside a phrase
 * only when that phrase is wider than the line.
 * Callers shrink the font while `orphanLines` is non-empty.
 */
function latinWord(token) {
  return /^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(token);
}

export function wrapAtBreaks(scene, raw, size, maxWidth, styleFn = uiText, { latinWhole = false, glue } = {}) {
  const useGlueFlag = useGlue(glue);
  const probe = scene.add.text(-8000, -8000, "", styleFn(size)).setVisible(false);
  const widthOf = (value) => {
    probe.setText(value);
    return probe.width;
  };
  const breakToken = (token) => {
    if ((latinWhole && latinWord(token)) || (useGlueFlag && isGluedUnit(token))) return [token];
    const units = useGlueFlag ? glueUnits(token) : [...token];
    const out = [];
    let current = "";
    for (const unit of units) {
      if (current && widthOf(current + unit) > maxWidth) {
        out.push(current);
        current = unit;
      } else {
        current += unit;
      }
    }
    if (current) out.push(current);
    return out.length ? out : [""];
  };
  const lines = [];
  const wide = [];
  const pushLine = (text, overWide) => {
    lines.push(text);
    wide.push(Boolean(overWide));
  };
  for (const para of String(raw ?? "").split("\n")) {
    const words = useGlueFlag ? glueWords(para) : para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      pushLine("", false);
      continue;
    }
    let current = "";
    let currentWide = false;
    for (const word of words) {
      const over = widthOf(word) > maxWidth;
      const chunks = over ? breakToken(word) : [word];
      chunks.forEach((chunk, index) => {
        const mid = over && index < chunks.length - 1;
        const tail = over && index === chunks.length - 1;
        if (mid) {
          if (current) pushLine(current, currentWide);
          pushLine(chunk, true);
          current = "";
          currentWide = false;
          return;
        }
        const trial = current ? `${current} ${chunk}` : chunk;
        if (current && widthOf(trial) > maxWidth) {
          pushLine(current, currentWide);
          current = chunk;
          currentWide = tail;
        } else {
          current = trial;
          currentWide = currentWide || tail;
        }
      });
    }
    pushLine(current, currentWide);
  }
  let next = applyKinsoku(lines, widthOf, maxWidth, useGlueFlag);
  let flags = next.length === wide.length ? wide.slice() : next.map(() => false);
  for (let pass = 0; pass < 3; pass += 1) {
    const balanced = rebalancePhrases(next, flags, widthOf, maxWidth, useGlueFlag);
    const kin = applyKinsoku(balanced.lines, widthOf, maxWidth, useGlueFlag);
    const kinFlags = kin.length === balanced.wide.length ? balanced.wide : kin.map(() => false);
    next = kin;
    flags = kinFlags;
    if (!orphanLines(next.join("\n")).length) break;
    if (balanced.lines.join("\n") === next.join("\n")) break;
  }
  const wrapped = next.join("\n");
  probe.destroy();
  return wrapped;
}
