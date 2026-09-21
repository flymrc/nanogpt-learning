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
  addAdvanceHint,
  addHeader,
  addMuteToggle,
  bindAdvance,
  burstStars,
  createButton,
  makeArrow,
  makeCharTile,
  makeChip,
  makeFactChip,
  makeTag,
  paintBackdrop,
  pulseChip,
  setTileActive,
} from "../ui/components.js";
import { addRobot, addScrollBuddy, addSpeechBubble, setSpeech } from "../ui/mascot.js";
import { TAP_MIN, flowPositions, getView, watchResize } from "../ui/layout.js";
import { C, displayText } from "../ui/theme.js";

const CHARS = [...DEMO_SNIPPET];

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1");
  }

  create() {
    const v = getView(this);
    this.view = v;
    paintBackdrop(this);
    addHeader(this, { level: 1, total: 2, title: "字符变 ID" });

    const robotScale = v.short ? 0.26 : v.compact ? 0.3 : 0.38;
    const robotX = v.left + (v.compact ? 36 : 56);
    const robotY = v.padTop + (v.short ? 92 : v.compact ? 118 : 168);
    addRobot(this, robotX, robotY, { scale: robotScale });
    if (!v.compact) addScrollBuddy(this, robotX, robotY + 54, { scale: 0.28 });
    this.speech = addSpeechBubble(
      this,
      robotX + (v.short && !v.portrait ? 210 : v.compact ? 148 : 158),
      robotY - (v.short && !v.portrait ? 8 : v.compact ? 32 : 50),
      "点它变数字",
      { maxWidth: v.compact ? 168 : 220 },
    );
    addMuteToggle(this);
    cueVoice(this, "vo-level1");

    const tile = v.short ? 34 : v.compact ? 40 : 62;
    const chipH = v.short ? 44 : v.compact ? 52 : 80;
    const gap = v.compact ? 6 : 8;
    const sourceY = v.padTop + v.innerH * (v.portrait ? 0.24 : 0.28);
    makeTag(this, v.left + 40, sourceY - tile * 0.7, "原文", C.pink);
    const srcPos = flowPositions(CHARS.length, {
      y: sourceY,
      tileW: tile,
      tileH: tile,
      gapX: gap,
      gapY: gap + 4,
      innerW: v.innerW,
      cx: v.cx,
    });
    this.tileSize = tile;
    this.chipH = chipH;
    this.sourceTiles = CHARS.map((ch, i) =>
      makeCharTile(this, srcPos[i].x, srcPos[i].y, displayGlyph(ch), {
        width: tile,
        height: tile,
        seed: ch,
      }),
    );

    const srcRows = srcPos[0]?.rows ?? 1;
    const arrowY = sourceY + srcRows * (tile + gap + 4) + 18;
    this.downArrow = makeArrow(this, v.cx, arrowY, { angle: 90, color: C.coral, label: "" });

    const mapY = arrowY + 56;
    makeTag(this, v.left + 40, mapY - chipH * 0.55, "id", C.gold);
    this.mapPos = flowPositions(CHARS.length, {
      y: mapY,
      tileW: tile,
      tileH: chipH,
      gapX: gap,
      gapY: gap + 6,
      innerW: v.innerW,
      cx: v.cx,
    });
    this.mappedChips = new Array(CHARS.length).fill(null);

    const mapRows = this.mapPos[0]?.rows ?? 1;
    const uniqueY = Math.min(
      v.bottom - (v.portrait ? 168 : 118),
      mapY + mapRows * (chipH + gap + 6) + 40,
    );
    this.uniqueChip = makeFactChip(this, v.cx, uniqueY, {
      value: "★ 0",
      label: "本段唯一",
      tip: "重复字母共用同一个 id",
      accent: C.gold,
      width: Math.min(180, v.innerW - 40),
      height: v.compact ? 70 : 78,
    });

    const btnW = Math.min(v.portrait ? v.innerW - 20 : 220, 280);
    const btnH = Math.max(TAP_MIN, 60);
    this.nextBtn = createButton(
      this,
      v.portrait ? v.cx : v.right - btnW / 2,
      v.bottom - 36,
      "下一步",
      () => this.advance(),
      { width: btnW, height: btnH },
    );
    this.nextBtn.setDepth(20);
    this.hint = addAdvanceHint(this);
    this.hint.setDepth(20);

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
      .text(chip.x, chip.y - 50, "复用", displayText(20, { color: C.coralCss }))
      .setOrigin(0.5)
      .setScale(0.4);
    this.tweens.add({
      targets: stamp,
      scale: 1,
      y: chip.y - 58,
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
    const fw = v.portrait ? Math.min(168, (v.innerW - 12) / 2) : Math.min(200, (v.innerW - 36) / 4);
    const fh = v.short ? 64 : v.compact ? 74 : 86;
    const factY = v.bottom - (v.portrait ? 196 : 118);

    facts.forEach((fact, i) => {
      let x;
      let y;
      if (v.portrait) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        x = v.cx + (col === 0 ? -fw / 2 - 6 : fw / 2 + 6);
        y = factY + row * (fh + 10);
      } else {
        x = v.cx + (i - 1.5) * (fw + 12);
        y = factY;
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
      this.hint.setText("下一关");
      this.children.bringToTop(this.nextBtn);
      this.children.bringToTop(this.hint);
      this.busy = false;
    });
  }
}

function speechFor(ch, id, isNew) {
  if (ch === " ") return "空格也算";
  if (ch === "\n") return "换行是 0";
  if (!isNew) return "复用这个";
  const glyph = displayGlyph(ch);
  return `${glyph} → ${id}`;
}
