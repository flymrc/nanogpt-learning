# Agent notes — nanoGPT 闯关 (`game/`)

This repo is a Phaser lesson. Layout bugs on a phone are **your** bugs.
**Do not ask the user to find layout bugs.** If overlaps exist, **fail the PR**.

The prior `E2E_OK` that only walked first+last beats **missed** a real encode-beat CTA overlap. That class of miss is not allowed again.

A later `E2E_OK` still **missed** local sticker collisions, because the probe only compared big bands (header, purpose, tabs, body, tape, CTA) plus stage-child bounds against the CTA. Phaser `getBounds()` also ignores Graphics, so drop shadows were invisible to the check. That let two live bugs ship: the title tiles for Second sitting on 「一条长纸带」, and the clip-beat ellipsis placeholders stacked on each other and on the first chip, with number labels crushed into the stripe. Do not treat a green big-band run as proof that tiles and chips are clear of each other.

## Layout modes (hard switch)

- **Mobile:** `width < 1024` or portrait or mobile UA. Shell: `#mobile-chrome` (in-flow) + `#game-shell`. No Live2D. No desktop absolute HUD. No `挪一格` / window-frame overlays on the tape.
- **PC wide:** `width ≥ 1024` and landscape and not a phone UA. `#pc-stage` is the lesson only (centered). `#tutor-dock` is a `position: fixed; right: 0` overlay and does not take flex width, so hiding it does not move the lesson. Transparent, no sidebar fill. Forehead and hair stay clear of notes and mute. `#mobile-chrome` hidden.

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
| **390×844 mobile** | Walk **all 31 beats × all 5 tabs** (这一步 / 为什么 / 例子 / 误会 / 记住). Counts: chapter 1 = 5, chapter 2 = 8, chapter 3 attention = 6, chapter 4 train = 6, chapter 5 sample = 6, so **155** mobile steps. `data-layout=mobile`. `#mobile-chrome` visible. HUD in `#mobile-actions`. `#tutor-dock` hidden. **No Live2D.** No floating `挪一格`. |
| **1440×900 PC** | Smoke **all 31 beats** at least once (example tab is enough if slow). Lesson fills `#pc-stage`. Live2D is a fixed overlay on the viewport’s right, **forehead free**, no gray sidebar, and does not change the lesson width. |

### Overlap rule (zero intersecting interactive boxes)

Bounding boxes of **header, purpose, tabs, body, tape/example (or row-stream / row-x / row-y), CTA** must **not intersect**.

Also required:

- Check **HTML chrome vs each other AND vs Phaser canvas labels/bars**. Sample every `stage` child against the CTA box. Fail if the CTA intersects any lesson label/bar (the 「按字符编号」-on-button bug).
- **Local sticker boxes, not just big bands.** Measure each tile, chip, placeholder, and card from its layout size plus the drop shadow (`+5` right, `+8` down), not from Phaser `getBounds()`. Fail when:
  - a tile, chip, placeholder, or card comes within 12px of a caption or label (the Second / 「一条长纸带」 bug, shadows included);
  - any two of those pieces intersect, including chip-vs-chip and placeholder-vs-placeholder;
  - a placeholder intersects the first real chip (ellipsis tiles piled on S);
  - a 号码牌 is under 32×40, its number font is under 12px, or the number intersects the glyph or the bottom stripe.
- Also assert the title scene. The 155-step mobile walk (31×5) and the 31 PC beats stay required; the title check is extra, not a substitute.
- Open and close **详细笔记** and **看不懂？**
- **导读** shows once on a fresh profile (`nanogpt-seen-guide` unset), stays hidden after dismiss + reload, and reopens from **目录**.
- **目录** lists 5 chapters (纸带和号码 / 剪开猜下一个 / 只看左边 / 按罚分改一笔 / 从开头往后续). Short buttons stay 纸带 / 猜下一个 / 看左边 / 改一改 / 往后写. In-lesson headers use those same chapter titles. Every chapter starts at beat 0 and can be revisited. **返回** steps to the previous phase, then the previous beat, then the previous chapter.
- **Language** toggle (`nanogpt-lang`, `zh` | `ja`) persists across reload. Japanese UI and the voice note follow `ja`. Core beat lines and 伪代码 open are narrated (existing Chinese clips when `zh` and a clip exists; Web Speech otherwise, including all Japanese).
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

Helper script: `game/scripts/e2e-layout.mjs`. It must walk 155 mobile steps (31×5) and 31 PC beats, and open 伪代码 on encode / shift / loss / attention / train / sample.

## Game facts (do not invent)

shakespeare_char / nanoGPT only: vocab 65, `train.bin`/`val.bin` integer streams, `y = x` shifted by 1, speak loss as 猜错罚分. Chinese UI. One idea per beat. Custom cursor is desktop-only.
