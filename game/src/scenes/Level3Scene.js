import Phaser from "phaser";
import { CHAPTER_COUNT, LEVEL1_BEATS, LEVEL2_BEATS, LEVEL3_BEATS, PHASE_COUNT, SPINE_TOTAL } from "../data/beats.js";
import { cueVoice } from "../audio/sound.js";
import {
  drawLookExample,
  drawMaskExample,
  drawMixExample,
  drawQkvExample,
  drawWeightExample,
  drawWriteExample,
} from "../ui/attention.js";
import { clearLayer, makeLessonFrame } from "../ui/lesson.js";
import { finishLessonStage, paintLessonStage, teachLesson } from "../ui/textbook.js";
import { watchResize } from "../ui/layout.js";

const OFFSET = LEVEL1_BEATS.length + LEVEL2_BEATS.length;

export default class Level3Scene extends Phaser.Scene {
  constructor() {
    super("Level3");
  }

  create() {
    const frame = makeLessonFrame(this, {
      level: 3,
      total: CHAPTER_COUNT,
      title: "只看左边",
    });
    this.frame = frame;
    this.view = frame.v;
    this.beat = 0;
    this.phase = 0;
    this.busy = false;

    watchResize(this, {
      restart: true,
      persist: () => this.registry.set("level3.progress", { beat: this.beat, phase: this.phase }),
    });

    const saved = this.registry.get("level3.progress");
    if (saved) {
      this.registry.remove("level3.progress");
      this.beat = Math.min(LEVEL3_BEATS.length - 1, saved.beat || 0);
      this.phase = Math.min(PHASE_COUNT - 1, saved.phase || 0);
      this.showBeat(this.beat, { instant: true, phase: this.phase });
    } else {
      this.showBeat(0);
    }
  }

  advance() {
    if (this.busy) return;
    if (this.phase < PHASE_COUNT - 1) {
      this.phase += 1;
      this.showBeat(this.beat, { phase: this.phase });
      return;
    }
    if (this.beat >= LEVEL3_BEATS.length - 1) {
      this.registry.remove("level3.progress");
      this.scene.start("End");
      return;
    }
    this.beat += 1;
    this.phase = 0;
    this.showBeat(this.beat);
  }

  setPhase(phase) {
    this.phase = Math.max(0, Math.min(PHASE_COUNT - 1, phase));
    this.showBeat(this.beat, { phase: this.phase, instant: true });
  }

  showBeat(index, { instant = false, phase } = {}) {
    this.phase = phase ?? this.phase ?? 0;
    const beat = LEVEL3_BEATS[index];
    teachLesson(this, this.frame, beat, {
      index: OFFSET + index,
      total: SPINE_TOTAL,
      phase: this.phase,
      instant,
    });
    if (this.phase === 0 && beat.vo) cueVoice(this, beat.vo);
    const lastBeat = index === LEVEL3_BEATS.length - 1;
    const lastPhase = this.phase >= PHASE_COUNT - 1;
    this.frame.nextBtn.setLabel(lastBeat && lastPhase ? "看结果" : lastPhase ? "下一课" : "下一页");
    this.frame.nextBtn.setCaption(lastBeat && lastPhase ? "通关" : lastPhase ? "换一课" : `${this.phase + 1}/${PHASE_COUNT}`);
    this.children.bringToTop(this.frame.nextBtn);

    clearLayer(this.frame.stage);
    const { band } = paintLessonStage(this, beat, this.phase, (next) => this.setPhase(next));
    RENDERERS[beat.id]?.(this, band, { instant, phase: this.phase });
    finishLessonStage(this, band);
  }
}

const RENDERERS = {
  look: drawLookExample,
  qkv: drawQkvExample,
  mask: drawMaskExample,
  weights: drawWeightExample,
  mix: drawMixExample,
  writeback: drawWriteExample,
};
