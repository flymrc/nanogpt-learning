# Agent notes — nanoGPT 闯关 (`game/`)

This repo is a Phaser lesson. Layout bugs on a phone are **your** bugs.
**Do not ask the user to find layout bugs.** If overlaps exist, **fail the PR**.

The prior `E2E_OK` that only walked first+last beats **missed** a real encode-beat CTA overlap. That class of miss is not allowed again.

A later `E2E_OK` still **missed** local sticker collisions, because the probe only compared big bands (header, purpose, tabs, body, tape, CTA) plus stage-child bounds against the CTA. Phaser `getBounds()` also ignores Graphics, so drop shadows were invisible to the check. That let two live bugs ship: the title tiles for Second sitting on 「一条长纸带」, and the clip-beat ellipsis placeholders stacked on each other and on the first chip, with number labels crushed into the stripe. Do not treat a green big-band run as proof that tiles and chips are clear of each other.

## Layout modes (hard switch)

- **Mobile:** `width < 1024` or portrait or mobile UA. Shell: `#mobile-chrome` (in-flow) + `#game-shell`. No Live2D. No desktop absolute HUD. No `挪一格` / window-frame overlays on the tape.
- **PC wide:** `width ≥ 1024` and landscape and not a phone UA. `#pc-stage` is the lesson only (centered). `#tutor-dock` is a `position: fixed; right: 0` overlay and does not take flex width. Transparent, no sidebar fill. Forehead and hair stay clear of notes and mute. `#mobile-chrome` hidden. While the tutor is visible the lesson stays at least `min(1160, viewport − 334)` — the width it had on main. If a panel wide enough for the girl at 90% of the viewport height would push the lesson under that width, hide the dock and the canvas and set `--tutor-reserve: 0` so the lesson uses the full `min(1160, viewport)`, the same width as the no-Live2D layout.

Live2D (wide PC only): the visible mesh is always **90%** of her side panel, centered in that panel, feet about 6px above the bottom. No intermediate scale. Panel width is the mesh width at that height plus 16px, then a 6px right gap and 16px before the lesson (`reserve ≈ 0.90 × height × mesh aspect + 38px`; the measured aspect is about 0.32). She hides when that reserve exceeds `viewport − min(1160, viewport − 334)`. At 1080px tall that cutoff is about **1508px** wide. She is shown again only after the spare reserve grows by **32px** (about **1540px** wide at 1080px tall) so the dock does not flicker on the boundary. `document.documentElement.dataset.tutor` is `shown` or `hidden`.

Do not share absolute coordinates, 360px dock widths, or 1080px drawers across modes.

On mobile, the CTA is pinned in the footer. **Every Phaser label / bar / chip must stay ≥12px above the CTA.** Do not draw 「按字符编号」 (or any fact bar) through the pink button.

## Before you merge or deploy

1. `cd game && npm run build` must pass.
2. Run the visual E2E below. **If any overlap exists, the PR fails.** Do not merge and do not deploy.
3. Deploy `game/` to `gh-pages` (orphan + `.nojekyll`) **only after E2E passes and the user explicitly asks.**

## E2E visual checks (mandatory)

**First+last only is NOT enough; all beats are required.**

Use Playwright, Puppeteer, or screenshots. Two viewports, every time you change UI/layout:

| Viewport | What must be true |
| --- | --- |
| **390×844 mobile** | Walk **all 49 pages × all 5 sections** (目标 / 看看 / 做做 / 小结 / 试试, Japanese めあて / 見て / やって / まとめ / 確認). Counts: each chapter is an intro, then 9 / 9 / 7 / 7 / 7 pages, then a summary, so chapter 1 = 11, chapter 2 = 11, chapter 3 = 9, chapter 4 = 9, chapter 5 = 9, **245** mobile steps. `data-layout=mobile`. `#mobile-chrome` visible. HUD in `#mobile-actions`. `#tutor-dock` hidden. **No Live2D.** No floating `挪一格`. |
| **1440×900 PC** | Smoke **all 49 pages** at least once (做一做 section is enough if slow). Lesson fills `#pc-stage`. Live2D is a fixed overlay on the viewport’s right, **forehead free**, no gray sidebar. The girl is 90% of the panel height and the lesson stays at least `min(1160, viewport − 334)`. |

### Overlap rule (zero intersecting interactive boxes)

Bounding boxes of **header, purpose, tabs, body, tape/example (or row-stream / row-x / row-y), CTA** must **not intersect**.

Also required:

- Check **HTML chrome vs each other AND vs Phaser canvas labels/bars**. Sample every `stage` child against the CTA box. Fail if the CTA intersects any lesson label/bar (the 「按字符编号」-on-button bug).
- **Local sticker boxes, not just big bands.** Measure each tile, chip, placeholder, and card from its layout size plus the drop shadow (`+5` right, `+8` down), not from Phaser `getBounds()`. Fail when:
  - a tile, chip, placeholder, or card comes within 12px of a caption or label (the Second / 「一条长纸带」 bug, shadows included);
  - any two of those pieces intersect, including chip-vs-chip and placeholder-vs-placeholder;
  - a placeholder intersects the first real chip (ellipsis tiles piled on S);
  - a 号码牌 is under 32×40, its number font is under 12px, or the number intersects the glyph or the bottom stripe.
- Also assert the title scene. The 245-step mobile walk (49×5) and the 49 PC pages stay required; the title check is extra, not a substitute.
- Open and close **详细笔记** and **看不懂？**
- **导读** shows once on a fresh profile (`nanogpt-seen-guide` unset), stays hidden after dismiss + reload, and reopens from **目录**.
- **目录** lists 5 chapters (把字变成数字 / 猜下一个字，看猜错多少 / 只能看前面的字 / 一次改一点点 / 小G 自己往下写). Short buttons stay 变数字 / 猜下一个 / 看前面 / 改一点 / 往下写 (Japanese 数字に / 次を当てる / 前だけ / 少し直す / 続きを書く). In-lesson headers use the same chapter titles as the kid script. Every chapter starts at page 0 and can be revisited. **返回** steps to the previous section, then the previous page, then the previous chapter.
- **Language** toggle (`nanogpt-lang`, `zh` | `ja`) persists across reload. Japanese UI and the voice note follow `ja`. Core page lines and the steps panel are narrated with Web Speech in both `zh` and `ja` (no pre-recorded lesson mp3s).
- `window.__nanoGPTAssertLayout()` after `__nanoGPTJump(scene, beat, phase)`. `ok` must be `true`; `overlaps`, `overflows`, and `orphans` must be empty.
- Animations must not leave orphan layers on top of content.
- Mobile chips/tags must stay inside the game shell (no horizontal overflow).
- Fail the PR if any of the above is false. Do not ask the user to screenshot a bug.

```bash
cd game
npm run build
npx vite preview --host 127.0.0.1 --port 4182
# other terminal:
E2E_URL=http://127.0.0.1:4182/ E2E_OUT=/tmp/nanogpt-e2e npm run e2e
```

Helper script: `game/scripts/e2e-layout.mjs`. It must walk 245 mobile steps (49×5) and 49 PC pages, and open the steps panel on encode / shift / loss / attention / train / sample. The Live2D fit walk covers 8 viewports × both locales × all 49 pages. At each size the girl is either visible at 88–92% of the panel height with the lesson at least `min(1160, viewport − 334)`, or hidden with the lesson at the full `min(1160, viewport)`. The same run resizes across the hide threshold in both directions, including the 32px slack band.

## i18n

Lesson copy is not inline in the scenes.

- `game/src/i18n/skeleton.js` is the locale-independent page list: page id, visual type, real numbers, real English book text such as `First Citizen:`, and the key for every visible string. Per-locale example slots (the script’s 【本地化图：zh】 / 【ローカライズ画像：ja】) live on the page as `exampleSlots.zh` and `exampleSlots.ja`.
- `game/src/i18n/zh.js` and `game/src/i18n/ja.js` hold every visible string and every voice line, under the same keys. Japanese is the kid-script text, not a translation of the Chinese file. The Chinese chapter-1 intro example is 「床前明月＿」→ 光, and the 🍎🍌 row stays. Japanese keeps its own calendar example.
- `game/scripts/i18n-parity.mjs` fails if a key is missing on either side, a value is empty, or a skeleton page points at a key that does not exist. `npm run e2e` runs this check first.
- The language switch swaps text, the example slot, and Web Speech. New lines are spoken with Web Speech in both zh and ja. Do not point voice lines at the old Chinese mp3 clips.

## Game facts (do not invent)

shakespeare_char / nanoGPT only: vocab 65, `train.bin`/`val.bin` integer streams, `y = x` shifted by 1, speak the penalty as 扣分 (Japanese てんすう). UI follows `zh` or `ja`. One idea per page. Custom cursor is desktop-only. Confidence and penalty charts are labelled 示意 / イメージ図 and do not invent loss numbers or generated samples.
