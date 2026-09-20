export const W = 1280;
export const H = 720;

export const C = {
  bg: 0x0c1220,
  bg2: 0x111a2c,
  surface: 0x1a2438,
  surface2: 0x243044,
  stroke: 0x3a4a66,
  text: "#f3efe6",
  textDark: "#0c1220",
  muted: "#93a0b5",
  teal: 0x3ecfc4,
  tealCss: "#3ecfc4",
  gold: 0xf0c14b,
  goldCss: "#f0c14b",
  blue: 0x6cb6ff,
  blueCss: "#6cb6ff",
  violet: 0x9b8afb,
  violetCss: "#c4bbff",
  cream: 0xf3efe6,
  dangerSoft: 0xe8a0a0,
};

export const FONT_UI =
  '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Micro Hei", "Droid Sans Fallback", sans-serif';
export const FONT_MONO =
  '"IBM Plex Mono", "SF Mono", Consolas, "WenQuanYi Micro Hei Mono", monospace';

export function uiText(size, extra = {}) {
  return {
    fontFamily: FONT_UI,
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
