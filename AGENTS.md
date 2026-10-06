# Agent notes — nanoGPT 闯关 (`game/`)

## Kid copy, voice and PRs (read first)

- **Kid copy is for an 8-year-old.** Every kid-facing line (`game/src/i18n/zh.js`, `ja.js`, `rag/*`, `embed/*`, the sources `embed/script/zh.md`, `ja.md`, `rag/*.md`, `rag/ja/*.md`, notes and generated strings) stays in the style of a Japanese elementary-school textbook (小学校の教科書): short sentences, everyday words, one idea per line, the 小G / ジーくん story voice. Do not rewrite kid lines into adult or scientific jargon (no パラメータ / 参数记忆, no Q/K in kid lines, no "100 may be rounding" disclaimers, no 约5000次). Precision for adults belongs in the opt-in reader (`?reader=1`), not in the kid lesson.
- **Every narrated kid line has its mp3.** If a `.vo` line changes, regenerate its clip in the same PR with edge-tts like the existing ones (zh-CN-XiaoxiaoNeural / ja-JP-NanamiNeural; `npm run vo`, `scripts/generate-rag-vo.mjs`, `scripts/generate-embed-vo.mjs`). `npm run vo:check` (also run by `npm run i18n` and `npm run e2e`) fails if any page, title or end beat lacks its clip. There is no Web Speech fallback list for kid lines.
- Clips load on demand (boot preloads only BGM and two sound effects). A clip that fails to load falls back to Web Speech for that line, with the same missing-voice behaviour as a clip that is not there.
- **Every change goes through a PR** with `npm run e2e` passing (plus `npm test`, `npm run e2e:regressions` and `npm run e2e:reader`). Put the result lines in the PR. No direct commits to `main`.

## Entry points

- The site root is the Phaser animation home: `index.html` → `src/main.js`, with the Google font tags in `index.html` and Live2D on wide PC. Hash deep links (`#Level2/1/2`, `#Rag5/4/2`, `#Embed2/1/2`) and `?scene=` open the lesson with no other query parameter. Do not make anything else the default.
- `?reader=1` opens the optional adult text reader (`src/learning/`, see `game/LEARNING_MAP.md`). It never starts Phaser or audio and is not linked from the kid home. Keep `npm run e2e:reader` passing.
- Phaser containers have origin 0.5 and Phaser adds `displayOrigin` before the hit test, so a container with `setSize(w, h)` takes `new Phaser.Geom.Rectangle(0, 0, w, h)`, never `(-w / 2, -h / 2, w, h)` (that only answers in the top-left quarter; on 5cf647a most RAG card clicks fell through and advanced the phase). `npm run e2e:regressions` clicks cards, tabs and card cells for real at 1440×900 and 390×844.

This repo is a Phaser lesson. Layout bugs on a phone are **your** bugs.
**Do not ask the user to find layout bugs.** If overlaps exist, **fail the PR**.

The prior `E2E_OK` that only walked first+last beats **missed** a real encode-beat CTA overlap. That class of miss is not allowed again.

A later `E2E_OK` still **missed** local sticker collisions, because the probe only compared big bands (header, purpose, tabs, body, tape, CTA) plus stage-child bounds against the CTA. Phaser `getBounds()` also ignores Graphics, so drop shadows were invisible to the check. That let two live bugs ship: the title tiles for Second sitting on 「一条长纸带」, and the clip-beat ellipsis placeholders stacked on each other and on the first chip, with number labels crushed into the stripe. Do not treat a green big-band run as proof that tiles and chips are clear of each other.

## Layout modes (hard switch)

- **Mobile:** `width < 1024` or portrait or mobile UA. Shell: `#mobile-chrome` (in-flow) + `#game-shell`. No Live2D. No desktop absolute HUD. No `挪一格` / window-frame overlays on the tape.
- **PC wide:** `width ≥ 1024` and landscape and not a phone UA. `#pc-stage` is the lesson only (centered). `#tutor-dock` is a `position: fixed; right: 0` overlay and does not take flex width. Transparent, no sidebar fill. Forehead and hair stay clear of notes and mute. `#mobile-chrome` hidden. While the tutor is visible the lesson stays at least `min(1160, viewport − 334)` — the width it had on main. If a panel wide enough for the girl at 90% of the viewport height would push the lesson under that width, hide the dock and the canvas and set `--tutor-reserve: 0` so the lesson uses the full `min(1160, viewport)` and is centered in the viewport (`|left gap − right gap| ≤ 2`). The page background matches the lesson sky (`#f6efe4` → `#ead6c4`) so those gaps are not a flat leftover strip.

Live2D (wide PC only): the visible mesh is always **90%** of her side panel, centered in that panel, feet about 6px above the bottom. No intermediate scale. Panel width is the mesh width at that height plus 16px, then a 6px right gap and 16px before the lesson (`reserve ≈ 0.90 × height × mesh aspect + 38px`; the measured aspect is about 0.32). She hides when that reserve exceeds `viewport − min(1160, viewport − 334)`. At 1080px tall the reserve is about 350px, so she hides below about **1510px** wide. She is shown again only after the spare reserve grows by **32px** (about **1542px** wide at 1080px tall) so the dock does not flicker on the boundary. `document.documentElement.dataset.tutor` is `shown` or `hidden`. When it is `hidden`, the lesson column is centered and neither the dock nor a differently tinted strip remains. A resize from shown to hidden and back must not leave a stale offset.

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

Home is the first screen at the site root. Also check it at **390×844, 1024×522, 1024×640, 1440×900, and 1920×1080**, in zh and ja: no overlaps, card text stays inside the cards, Live2D does not cover the cards, the nanoGPT card opens the chapter menu, **首页 / ホーム** returns, and the disabled RAG card does nothing. Deep links (`#Level2/1/2`, `?scene=`) and saved lesson progress still open the tutorial. This home pass is extra; the 245-step mobile walk and the 49 PC pages stay required.

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
- **Language** toggle (`nanogpt-lang`, `zh` | `ja`) persists across reload. Japanese UI and the voice note follow `ja`. Core page lines play their own pre-generated mp3 in both `zh` and `ja` (Web Speech only when that clip fails to load, with the missing-voice tip for `ja`). The steps panel, home greeting and catalog lines use Web Speech.
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

Helper script: `game/scripts/e2e-layout.mjs`. It must walk 245 mobile steps (49×5) and 49 PC pages, and open the steps panel on encode / shift / loss / attention / train / sample. The Live2D fit walk covers 8 viewports × both locales × all 49 pages. At each size the girl is either visible at 88–92% of the panel height with the lesson at least `min(1160, viewport − 334)`, or hidden with the lesson at the full `min(1160, viewport)`. The same run resizes across the hide threshold in both directions, including the 32px slack band. The same run also walks the embedding course: 40 pages × 5 phases × zh/ja on 390×844, and 40 pages × zh/ja on 1440×900 and 1024×640.

## i18n

Lesson copy is not inline in the scenes.

- `game/src/i18n/skeleton.js` is the locale-independent page list: page id, visual type, real numbers, real English book text such as `First Citizen:`, and the key for every visible string. Per-locale example slots (the script’s 【本地化图：zh】 / 【ローカライズ画像：ja】) live on the page as `exampleSlots.zh` and `exampleSlots.ja`.
- `game/src/i18n/zh.js` and `game/src/i18n/ja.js` hold every visible string and every voice line, under the same keys. Japanese is the kid-script text, not a translation of the Chinese file. The Chinese chapter-1 intro example is 「床前明月＿」→ 光, and the 🍎🍌 row stays. Japanese keeps its own calendar example.
- `game/scripts/i18n-parity.mjs` fails if a key is missing on either side, a value is empty, or a skeleton page points at a key that does not exist. `npm run e2e` runs this check first.
- The language switch swaps text, the example slot, and the voice. Every `.vo` line has its own mp3 per language, named by the hash of its current text (`vo-manifest.json`, `rag-vo-manifest.json`, `embed-vo-manifest.json`). Never point a line at a clip recorded for different text.

## Game facts (do not invent)

shakespeare_char / nanoGPT only: vocab 65, `train.bin`/`val.bin` integer streams, `y = x` shifted by 1, speak the penalty as 扣分 (Japanese てんすう). UI follows `zh` or `ja`. One idea per page. Custom cursor is desktop-only. Confidence and penalty charts are labelled 示意 / イメージ図 and do not invent loss numbers or generated samples.

## RAG tutorial (Hotel Hoshi)

Second course, same shell. Story: 小G / ジーくん at the front desk, 12-card handbook. Spine is **60 pages** (5 chapters × 12: intro, pages 1–9, summary, ふりかえろう) × 5 phases. Quizzes are the intro and pages 1–9 only (10 per chapter). Scenes: `RagTitle`, `Rag1`–`Rag5`, `RagEnd`. `setCourse("rag")` is the first line of each RAG scene `create()`, before `t()`.

- Copy lives in `game/src/i18n/rag/` (`skeleton.js`, `zh.js`, `ja.js`), generated by `game/scripts/build-rag-lesson.mjs` from `rag/` chapters. Do not hand-edit the generated files. zh uses `rag/demo/results_zh.json`; ja uses `rag/demo/results.json`. Every number on a picture is copied from that JSON (`score_x100`, word counts, 384). The word-match line is 10. The meaning line is per locale, copied from that file's `no_card_threshold.meaning` (zh 30, ja 20). Do not recompute retrieval. Some chapter 3, 4, and 5 pictures differ by locale on purpose. `rag/verify_ja_scores.py` checks every ja 「Nてん」 against `rag/demo/results.json`; the lesson builder and `npm run e2e` run it.
- Home RAG card is `status: "ready"` and opens `RagTitle`. Guide seen-key is `nanogpt-seen-guide-rag`, separate from nanoGPT.
- `npm run e2e` walks every RAG page on mobile (all 5 phases), pc 1440×900, and pc 1024×640, in zh and ja, with empty overlaps. The nanoGPT 245 / 49 / 49 walks still run.
- Round-5 refusal line stays: 「我不知道。我没找到分数过线的卡片。请问问酒店的工作人员。」 / `I don't know. I found no card with a score over the line. Please ask a hotel staff member.` Do not bring back 随便猜, 手册里没有对得上的页, or 最高分比线还低，就是手册里没有. The card box is not called 记忆.

## Embedding tutorial (word vectors)

Third course, same shell, sequel to Hotel Hoshi. Story: 小G / ジーくん opens the blue-hat window and watches a word become a row of 384 numbers. Spine is **40 pages** (5 chapters × 8: intro, pages 1–5, summary, ふりかえろう) × 5 phases. Scenes: `EmbedTitle`, `Embed1`–`Embed5`, `EmbedEnd`. `setCourse("embed")` is the first line of each embedding scene `create()`, before `t()`. Progress keys are `embed1.progress` … `embed5.progress`. Guide seen-key is `nanogpt-seen-guide-embed`.

- Script sources live in `embed/script/` and `embed/demo/` (including `results.json`). Copy in `game/src/i18n/embed/` is generated by `game/scripts/build-embed-lesson.mjs`. Do not hand-edit the generated files. Every score is copied from `embed/demo/results.json` (`score_x100`, rounded cosine × 100). zh and ja both cite the same-model RAG numbers (`rag/demo/results_zh.json` and `rag/demo/results.json`). Old all-MiniLM scores 45 / 71 / 83 / 37 must not return as てん. Kids see integers only.
- 【小G的话】 / 【ジーくんのことば】 is the `talk` beat. It is shown on the picture plate and appended to the look-phase text. It is not a sixth phase.
- Home has a third ready card (`id: "embed"`, art `map`) that opens `EmbedTitle`. On a wide lesson the three cards sit in one row.
- Voice clips are `public/audio/vo-embed/{zh,ja}/`, edge-tts zh-CN-XiaoxiaoNeural / ja-JP-NanamiNeural, same rates as RAG. `npm run e2e` walks every embedding page on mobile (all 5 phases), pc 1440×900, and pc 1024×640, in zh and ja, with empty stage overlaps. The nanoGPT 245 / 49 / 49 walks and the RAG walks still run.
- The map is drawn from `map_2d` (separate axis scales, Y flipped). Each label sits near its projected point, with a leader line. On a phone, tapping a group zooms that cluster so the labels fit. The lasso stays inside the paper and around that group. `npm run e2e` fails if a label is more than 176px from its dot or a lasso leaves the picture. Colour strips use the first eight normalized numbers. The ruler marks are 100 / 50 / 0, not a straight degree scale. Do not print degree decimals, raw lengths, or variance percents. PCA variance is 「不到一半」 / 「半分より 少ない」.
