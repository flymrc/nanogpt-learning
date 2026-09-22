import Phaser from "phaser";
import { narrateBeat } from "../audio/narrate.js";
import { TITLE_BEAT } from "../data/beats.js";
import { chapterList, localizeBeat, t } from "../i18n/locale.js";
import { consumePendingSheet, pickChapter } from "../ui/catalog.js";
import { syncPseudo } from "../ui/pseudo.js";
import { emitTutor, isWidePcTutor } from "../tutor/bus.js";
import { addRobot, addSpeechBubble } from "../ui/mascot.js";
import { addFooterCta, addMuteToggle, bindAdvance, createButton, makeCharTile, markCaption, paintBackdrop } from "../ui/components.js";
import { CAPTION_CLEAR, STICKER_SHADOW_Y, fitMeasure, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { installLayoutProbe } from "../ui/e2e.js";
import { maybeShowGuide } from "../ui/guide.js";
import { syncMobileChrome } from "../ui/mode.js";
import { C, displayText, uiText } from "../ui/theme.js";

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    if (!this.game.registry.get("assetsReady")) {
      this.scene.start("Boot");
      return;
    }

    const phone = !isWidePcTutor();
    const shell = makeShell(this, phone ? { header: false } : { twoRow: false, headerH: 56 });
    const v = shell.v;
    paintBackdrop(this);
    if (phone) syncMobileChrome({ title: t("appTitle") });
    addMuteToggle(this, shell);
    watchResize(this, { restart: true });

    const plan = layoutTitle(v, shell);
    const titles = plan.slots.titles;
    const titleSize = plan.titleSize;
    const title = this.add.text(v.cx, titles.top + titleSize * 0.55, t("appTitle"), displayText(titleSize)).setOrigin(0.5);
    title.setScale(0.84);
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 520, ease: "Back.Out" });

    this.add
      .text(v.cx, titles.bottom - titleSize * 0.35, t("subtitle"), displayText(Math.max(16, titleSize * 0.42), { color: C.tealCss }))
      .setOrigin(0.5);

    this.playPreview(v, plan);
    this.drawChapters(v, plan);

    const mascot = plan.slots.mascot;
    const robotX = v.portrait ? v.left + 48 : v.left + 80;
    const robotY = mascot.cy;
    addRobot(this, robotX, robotY, { scale: plan.robotScale });
    addSpeechBubble(this, robotX + (v.portrait ? 140 : 156), robotY - 8, t("bubble"), {
      maxWidth: Math.min(v.compact ? 180 : 240, v.right - robotX - 80),
      fontSize: v.compact ? 18 : 24,
    });

    this.advance = () => {
      this.startChapter("Level1");
    };

    this.startBtn = addFooterCta(this, {
      shell,
      label: t("start"),
      caption: t("chapter1"),
      onClick: () => this.advance(),
    });
    bindAdvance(this, () => this.advance());

    const titleBeat = localizeBeat(TITLE_BEAT);
    narrateBeat(this, TITLE_BEAT);
    emitTutor(titleBeat);
    syncPseudo(titleBeat);
    this.frame = { nextBtn: this.startBtn, stage: { list: [] } };
    const pending = consumePendingSheet(this);
    if (!pending) maybeShowGuide();
    installLayoutProbe(this);
  }

  retreat() {
    /* Title is the catalog. Back closes nothing else. */
  }

  startChapter(key) {
    if (!this.game.registry.get("assetsReady")) return;
    pickChapter(key);
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
        fontSize: btnW < 120 ? 15 : 16,
      });
    });
    void rows;
  }

  playPreview(v, plan) {
    const sample = ["S", "e", "c", "o", "n", "d"];
    const tile = plan.tile;
    const preview = plan.slots.preview;
    const captionH = 22;
    const blockH = tile + STICKER_SHADOW_Y + CAPTION_CLEAR + captionH;
    const top = preview.top + Math.max(0, (preview.h - blockH) / 2);
    const yChars = top + tile / 2;
    const pitch = tile + 8;
    sample.forEach((ch, i) => {
      makeCharTile(this, v.cx - ((sample.length - 1) * pitch) / 2 + i * pitch, yChars, ch, {
        width: tile,
        height: tile,
        seed: ch,
      });
    });
    markCaption(
      this.add
        .text(v.cx, yChars + tile / 2 + STICKER_SHADOW_Y + CAPTION_CLEAR + captionH / 2, t("tapeCaption"), displayText(16, { color: C.muted }))
        .setOrigin(0.5),
    );
  }
}

function layoutTitle(v, shell) {
  const landscapeShort = v.short && !v.portrait;
  const measured = fitMeasure(shell.content.h, (s) => {
    const titleSize = Math.min(v.portrait ? 48 : 56, v.innerW / (v.portrait ? 7.2 : 12)) * s;
    const tile = Math.max(36, Math.min(54, v.innerW / 10) * s);
    const titlesH = titleSize * 1.7;
    const previewH = tile + STICKER_SHADOW_Y + CAPTION_CLEAR + 22 + 8;
    const mascotH = Math.round((landscapeShort ? 56 : v.portrait ? 84 : 72) * s);
    const chapterCols = v.innerW < 720 ? 2 : 5;
    const chapterRows = Math.ceil(5 / chapterCols);
    const chapterBtnH = Math.max(48, Math.round((landscapeShort ? 48 : 52) * s));
    const chapterGap = 8;
    const chaptersH = chapterRows * chapterBtnH + (chapterRows - 1) * chapterGap;
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
      btnH: chapterBtnH,
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
