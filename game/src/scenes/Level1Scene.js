import Phaser from "phaser";
import { LEVEL1_BEATS, PHASE_COUNT, SPINE_TOTAL } from "../data/beats.js";
import { cueVoice } from "../audio/sound.js";
import {
  drawEncodeExample,
  drawScrollExample,
  drawSeatExample,
  drawTapeExample,
  drawVocabExample,
} from "../ui/examples.js";
import { clearLayer, makeLessonFrame } from "../ui/lesson.js";
import { finishLessonStage, paintLessonStage, teachLesson } from "../ui/textbook.js";
import { watchResize } from "../ui/layout.js";

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1");
  }

  create() {
    const frame = makeLessonFrame(this, { level: 1, total: 2, title: "先拉成纸带" });
    this.frame = frame;
    this.view = frame.v;
    this.beat = 0;
    this.phase = 0;
    this.busy = false;

    watchResize(this, {
      restart: true,
      persist: () => this.registry.set("level1.progress", { beat: this.beat, phase: this.phase }),
    });

    const saved = this.registry.get("level1.progress");
    if (saved) {
      this.registry.remove("level1.progress");
      this.beat = Math.min(LEVEL1_BEATS.length - 1, saved.beat || 0);
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
    if (this.beat >= LEVEL1_BEATS.length - 1) {
      this.registry.remove("level1.progress");
      this.scene.start("Level2");
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
    const beat = LEVEL1_BEATS[index];
    teachLesson(this, this.frame, beat, {
      index,
      total: SPINE_TOTAL,
      phase: this.phase,
      instant,
    });
    if (this.phase === 0 && beat.vo) cueVoice(this, beat.vo);
    const lastBeat = index === LEVEL1_BEATS.length - 1;
    const lastPhase = this.phase >= PHASE_COUNT - 1;
    this.frame.nextBtn.setLabel(lastBeat && lastPhase ? "走起" : lastPhase ? "下一拍" : "下一步细节");
    this.frame.nextBtn.setCaption(lastBeat && lastPhase ? "下一关" : lastPhase ? "下一想法" : `${this.phase + 1}/${PHASE_COUNT}`);
    this.children.bringToTop(this.frame.nextBtn);

    clearLayer(this.frame.stage);
    const { band } = paintLessonStage(this, beat, this.phase, (next) => this.setPhase(next));
    RENDERERS[beat.id]?.(this, band, { instant, phase: this.phase });
    finishLessonStage(this, band);
  }
}

const RENDERERS = {
  tape: drawTapeExample,
  plates: drawEncodeExample,
  seats: drawSeatExample,
  sixtyfive: drawVocabExample,
  scrolls: drawScrollExample,
};
