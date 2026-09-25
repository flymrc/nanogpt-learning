import { PAGES, pagesFor } from "../i18n/skeleton.js";

/** One textbook page, five short stops: aim, look, do, summary, check. */
export const LESSON_PHASES = [
  { id: "aim", label: "目标", kicker: "今天要懂" },
  { id: "look", label: "看看", kicker: "看一看" },
  { id: "do", label: "做做", kicker: "做一做" },
  { id: "box", label: "小结", kicker: "小结" },
  { id: "check", label: "试试", kicker: "试一试" },
];

export const PHASE_COUNT = LESSON_PHASES.length;

export const LEVEL1_BEATS = pagesFor(1);
export const LEVEL2_BEATS = pagesFor(2);
export const LEVEL3_BEATS = pagesFor(3);
export const LEVEL4_BEATS = pagesFor(4);
export const LEVEL5_BEATS = pagesFor(5);
export const CHAPTER_COUNT = 5;
export const SPINE_TOTAL = PAGES.length;

function shellPage(id) {
  return {
    id,
    chapter: 0,
    kind: id,
    visual: "none",
    shared: {},
    exampleSlots: null,
    keys: {
      bubble: `${id}.bubble`,
      aim: `${id}.aim`,
      look: `${id}.look`,
      action: `${id}.action`,
      summary: `${id}.summary`,
      checkQ: `${id}.checkQ`,
      checkA: `${id}.checkA`,
      vo: `${id}.vo`,
    },
  };
}

export const TITLE_BEAT = shellPage("title");
export const END_BEAT = shellPage("end");

export function phaseText(beat, phase = 0) {
  const id = LESSON_PHASES[phase]?.id;
  if (id === "aim") return beat.goal || beat.purpose || "";
  if (id === "look") return beat.why || "";
  if (id === "do") return beat.example || "";
  if (id === "box") return (beat.myths || []).join("\n");
  if (id === "check") return beat.remember || "";
  return beat.caption || "";
}

export function lessonCaption(beat) {
  return beat?.caption || beat?.purpose || "";
}
