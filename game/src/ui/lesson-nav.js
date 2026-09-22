import { narrateBeat } from "../audio/narrate.js";
import { PHASE_COUNT } from "../data/beats.js";
import { localizeBeat, t } from "../i18n/locale.js";

export function presentBeat(scene, raw, { speak } = {}) {
  const beat = localizeBeat(raw);
  const force = Boolean(scene.registry.get("forceSpeak"));
  if (force) scene.registry.set("forceSpeak", false);
  if (force || (scene.phase === 0 && speak !== false)) narrateBeat(scene, raw);
  return beat;
}

export function ctaFor({ lastBeat, lastPhase, phase, endLabel, endCaption }) {
  if (lastBeat && lastPhase) return { label: endLabel, caption: endCaption };
  if (lastPhase) return { label: t("nextBeat"), caption: t("nextBeatHint") };
  return { label: t("nextPage"), caption: `${phase + 1}/${PHASE_COUNT}` };
}
