import Phaser from "phaser";
import { CHAPTER_COUNT, LEVEL1_BEATS, LEVEL2_BEATS, PHASE_COUNT, SPINE_TOTAL } from "../data/beats.js";
import { setCourse, t } from "../i18n/locale.js";
import { retreatToPreviousChapter, takeSceneProgress } from "../ui/catalog.js";
import { ctaFor, presentBeat } from "../ui/lesson-nav.js";
import { clearLayer, makeLessonFrame } from "../ui/lesson.js";
import { drawPageArt } from "../ui/page-art.js";
import { finishLessonStage, paintLessonStage, teachLesson } from "../ui/textbook.js";
import { watchResize } from "../ui/layout.js";

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super("Level2");
  }

  create() {
    setCourse("nanogpt");
    const frame = makeLessonFrame(this, {
      level: 2,
      total: CHAPTER_COUNT,
      title: t("level2Title"),
    });
    this.frame = frame;
    this.view = frame.v;
    this.beat = 0;
    this.phase = 0;
    this.busy = false;

    watchResize(this, {
      restart: true,
      persist: () => {
        const payload = { beat: this.beat, phase: this.phase };
        this.registry.set("level2.progress", payload);
        return payload;
      },
    });

    const saved = takeSceneProgress(this, "level2.progress", LEVEL2_BEATS.length - 1);
    if (saved) {
      this.beat = saved.beat;
      this.phase = saved.phase;
      this.showBeat(this.beat, { instant: true, phase: this.phase });
    } else {
      this.showBeat(0);
    }
  }

  advance() {
    if (this.busy) return;
    if (this.phase < PHASE_COUNT - 1) {
      this.phase += 1;
      this.showBeat(this.beat, { phase: this.phase, speak: false });
      return;
    }
    if (this.beat >= LEVEL2_BEATS.length - 1) {
      this.registry.remove("level2.progress");
      this.scene.start("Level3", { beat: 0, phase: 0 });
      return;
    }
    this.beat += 1;
    this.phase = 0;
    this.showBeat(this.beat);
  }

  retreat() {
    if (this.busy) return;
    if (this.phase > 0) {
      this.phase -= 1;
      this.showBeat(this.beat, { phase: this.phase, instant: true, speak: false });
      return;
    }
    if (this.beat > 0) {
      this.beat -= 1;
      this.phase = PHASE_COUNT - 1;
      this.showBeat(this.beat, { phase: this.phase, instant: true, speak: false });
      return;
    }
    retreatToPreviousChapter(this);
  }

  setPhase(phase) {
    this.phase = Math.max(0, Math.min(PHASE_COUNT - 1, phase));
    this.showBeat(this.beat, { phase: this.phase, instant: true, speak: false });
  }

  showBeat(index, { instant = false, phase, speak } = {}) {
    this.phase = phase ?? this.phase ?? 0;
    const raw = LEVEL2_BEATS[index];
    const beat = presentBeat(this, raw, { speak });
    teachLesson(this, this.frame, beat, {
      index: LEVEL1_BEATS.length + index,
      total: SPINE_TOTAL,
      phase: this.phase,
      instant,
    });
    const lastBeat = index === LEVEL2_BEATS.length - 1;
    const lastPhase = this.phase >= PHASE_COUNT - 1;
    const cta = ctaFor({
      lastBeat,
      lastPhase,
      phase: this.phase,
      endLabel: t("toLevel3"),
      endCaption: t("toLevel3Hint"),
    });
    this.frame.nextBtn.setLabel(cta.label);
    this.frame.nextBtn.setCaption(cta.caption);
    this.children.bringToTop(this.frame.nextBtn);

    clearLayer(this.frame.stage);
    const { band } = paintLessonStage(this, beat, this.phase, (next) => this.setPhase(next));
    drawPageArt(this, band, beat, { phase: this.phase, instant });
    finishLessonStage(this, band);
  }
}
