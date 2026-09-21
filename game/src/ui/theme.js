export const W = 1280;
export const H = 720;

export const C = {
  skyTop: 0x8ed8ff,
  skyBot: 0xffe0c8,
  hill: 0x86de7a,
  hillDark: 0x5fc46d,
  sun: 0xffe566,
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

export const FONT_UI =
  '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif';
export const FONT_DISPLAY =
  '"ZCOOL QingKe HuangYou", "Fredoka", "Noto Sans SC", "PingFang SC", sans-serif';
export const FONT_MONO = '"Fredoka", "Noto Sans SC", "IBM Plex Mono", monospace';

export function uiText(size, extra = {}) {
  return {
    fontFamily: FONT_UI,
    fontSize: `${size}px`,
    color: C.text,
    ...extra,
  };
}

export function displayText(size, extra = {}) {
  return {
    fontFamily: FONT_DISPLAY,
    fontSize: `${size}px`,
    color: C.text,
    ...extra,
  };
}

export function monoText(size, extra = {}) {
  return {
    fontFamily: FONT_MONO,
    fontSize: `${size}px`,
    color: C.text,
    ...extra,
  };
}

export function stickerColor(seed) {
  const n = typeof seed === "number" ? seed : String(seed).charCodeAt(0) || 0;
  return STICKERS[Math.abs(n) % STICKERS.length];
}
