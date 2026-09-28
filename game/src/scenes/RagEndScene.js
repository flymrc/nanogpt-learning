import Phaser from "phaser";
import { narrateBeat } from "../audio/narrate.js";
import { RAG_END } from "../i18n/rag/skeleton.js";
import { localizeBeat, setCourse, t } from "../i18n/locale.js";
import { retreatToPreviousChapter } from "../ui/catalog.js";
import { syncHubChrome } from "../ui/chrome.js";
import { syncPseudo } from "../ui/pseudo.js";
import { rememberLesson } from "../ui/route.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { addFooterCta, addMuteToggle, bindAdvance, clearPcHudStack, paintBackdrop, planLessonHeader, spawnConfetti } from "../ui/components.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { installLayoutProbe } from "../ui/e2e.js";
import { syncMobileChrome } from "../ui/mode.js";
import { drawSticker } from "../ui/components.js";
import { C, displayText, uiText } from "../ui/theme.js";

export default class RagEndScene extends Phaser.Scene {
  constructor() {
    super("RagEnd");
  }

  create() {
    setCourse("rag");
    syncHubChrome("RagEnd");
    const phone = !isWidePcTutor();
    clearPcHudStack();
    const headerPlan = phone ? null : planLessonHeader(this, t("endTitle"));
    const shell = makeShell(this, phone ? { header: false } : { twoRow: false, headerH: headerPlan.headerH });
    const v = shell.v;
    paintBackdrop(this);
    spawnConfetti(this);
    watchResize(this, { restart: true });
    if (phone) syncMobileChrome({ title: t("endTitle") });
    addMuteToggle(this, shell);

    const beat = localizeBeat(RAG_END);
    this.pageId = RAG_END.id;
    narrateBeat(this, RAG_END);
    emitTutor(beat);
    syncPseudo(beat);
    rememberLesson("RagEnd", 0, 0);

    const rules = [t("rend.aim"), t("rend.look"), t("rend.summary")];
    const cardH = phone ? 54 : 64;
    const gap = 10;
    const blockH = rules.length * cardH + (rules.length - 1) * gap;
    const items = [
      { id: "hero", h: phone ? 120 : 150 },
      { id: "rules", h: blockH },
    ];
    const stacked = stackSlots(items, {
      top: shell.content.top,
      bottom: shell.content.bottom - 8,
      gap: 12,
      justify: "center",
    });
    const hero = stacked.slots.hero;
    const robotX = v.portrait ? v.cx - 70 : v.cx - 160;
    addRobot(this, robotX, hero.cy, { scale: phone ? 0.28 : 0.4, mood: "wow" });
    addSpeechBubble(this, robotX + 130, hero.cy - 20, t("endSpeech"), {
      maxWidth: Math.min(220, v.innerW * 0.45),
      fontSize: phone ? 16 : 22,
    });
    this.add.text(v.cx, hero.bottom - 8, t("endTitle"), displayText(phone ? 28 : 40)).setOrigin(0.5, 1);

    const slot = stacked.slots.rules;
    const width = Math.min(520, v.innerW - 16);
    rules.forEach((line, index) => {
      const y = slot.top + cardH / 2 + index * (cardH + gap);
      const g = this.add.graphics();
      drawSticker(g, v.cx - width / 2, y - cardH / 2, width, cardH, 14, C.surface);
      this.add.text(v.cx, y, line, uiText(phone ? 14 : 16, { align: "center", wordWrap: { width: width - 28 } })).setOrigin(0.5);
    });

    this.advance = () => {
      this.scene.start("RagTitle");
    };
    this.retreat = () => retreatToPreviousChapter(this);
    const nextBtn = addFooterCta(this, {
      shell,
      label: t("endReplay"),
      caption: t("catalog"),
      onClick: () => this.advance(),
    });
    bindAdvance(this, () => this.advance());
    this.frame = { nextBtn, stage: { list: [] }, shell, v };
    installLayoutProbe(this);
  }
}
