import { cueNarration } from "./sound.js";
import { getLang, speechFor } from "../i18n/locale.js";

function voiceLang() {
  return getLang() === "ja" ? "ja-JP" : "zh-CN";
}

export function narrateBeat(scene, raw) {
  if (!scene || !raw?.id) return;
  cueNarration(scene, {
    text: speechFor(raw.id),
    clip: null,
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
