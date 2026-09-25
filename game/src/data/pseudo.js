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
  return {
    does: t(`pseudo.${id}.does`),
    metaphor: t(`pseudo.${id}.metaphor`),
    myth: t(`pseudo.${id}.myth`),
    lines: lines.length ? lines : [t(`pseudo.${id}.does`)],
  };
}
