import { DEMO_NEXT_CHAR, DEMO_SNIPPET, DEMO_IDS, DEMO_Y_IDS } from "./facts.js";
import {
  CHAPTER_COUNT,
  END_BEAT,
  LEVEL1_BEATS,
  LEVEL2_BEATS,
  LEVEL3_BEATS,
  LESSON_PHASES,
  PHASE_COUNT,
  SPINE_TOTAL,
  TITLE_BEAT,
  lessonCaption,
  phaseText,
} from "./lessons.js";

export {
  CHAPTER_COUNT,
  END_BEAT,
  LEVEL1_BEATS,
  LEVEL2_BEATS,
  LEVEL3_BEATS,
  LESSON_PHASES,
  PHASE_COUNT,
  SPINE_TOTAL,
  TITLE_BEAT,
  lessonCaption,
  phaseText,
};

export const SNIPPET_CHARS = [...DEMO_SNIPPET];
export const STREAM_CHARS = [...(DEMO_SNIPPET + DEMO_NEXT_CHAR)];
export { DEMO_IDS, DEMO_Y_IDS };
