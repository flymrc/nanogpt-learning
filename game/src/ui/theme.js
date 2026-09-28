import { displayRatio } from "./dpr.js";
import { getLang } from "../i18n/locale.js";

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

function applyKinsoku(lines) {
  const out = [];
  for (const line of lines) {
    let rest = line;
    while (out.length && out[out.length - 1] !== "" && rest && KINSOKU_HEAD.includes(rest[0])) {
      out[out.length - 1] += rest[0];
      rest = rest.slice(1);
    }
    if (rest || line === "") out.push(rest);
  }
  return out;
}

/** Phaser wordWrap ignores CJK (no spaces). Split on glyphs to a pixel width. */
export function wrapToWidth(scene, raw, size, maxWidth, styleFn = uiText) {
  const probe = scene.add.text(-4000, -4000, "", styleFn(size)).setVisible(false);
  const lines = [];
  String(raw || "")
    .split("\n")
    .forEach((para, index) => {
      let current = "";
      for (const ch of para) {
        probe.setText(current + ch);
        if (current && probe.width > maxWidth) {
          lines.push(current);
          current = ch;
        } else {
          current += ch;
        }
      }
      lines.push(current);
      if (index < String(raw || "").split("\n").length - 1) lines.push("");
    });
  probe.destroy();
  return applyKinsoku(lines).join("\n");
}

/** Lines that are a single leftover character after a wrap. A one-character string is not an orphan. */
export function orphanLines(body) {
  const lines = String(body ?? "").split("\n");
  if (lines.length < 2) return [];
  return lines.filter((line) => [...line.replace(/\s+/g, "")].length === 1);
}

/**
 * Wrap at spaces first (the kid script marks words that way), then glyphs.
 * Callers shrink the font while `orphanLines` is non-empty.
 */
export function wrapAtBreaks(scene, raw, size, maxWidth, styleFn = uiText) {
  const probe = scene.add.text(-8000, -8000, "", styleFn(size)).setVisible(false);
  const widthOf = (value) => {
    probe.setText(value);
    return probe.width;
  };
  const breakToken = (token) => {
    const out = [];
    let current = "";
    for (const ch of token) {
      if (current && widthOf(current + ch) > maxWidth) {
        out.push(current);
        current = ch;
      } else {
        current += ch;
      }
    }
    if (current) out.push(current);
    return out.length ? out : [""];
  };
  const lines = [];
  for (const para of String(raw ?? "").split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const chunks = widthOf(word) > maxWidth ? breakToken(word) : [word];
      chunks.forEach((chunk, index) => {
        if (index < chunks.length - 1) {
          if (current) lines.push(current);
          lines.push(chunk);
          current = "";
          return;
        }
        const trial = current ? `${current} ${chunk}` : chunk;
        if (current && widthOf(trial) > maxWidth) {
          lines.push(current);
          current = chunk;
        } else {
          current = trial;
        }
      });
    }
    lines.push(current);
  }
  probe.destroy();
  return applyKinsoku(lines).join("\n");
}
