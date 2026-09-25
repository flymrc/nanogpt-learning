import { cueNarration } from "./sound.js";
import { voCacheKey } from "./vo-catalog.js";
import { getLang, speechFor } from "../i18n/locale.js";

function voiceLang() {
  return getLang() === "ja" ? "ja-JP" : "zh-CN";
}

export function publishExpectedVo(id) {
  if (!id || typeof window === "undefined") return "";
  const text = speechFor(id);
  window.__nanoGPTExpectedVo = () => ({ id, text });
  return text;
}

export function narrateBeat(scene, raw) {
  if (!scene || !raw?.id) return;
  const text = publishExpectedVo(raw.id);
  scene.registry?.set("spokenBeatId", raw.id);
  cueNarration(scene, {
    text,
    clip: voCacheKey(getLang(), raw.id),
    lang: voiceLang(),
    kind: "beat",
    id: raw.id,
  });
}

export function narrateLine(scene, text, kind = "line") {
  if (!scene || !text) return;
  cueNarration(scene, {
    text,
    clip: null,
    lang: voiceLang(),
    kind,
    id: kind,
  });
}
