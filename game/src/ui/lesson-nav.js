import { narrateBeat, publishExpectedVo } from "../audio/narrate.js";
import { PHASE_COUNT } from "../data/beats.js";
import { localizeBeat, t } from "../i18n/locale.js";

export function presentBeat(scene, raw, { speak } = {}) {
  const beat = localizeBeat(raw);
  scene.pageId = raw.id;
  const force = Boolean(scene.registry.get("forceSpeak"));
  if (force) scene.registry.set("forceSpeak", false);
  const pageChanged = (scene.registry.get("spokenBeatId") || "") !== raw.id;
  // Same-page tab taps pass speak:false and keep the current line.
  // A jump onto any phase (including phase 2) speaks that page's .vo.
  if (speak === false && !pageChanged && !force) publishExpectedVo(raw.id);
  else narrateBeat(scene, raw);
  return beat;
}

export function ctaFor({ lastBeat, lastPhase, phase, endLabel, endCaption }) {
  if (lastBeat && lastPhase) return { label: endLabel, caption: endCaption };
  if (lastPhase) return { label: t("nextBeat"), caption: t("nextBeatHint") };
  return { label: t("nextPage"), caption: `${phase + 1}/${PHASE_COUNT}` };
}
