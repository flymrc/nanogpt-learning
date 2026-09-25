import Phaser from "phaser";
import { CHAPTER_COUNT, LEVEL1_BEATS, LEVEL2_BEATS, LEVEL3_BEATS, PHASE_COUNT, SPINE_TOTAL } from "../data/beats.js";
import { t } from "../i18n/locale.js";
import { retreatToPreviousChapter } from "../ui/catalog.js";
import { ctaFor, presentBeat } from "../ui/lesson-nav.js";
import { clearLayer, makeLessonFrame } from "../ui/lesson.js";
import { drawPageArt } from "../ui/page-art.js";
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
      title: t("level3Title"),
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
      this.showBeat(this.beat, { phase: this.phase, speak: false });
      return;
    }
    if (this.beat >= LEVEL3_BEATS.length - 1) {
      this.registry.remove("level3.progress");
      this.scene.start("Level4");
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
    const raw = LEVEL3_BEATS[index];
    const beat = presentBeat(this, raw, { speak });
    teachLesson(this, this.frame, beat, {
      index: OFFSET + index,
      total: SPINE_TOTAL,
      phase: this.phase,
      instant,
    });
    const lastBeat = index === LEVEL3_BEATS.length - 1;
    const lastPhase = this.phase >= PHASE_COUNT - 1;
    const cta = ctaFor({
      lastBeat,
      lastPhase,
      phase: this.phase,
      endLabel: t("toLevel4"),
      endCaption: t("toLevel4Hint"),
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
