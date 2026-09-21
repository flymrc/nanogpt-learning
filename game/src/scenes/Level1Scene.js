import Phaser from "phaser";
import {
  DATASET,
  DEMO_IDS,
  DEMO_SNIPPET,
  VOCAB_SIZE,
  displayGlyph,
} from "../data/facts.js";
import {
  addAdvanceHint,
  addHeader,
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
  rowPositions,
  setTileActive,
} from "../ui/components.js";
import { addRobot, addScrollBuddy, addSpeechBubble, setSpeech } from "../ui/mascot.js";
import { C, H, W, displayText } from "../ui/theme.js";

const CHARS = [...DEMO_SNIPPET];

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1");
  }

  create() {
    paintBackdrop(this);
    addHeader(this, { level: 1, total: 2, title: "字符变 ID" });

    addRobot(this, 86, 168, { scale: 0.58 });
    addScrollBuddy(this, 168, 178, { scale: 0.42 });
    this.speech = addSpeechBubble(this, 340, 132, "点它变数字");

    makeTag(this, 88, 230, "原文", C.pink);
    const srcPos = rowPositions(CHARS.length, 286, 62, 8);
    this.sourceTiles = CHARS.map((ch, i) =>
      makeCharTile(this, srcPos[i].x, srcPos[i].y, displayGlyph(ch), { seed: ch }),
    );

    this.downArrow = makeArrow(this, W / 2, 348, { angle: 90, color: C.coral, label: "" });

    makeTag(this, 88, 400, "id", C.gold);
    this.mapPos = rowPositions(CHARS.length, 456, 62, 8);
    this.mappedChips = new Array(CHARS.length).fill(null);

    this.uniqueChip = makeFactChip(this, W / 2, 568, {
      value: "★ 0",
      label: "本段唯一",
      tip: "重复字母共用同一个 id",
      accent: C.gold,
      width: 180,
      height: 78,
    });
    this.nextBtn = createButton(this, W - 170, H - 64, "下一步", () => this.advance(), {
      width: 220,
      height: 64,
    });
    this.nextBtn.setDepth(20);
    this.hint = addAdvanceHint(this);
    this.hint.setDepth(20);

    this.step = 0;
    this.busy = false;
    this.factsShown = false;
    this.uniqueSeen = new Set();
    this.factChips = [];

    bindAdvance(this, () => this.advance());
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

    const flyer = makeCharTile(this, tile.x, tile.y, displayGlyph(ch), {
      width: 56,
      height: 56,
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
        burstStars(this, to.x, to.y);
        const chip = makeChip(this, to.x, to.y, {
          glyph: displayGlyph(ch),
          id,
          accent: isNew ? C.teal : C.blue,
          width: 60,
          height: 80,
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
    const texts = this.uniqueChip.list.filter((child) => child.type === "Text");
    if (texts[0]) texts[0].setText(`★ ${n}`);
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

  showFacts() {
    this.busy = true;
    this.factsShown = true;
    setSpeech(this.speech, "全量数据！");
    this.sourceTiles.forEach((t) => setTileActive(t, false));

    this.tweens.add({
      targets: [this.uniqueChip, this.downArrow],
      alpha: 0,
      duration: 180,
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

    facts.forEach((fact, i) => {
      const chip = makeFactChip(this, 170 + i * 230, 562, { ...fact, width: 200, height: 86 });
      chip.setAlpha(0);
      chip.y += 24;
      this.factChips.push(chip);
      this.tweens.add({
        targets: chip,
        alpha: 1,
        y: 562,
        delay: i * 80,
        duration: 280,
        ease: "Back.Out",
      });
    });

    this.time.delayedCall(360, () => {
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
