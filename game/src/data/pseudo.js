import { t } from "../i18n/locale.js";

/** Kid-facing steps for the current page. Strings live in zh.js / ja.js. */
export function pseudoFor(beat) {
  const id = beat?.id || "title";
  const line = (index) => {
    const key = `pseudo.${id}.l${index}`;
    const value = t(key);
    return value === key ? "" : value;
  };
  const lines = [1, 2, 3, 4].map(line).filter(Boolean);
  let myth = t(`pseudo.${id}.myth`);
  if (/^(答案|こたえ)\s*[:：]/.test(myth)) {
    const aside = typeof beat?.footnote === "string" ? beat.footnote : "";
    myth = aside || beat?.purpose || t(`${id}.aim`);
    if (!myth || myth === `${id}.aim` || /^(答案|こたえ)/.test(myth)) myth = t(`${id}.summary`);
  }
  return {
    does: t(`pseudo.${id}.does`),
    metaphor: t(`pseudo.${id}.metaphor`),
    myth,
    lines: lines.length ? lines : [t(`pseudo.${id}.does`)],
  };
}
