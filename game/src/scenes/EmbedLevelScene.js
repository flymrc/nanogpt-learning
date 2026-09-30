import Phaser from "phaser";
import { CHAPTER_COUNT, PHASE_COUNT } from "../data/beats.js";
import { EMBED_PAGES, embedPagesFor } from "../i18n/embed/skeleton.js";
import { setCourse, t } from "../i18n/locale.js";
import { retreatToPreviousChapter, takeSceneProgress } from "../ui/catalog.js";
import { ctaFor, presentBeat } from "../ui/lesson-nav.js";
import { clearLayer, makeLessonFrame } from "../ui/lesson.js";
import { drawPageArt } from "../ui/page-art.js";
import { finishLessonStage, paintLessonStage, teachLesson } from "../ui/textbook.js";
import { watchResize } from "../ui/layout.js";

const NEXT = {
  1: ["Embed2", "toLevel2", "toLevel2Hint"],
  2: ["Embed3", "toLevel3", "toLevel3Hint"],
  3: ["Embed4", "toLevel4", "toLevel4Hint"],
  4: ["Embed5", "toLevel5", "toLevel5Hint"],
  5: ["EmbedEnd", "toEnd", "toEndHint"],
};

function makeEmbedLevel(level) {
  const pages = embedPagesFor(level);
  const before = EMBED_PAGES.filter((page) => page.chapter < level).length;
  return class EmbedLevelScene extends Phaser.Scene {
    constructor() {
      super(`Embed${level}`);
    }

    create() {
      setCourse("embed");
      const frame = makeLessonFrame(this, {
        level,
        total: CHAPTER_COUNT,
        title: t(`level${level}Title`),
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
          this.registry.set(`embed${level}.progress`, payload);
          return payload;
        },
      });
      const saved = takeSceneProgress(this, `embed${level}.progress`, pages.length - 1);
      if (saved) this.showBeat(saved.beat, { instant: true, phase: saved.phase });
      else this.showBeat(0);
    }

    advance() {
      if (this.busy) return;
      if (this.phase < PHASE_COUNT - 1) {
        this.phase += 1;
        this.showBeat(this.beat, { phase: this.phase, speak: false });
        return;
      }
      if (this.beat >= pages.length - 1) {
        this.registry.remove(`embed${level}.progress`);
        const [scene] = NEXT[level];
        this.scene.start(scene, { beat: 0, phase: 0 });
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
      this.beat = index;
      this.phase = phase ?? this.phase ?? 0;
      this.__embedStep = 0;
      this.__embedPage = "";
      const raw = pages[index];
      const beat = presentBeat(this, raw, { speak });
      this.frame.fitPurpose?.(this.phase);
      teachLesson(this, this.frame, beat, {
        index: before + index,
        total: EMBED_PAGES.length,
        phase: this.phase,
        instant,
      });
      const [endScene, endLabel, endHint] = NEXT[level];
      void endScene;
      const cta = ctaFor({
        lastBeat: index === pages.length - 1,
        lastPhase: this.phase >= PHASE_COUNT - 1,
        phase: this.phase,
        endLabel: t(endLabel),
        endCaption: t(endHint),
      });
      this.frame.nextBtn.setLabel(cta.label);
      this.frame.nextBtn.setCaption(cta.caption);
      this.children.bringToTop(this.frame.nextBtn);
      clearLayer(this.frame.stage);
      const { band } = paintLessonStage(this, beat, this.phase, (next) => this.setPhase(next));
      drawPageArt(this, band, beat, { phase: this.phase, instant });
      finishLessonStage(this, band);
    }
  };
}

export const Embed1Scene = makeEmbedLevel(1);
export const Embed2Scene = makeEmbedLevel(2);
export const Embed3Scene = makeEmbedLevel(3);
export const Embed4Scene = makeEmbedLevel(4);
export const Embed5Scene = makeEmbedLevel(5);
