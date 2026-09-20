import Phaser from "phaser";
import {
  DATASET,
  DEMO_IDS,
  DEMO_SNIPPET,
  VOCAB_SIZE,
  displayGlyph,
  displayLabel,
} from "../data/facts.js";
import {
  addAdvanceHint,
  addCaption,
  addHeader,
  bindAdvance,
  createButton,
  makeCharTile,
  makeChip,
  makePanel,
  paintBackdrop,
  pulseChip,
  rowPositions,
  setCaption,
  setTileActive,
} from "../ui/components.js";
import { C, H, W, monoText, uiText } from "../ui/theme.js";

const CHARS = [...DEMO_SNIPPET];

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super("Level1");
  }

  create() {
    paintBackdrop(this);
    addHeader(this, { level: 1, total: 2, title: "字符变 ID（prepare）" });

    this.caption = addCaption(
      this,
      "语言模型吃整数，不是原文。prepare.py 把每个字符映射成 id（不用 BPE）。",
    );

    this.add
      .text(64, 168, "演示原文（短句，便于看清动画）", uiText(16, { color: C.muted }))
      .setOrigin(0, 0.5);

    const srcPos = rowPositions(CHARS.length, 218, 62, 8);
    this.sourceTiles = CHARS.map((ch, i) =>
      makeCharTile(this, srcPos[i].x, srcPos[i].y, displayGlyph(ch)),
    );

    this.add
      .text(64, 292, "encode → 整数序列（重复字符复用同一 id）", uiText(16, { color: C.muted }))
      .setOrigin(0, 0.5);

    this.mapPos = rowPositions(CHARS.length, 368, 62, 8);
    this.mappedChips = new Array(CHARS.length).fill(null);

    this.uniqueSeen = new Set();
    this.uniqueLabel = this.add
      .text(W / 2, 458, "本段已见唯一字符：0", uiText(20, { color: C.goldCss }))
      .setOrigin(0.5);

    this.vocabHint = this.add
      .text(W / 2, 492, "完整数据的词表大小 = 唯一字符数（后面一页给出实测数字）", uiText(16, { color: C.muted }))
      .setOrigin(0.5);

    this.nextBtn = createButton(this, W - 180, H - 68, "下一步", () => this.advance(), {
      width: 200,
    });
    this.nextBtn.setDepth(20);
    this.hint = addAdvanceHint(this);
    this.hint.setDepth(20);

    this.step = 0;
    this.busy = false;
    this.factsShown = false;

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

    setCaption(this.caption, captionFor(ch, id, isNew, this.uniqueSeen.size));

    const from = { x: tile.x, y: tile.y };
    const to = this.mapPos[index];
    const flyer = this.add
      .text(from.x, from.y, displayGlyph(ch), monoText(26, { fontStyle: "700", color: C.tealCss }))
      .setOrigin(0.5);

    this.tweens.add({
      targets: flyer,
      x: to.x,
      y: to.y,
      scale: 1.15,
      duration: 420,
      ease: "Cubic.Out",
      onComplete: () => {
        flyer.destroy();
        const chip = makeChip(this, to.x, to.y, {
          glyph: displayGlyph(ch),
          id,
          accent: isNew ? C.teal : C.blue,
          width: 62,
          height: 78,
        });
        chip.setScale(0.7);
        chip.setAlpha(0);
        this.mappedChips[index] = chip;
        this.tweens.add({
          targets: chip,
          scale: 1,
          alpha: 1,
          duration: 220,
          ease: "Back.Out",
        });

        if (!isNew) {
          const first = CHARS.indexOf(ch);
          if (this.mappedChips[first]) pulseChip(this, this.mappedChips[first]);
        }

        this.uniqueLabel.setText(`本段已见唯一字符：${this.uniqueSeen.size}`);

        if (index === CHARS.length - 1) {
          this.vocabHint.setText(`词表大小 = 唯一字符数。本段演示 ${this.uniqueSeen.size} 个；完整 shakespeare_char 是 ${VOCAB_SIZE}。`);
          this.time.delayedCall(180, () => {
            this.busy = false;
          });
        } else {
          this.busy = false;
        }
        this.step += 1;
      },
    });
  }

  showFacts() {
    this.busy = true;
    this.factsShown = true;
    setCaption(this.caption, "映射做完了。下面是 prepare.py 对完整数据集的实测事实（不是本局演示子集）。");

    this.sourceTiles.forEach((t) => setTileActive(t, false));
    this.tweens.add({
      targets: [this.uniqueLabel, this.vocabHint],
      alpha: 0,
      duration: 200,
    });

    const panel = makePanel(this, 500, 524, 880, 136);
    panel.setAlpha(0);
    panel.y += 24;
    panel.setDepth(5);

    const title = this.add
      .text(-420, -48, "完整 shakespeare_char（prepare.py）", uiText(18, { color: C.tealCss, fontStyle: "700" }))
      .setOrigin(0, 0.5);

    const body = [
      `长度 ${DATASET.chars.toLocaleString("en-US")} 字符　·　vocab_size = ${DATASET.vocab}`,
      `切分 ${DATASET.split}　→　train ${DATASET.trainTokens.toLocaleString("en-US")} / val ${DATASET.valTokens.toLocaleString("en-US")} tokens`,
      "写出 train.bin、val.bin（uint16 id）和 meta.pkl（vocab_size + stoi / itos）",
    ];
    const lines = body.map((line, i) =>
      this.add.text(-420, -14 + i * 28, line, uiText(17)).setOrigin(0, 0.5),
    );

    panel.add([title, ...lines]);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      y: 524,
      duration: 360,
      ease: "Cubic.Out",
      onComplete: () => {
        this.nextBtn.setLabel("明白了");
        this.hint.setText("点「明白了」进入第 2 关");
        this.children.bringToTop(this.nextBtn);
        this.children.bringToTop(this.hint);
        this.busy = false;
      },
    });
  }
}

function captionFor(ch, id, isNew, uniqueCount) {
  const label = displayLabel(ch);
  if (ch === " ") {
    return `空格也是字符：stoi[' '] = ${id}。本段唯一 ${uniqueCount}。`;
  }
  if (ch === "\n") {
    return `换行 \\n 也在词表里（id 0）。本段唯一 ${uniqueCount}。`;
  }
  if (!isNew) {
    return `「${label}」再次出现，复用 id ${id}，词表不膨胀。本段唯一仍是 ${uniqueCount}。`;
  }
  return `stoi['${label}'] = ${id}。本段已见 ${uniqueCount} 个不同字符。`;
}
