import Phaser from "phaser";
import {
  DATASET,
  DEMO_IDS,
  DEMO_SNIPPET,
  VOCAB_SIZE,
  displayGlyph,
} from "../data/facts.js";
import { cueVoice, playSfx } from "../audio/sound.js";
import {
  addChrome,
  addFooterCta,
  addSectionTag,
  bindAdvance,
  burstStars,
  makeArrow,
  makeCharTile,
  makeChip,
  makeFactChip,
  paintBackdrop,
  pulseChip,
  setTileActive,
} from "../ui/components.js";
import { addRobot, addScrollBuddy, addSpeechBubble, setSpeech } from "../ui/mascot.js";
import { fitMeasure, flowPositions, makeShell, stackSlots, watchResize } from "../ui/layout.js";
import { C, displayText } from "../ui/theme.js";

const CHARS = [...DEMO_SNIPPET];

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1");
  }

  create() {
    const shell = makeShell(this);
    const v = shell.v;
    this.view = v;
    this.shell = shell;
    paintBackdrop(this);
    addChrome(this, { level: 1, total: 2, title: "字符变 ID", shell });

    const plan = layoutLevel1(v, shell);
    this.layout = plan;
    this.tileSize = plan.tile;
    this.chipH = plan.chipH;
    this.mapPos = plan.mapPos;

    const mascot = plan.slots.mascot;
    const robotScale = plan.robotScale;
    const robotX = v.left + (v.compact ? 32 : 52);
    const robotY = mascot.cy;
    addRobot(this, robotX, robotY, { scale: robotScale });
    if (!v.compact) addScrollBuddy(this, robotX, robotY + 54, { scale: 0.28 });
    const speechMax = Math.min(v.compact ? 168 : 220, v.right - robotX - 70);
    this.speech = addSpeechBubble(this, robotX + (v.compact ? 118 : 150), robotY - 8, "点它变数字", {
      maxWidth: speechMax,
      fontSize: v.compact ? 18 : 24,
    });
    cueVoice(this, "vo-level1");

    addSectionTag(this, "原文", C.pink, { left: v.left, top: plan.slots.source.top });
    this.sourceTiles = CHARS.map((ch, i) =>
      makeCharTile(this, plan.srcPos[i].x, plan.srcPos[i].y, displayGlyph(ch), {
        width: plan.tile,
        height: plan.tile,
        seed: ch,
      }),
    );

    this.downArrow = makeArrow(this, v.cx, plan.slots.arrow.cy, { angle: 90, color: C.coral, label: "" });

    addSectionTag(this, "id", C.gold, { left: v.left, top: plan.slots.map.top });
    this.mappedChips = new Array(CHARS.length).fill(null);

    this.uniqueChip = makeFactChip(this, v.cx, plan.slots.dock.cy, {
      value: "★ 0",
      label: "本段唯一",
      tip: "重复字母共用同一个 id",
      accent: C.gold,
      width: Math.min(200, v.innerW - 32),
      height: plan.uniqueH,
    });

    this.nextBtn = addFooterCta(this, {
      shell,
      label: "下一步",
      caption: "点一下",
      onClick: () => this.advance(),
    });

    this.step = 0;
    this.busy = false;
    this.factsShown = false;
    this.uniqueSeen = new Set();
    this.factChips = [];

    bindAdvance(this, () => this.advance());

    watchResize(this, {
      restart: true,
      persist: () => {
        this.registry.set("level1.progress", {
          step: this.step,
          factsShown: this.factsShown,
          unique: [...this.uniqueSeen],
        });
      },
    });

    const saved = this.registry.get("level1.progress");
    if (saved) {
      this.registry.remove("level1.progress");
      this.restoreProgress(saved);
    }
  }

  restoreProgress(saved) {
    this.uniqueSeen = new Set(saved.unique || []);
    const limit = Math.min(CHARS.length, saved.step || 0);
    for (let i = 0; i < limit; i += 1) {
      const ch = CHARS[i];
      const to = this.mapPos[i];
      const chip = makeChip(this, to.x, to.y, {
        glyph: displayGlyph(ch),
        id: DEMO_IDS[i],
        accent: this.uniqueSeen.has(ch) ? C.teal : C.blue,
        width: this.tileSize,
        height: this.chipH,
      });
      this.mappedChips[i] = chip;
    }
    this.step = limit;
    this.refreshUnique();
    if (saved.factsShown) {
      this.showFacts({ instant: true });
    }
  }

  advance() {
    if (this.busy) return;
    if (this.step < CHARS.length) {
      this.mapOne(this.step);
      return;
    }
    if (!this.factsShown) {
      this.showFacts();
      return;
    }
    this.registry.remove("level1.progress");
    this.scene.start("Level2");
  }

  mapOne(index) {
    this.busy = true;
    const ch = CHARS[index];
    const id = DEMO_IDS[index];
    const isNew = !this.uniqueSeen.has(ch);
    this.uniqueSeen.add(ch);

    const tile = this.sourceTiles[index];
    setTileActive(tile, true);
    this.sourceTiles.forEach((other, i) => {
      if (i !== index) setTileActive(other, false);
    });

    setSpeech(this.speech, speechFor(ch, id, isNew));
    if (index === 0) cueVoice(this, "vo-map");

    const flyer = makeCharTile(this, tile.x, tile.y, displayGlyph(ch), {
      width: this.tileSize,
      height: this.tileSize,
      seed: ch,
    });
    flyer.setDepth(12);
    const to = this.mapPos[index];

    this.tweens.add({
      targets: flyer,
      x: to.x,
      y: to.y,
      scale: 0.2,
      angle: 12,
      duration: 380,
      ease: "Cubic.In",
      onComplete: () => {
        flyer.destroy();
        playSfx(this, "sfx-pop", 0.22);
        burstStars(this, to.x, to.y);
        const chip = makeChip(this, to.x, to.y, {
          glyph: displayGlyph(ch),
          id,
          accent: isNew ? C.teal : C.blue,
          width: this.tileSize,
          height: this.chipH,
        });
        chip.setScale(0.55);
        this.mappedChips[index] = chip;
        this.tweens.add({ targets: chip, scale: 1, duration: 220, ease: "Back.Out" });

        this.refreshUnique();

        if (!isNew) {
          const first = CHARS.indexOf(ch);
          if (this.mappedChips[first]) {
            pulseChip(this, this.mappedChips[first]);
            this.flashReuse(this.mappedChips[first]);
          }
        }

        this.step += 1;
        this.busy = false;
      },
    });
  }

  refreshUnique() {
    const n = this.uniqueSeen.size;
    this.uniqueChip.setValue(`★ ${n}`);
    this.tweens.add({
      targets: this.uniqueChip,
      scale: 1.1,
      duration: 120,
      yoyo: true,
      ease: "Back.Out",
    });
  }

  flashReuse(chip) {
    const stamp = this.add
      .text(chip.x, chip.y - this.chipH * 0.7, "复用", displayText(20, { color: C.coralCss }))
      .setOrigin(0.5)
      .setScale(0.4);
    this.tweens.add({
      targets: stamp,
      scale: 1,
      y: chip.y - this.chipH * 0.82,
      duration: 180,
      hold: 420,
      yoyo: true,
      onComplete: () => stamp.destroy(),
    });
  }

  showFacts({ instant = false } = {}) {
    this.busy = true;
    this.factsShown = true;
    setSpeech(this.speech, "全量数据！");
    this.sourceTiles.forEach((t) => setTileActive(t, false));

    this.tweens.add({
      targets: [this.uniqueChip, this.downArrow],
      alpha: 0,
      duration: instant ? 0 : 180,
    });

    const facts = [
      {
        value: DATASET.chars.toLocaleString("en-US"),
        label: "字符",
        tip: "shakespeare_char 全文长度",
        accent: C.coral,
      },
      {
        value: String(DATASET.vocab),
        label: "词表",
        tip: `vocab_size = 唯一字符数 = ${VOCAB_SIZE}`,
        accent: C.gold,
      },
      {
        value: DATASET.split,
        label: "切分",
        tip: `train ${DATASET.trainTokens.toLocaleString("en-US")} / val ${DATASET.valTokens.toLocaleString("en-US")}`,
        accent: C.teal,
      },
      {
        value: ".bin",
        label: "产物",
        tip: "train.bin · val.bin · meta.pkl",
        accent: C.blue,
      },
    ];

    const v = this.view;
    const dock = this.layout.slots.dock;
    const fw = this.layout.factW;
    const fh = this.layout.factH;

    facts.forEach((fact, i) => {
      let x;
      let y;
      if (v.portrait) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        x = v.cx + (col === 0 ? -fw / 2 - 6 : fw / 2 + 6);
        y = dock.top + fh / 2 + row * (fh + 10);
      } else {
        x = v.cx + (i - 1.5) * (fw + 12);
        y = dock.cy;
      }
      const chip = makeFactChip(this, x, y, { ...fact, width: fw, height: fh });
      chip.setAlpha(0);
      chip.y += instant ? 0 : 24;
      this.factChips.push(chip);
      this.tweens.add({
        targets: chip,
        alpha: 1,
        y,
        delay: instant ? 0 : i * 80,
        duration: instant ? 0 : 280,
        ease: "Back.Out",
      });
    });

    this.time.delayedCall(instant ? 0 : 360, () => {
      this.nextBtn.setLabel("走起");
      this.nextBtn.setCaption("下一关");
      this.children.bringToTop(this.nextBtn);
      this.busy = false;
    });
  }
}

function layoutLevel1(v, shell) {
  const landscapeShort = v.short && !v.portrait;
  const measured = fitMeasure(shell.content.h, (s) => {
    const tile = Math.round((landscapeShort ? 28 : v.short ? 34 : v.compact ? 40 : 62) * s);
    const chipH = Math.max(tile + 6, Math.round((landscapeShort ? 40 : v.short ? 48 : v.compact ? 56 : 80) * s));
    const gap = Math.max(4, Math.round((v.compact ? 6 : 8) * s));
    const tagH = Math.round(26 * s);
    const srcProbe = flowPositions(CHARS.length, {
      y: 0,
      tileW: tile,
      tileH: tile,
      gapX: gap,
      gapY: gap + 4,
      innerW: v.innerW,
      cx: v.cx,
    });
    const mapProbe = flowPositions(CHARS.length, {
      y: 0,
      tileW: tile,
      tileH: chipH,
      gapX: gap,
      gapY: gap + 6,
      innerW: v.innerW,
      cx: v.cx,
    });
    const srcRows = srcProbe[0]?.rows ?? 1;
    const mapRows = mapProbe[0]?.rows ?? 1;
    const factW = v.portrait ? Math.min(168, (v.innerW - 12) / 2) : Math.min(200, (v.innerW - 36) / 4);
    const factH = Math.round((v.short ? 62 : v.compact ? 70 : 82) * s);
    const uniqueH = Math.round((v.compact ? 68 : 76) * s);
    const dockH = v.portrait ? factH * 2 + 10 : Math.max(factH, uniqueH);
    const mascotH = Math.round((landscapeShort ? 52 : v.short ? 64 : v.compact ? 74 : 90) * s);
    const arrowH = Math.round((landscapeShort ? 36 : 48) * s);
    const sourceH = tagH + 8 + srcRows * tile + Math.max(0, srcRows - 1) * (gap + 4);
    const mapH = tagH + 8 + mapRows * chipH + Math.max(0, mapRows - 1) * (gap + 6);
    const gapY = Math.round((landscapeShort ? 8 : 12) * s);
    const items = [
      { id: "mascot", h: mascotH },
      { id: "source", h: sourceH },
      { id: "arrow", h: arrowH },
      { id: "map", h: mapH },
      { id: "dock", h: dockH },
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
      tile,
      chipH,
      gap,
      tagH,
      factW,
      factH,
      uniqueH,
      srcRows,
      mapRows,
      robotScale: (landscapeShort ? 0.22 : v.short ? 0.26 : v.compact ? 0.3 : 0.38) * Math.min(1, s + 0.15),
    };
  });

  const stacked = stackSlots(measured.items, {
    top: shell.content.top,
    bottom: shell.content.bottom,
    gap: measured.gapY,
    justify: v.portrait ? "distribute" : "center",
  });

  const srcY = stacked.slots.source.top + measured.tagH + 8 + measured.tile / 2;
  const mapY = stacked.slots.map.top + measured.tagH + 8 + measured.chipH / 2;
  const srcPos = flowPositions(CHARS.length, {
    y: srcY,
    tileW: measured.tile,
    tileH: measured.tile,
    gapX: measured.gap,
    gapY: measured.gap + 4,
    innerW: v.innerW,
    cx: v.cx,
  });
  const mapPos = flowPositions(CHARS.length, {
    y: mapY,
    tileW: measured.tile,
    tileH: measured.chipH,
    gapX: measured.gap,
    gapY: measured.gap + 6,
    innerW: v.innerW,
    cx: v.cx,
  });

  return {
    ...measured,
    slots: stacked.slots,
    srcPos,
    mapPos,
  };
}

function speechFor(ch, id, isNew) {
  if (ch === " ") return "空格也算";
  if (ch === "\n") return "换行是 0";
  if (!isNew) return "复用这个";
  const glyph = displayGlyph(ch);
  return `${glyph} → ${id}`;
}
