import Phaser from "phaser";
import { narrateBeat } from "../audio/narrate.js";
import { RAG_TITLE } from "../i18n/rag/skeleton.js";
import { chapterList, localizeBeat, setCourse, t } from "../i18n/locale.js";
import { consumePendingSheet, pickChapter } from "../ui/catalog.js";
import { syncHubChrome } from "../ui/chrome.js";
import { syncPseudo } from "../ui/pseudo.js";
import { rememberLesson } from "../ui/route.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { addFooterCta, addMuteToggle, bindAdvance, clearPcHudStack, createButton, drawSticker, markCaption, paintBackdrop, planLessonHeader } from "../ui/components.js";
import { CAPTION_CLEAR, STICKER_SHADOW_Y, fitMeasure, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { installLayoutProbe } from "../ui/e2e.js";
import { maybeShowGuide } from "../ui/guide.js";
import { syncMobileChrome } from "../ui/mode.js";
import { C, displayText } from "../ui/theme.js";

export default class RagTitleScene extends Phaser.Scene {
  constructor() {
    super("RagTitle");
  }

  create() {
    setCourse("rag");
    if (!this.game.registry.get("assetsReady")) {
      this.scene.start("Boot");
      return;
    }
    syncHubChrome("RagTitle");
    const phone = !isWidePcTutor();
    clearPcHudStack();
    const headerPlan = phone ? null : planLessonHeader(this, t("appTitle"));
    const shell = makeShell(this, phone ? { header: false } : { twoRow: false, headerH: headerPlan.headerH });
    const v = shell.v;
    paintBackdrop(this);
    if (phone) syncMobileChrome({ title: t("appTitle") });
    addMuteToggle(this, shell);
    watchResize(this, { restart: true });

    const plan = layoutTitle(v, shell);
    const titles = plan.slots.titles;
    this.add.text(v.cx, titles.top + plan.titleSize * 0.45, t("appTitle"), displayText(plan.titleSize)).setOrigin(0.5);
    this.add
      .text(v.cx, titles.bottom - plan.titleSize * 0.2, t("subtitle"), displayText(Math.max(16, plan.titleSize * 0.38), { color: C.tealCss }))
      .setOrigin(0.5);

    this.drawBook(v, plan);
    this.drawChapters(v, plan);

    const mascot = plan.slots.mascot;
    const robotX = v.portrait ? v.left + 48 : v.left + 80;
    const robotY = mascot.cy;
    addRobot(this, robotX, robotY, { scale: plan.robotScale });
    addSpeechBubble(this, robotX + (v.portrait ? 140 : 156), robotY - 8, t("bubble"), {
      maxWidth: Math.min(v.compact ? 180 : 240, v.right - robotX - 80),
      fontSize: v.compact ? 18 : 22,
    });

    this.advance = () => this.startChapter("Rag1");
    this.startBtn = addFooterCta(this, {
      shell,
      label: t("start"),
      caption: t("chapter1"),
      onClick: () => this.advance(),
    });
    bindAdvance(this, () => this.advance());

    const beat = localizeBeat(RAG_TITLE);
    this.pageId = RAG_TITLE.id;
    narrateBeat(this, RAG_TITLE);
    emitTutor(beat);
    syncPseudo(beat);
    this.frame = { nextBtn: this.startBtn, stage: { list: [] } };
    rememberLesson("RagTitle", 0, 0);
    const pending = consumePendingSheet(this);
    if (!pending) maybeShowGuide();
    installLayoutProbe(this);
  }

  retreat() {}

  startChapter(key) {
    if (!this.game.registry.get("assetsReady")) return;
    pickChapter(key);
  }

  drawBook(v, plan) {
    const preview = plan.slots.preview;
    const w = Math.min(180, v.innerW * 0.4);
    const h = Math.max(36, plan.tile);
    const y = preview.cy - 8;
    const g = this.add.graphics();
    drawSticker(g, v.cx - w / 2, y - h / 2, w, h, 12, C.surface);
    g.fillStyle(C.blue, 1);
    g.fillRoundedRect(v.cx - w * 0.42, y - h * 0.28, w * 0.36, h * 0.56, 4);
    g.fillStyle(C.gold, 1);
    g.fillCircle(v.cx + w * 0.16, y, Math.min(10, h * 0.16));
    markCaption(
      this.add
        .text(v.cx, y + h / 2 + STICKER_SHADOW_Y + CAPTION_CLEAR, t("tapeCaption"), displayText(16, { color: C.muted }))
        .setOrigin(0.5, 0),
    );
  }

  drawChapters(v, plan) {
    const slot = plan.slots.chapters;
    const chapters = chapterList();
    const cols = plan.chapterCols;
    const rows = plan.chapterRows;
    const gapX = 8;
    const gapY = 8;
    const btnW = Math.min(168, (v.innerW - gapX * (cols - 1)) / cols);
    const fittedH = (slot.h - gapY * (rows - 1)) / rows;
    const btnH = Math.min(52, Math.max(44, fittedH));
    const rowW = cols * btnW + (cols - 1) * gapX;
    chapters.forEach((chapter, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = v.cx - rowW / 2 + btnW / 2 + col * (btnW + gapX);
      const y = slot.top + btnH / 2 + row * (btnH + gapY);
      createButton(this, x, rows === 1 ? slot.cy : y, chapter.shortLabel, () => this.startChapter(chapter.id), {
        width: btnW,
        minWidth: 64,
        height: btnH,
        fill: i === 0 ? C.coral : i === chapters.length - 1 ? C.gold : C.surface,
        fontSize: btnW < 120 ? 14 : 16,
      });
    });
  }
}

function layoutTitle(v, shell) {
  const landscapeShort = v.short && !v.portrait;
  const measured = fitMeasure(shell.content.h, (s) => {
    const titleSize = Math.min(v.portrait ? 40 : 48, v.innerW / (v.portrait ? 8 : 14)) * s;
    const tile = Math.max(36, Math.min(54, v.innerW / 10) * s);
    const titlesH = titleSize * 1.8;
    const previewH = tile + STICKER_SHADOW_Y + CAPTION_CLEAR + 28;
    const mascotH = Math.round((landscapeShort ? 56 : v.portrait ? 84 : 72) * s);
    const chapterCols = v.innerW < 720 ? 2 : 5;
    const chapterRows = Math.ceil(5 / chapterCols);
    const chapterBtnH = Math.max(48, Math.round((landscapeShort ? 48 : 52) * s));
    const chaptersH = chapterRows * chapterBtnH + (chapterRows - 1) * 8;
    const gapY = Math.round(12 * s);
    const items = [
      { id: "titles", h: titlesH },
      { id: "preview", h: previewH },
      { id: "mascot", h: mascotH },
      { id: "chapters", h: chaptersH },
    ];
    const stacked = stackSlots(items, {
      top: 0,
      bottom: items.reduce((sum, it) => sum + it.h, 0) + gapY * (items.length - 1),
      gap: gapY,
      justify: "start",
    });
    return {
      h: stacked.used,
      items,
      gapY,
      titleSize,
      tile,
      chapterCols,
      chapterRows,
      robotScale: (landscapeShort ? 0.28 : v.short ? 0.32 : v.compact ? 0.38 : 0.46) * Math.min(1, s + 0.1),
    };
  });
  const stacked = stackSlots(measured.items, {
    top: shell.content.top,
    bottom: shell.content.bottom,
    gap: measured.gapY,
    justify: "distribute",
  });
  return { ...measured, slots: stacked.slots };
}
