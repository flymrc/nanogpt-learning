# Agent notes — nanoGPT 闯关 (`game/`)

This repo is a Phaser lesson. Layout bugs on a phone are **your** bugs.
**Do not ask the user to find layout bugs.** If overlaps exist, **fail the PR**.

## Layout modes (hard switch)

- **Mobile:** `width < 1024` or portrait or mobile UA. Shell: `#mobile-chrome` (in-flow) + `#game-shell`. No Live2D. No desktop absolute HUD. No `挪一格` / window-frame overlays on the tape.
- **PC wide:** `width ≥ 1024` and landscape and not a phone UA. Left lesson | right `#tutor-dock` (Live2D only, forehead/hair free). `#mobile-chrome` hidden.

Do not share absolute coordinates, 360px dock widths, or 1080px drawers across modes.

## Before you merge or deploy

1. `cd game && npm run build` must pass.
2. Run the visual E2E below. **If any overlap exists, the PR fails.** Do not merge and do not deploy.
3. Deploy `game/` to `gh-pages` (orphan + `.nojekyll`) **only after E2E passes and the user explicitly asks.**

## E2E visual checks (mandatory)

Use Playwright, Puppeteer, or screenshots. Two viewports, every time you change UI/layout:

| Viewport | What must be true |
| --- | --- |
| **390×844 mobile** | `data-layout=mobile`. `#mobile-chrome` visible. HUD in `#mobile-actions` (not `position: absolute`). `#tutor-dock` hidden. **No Live2D.** Tape / x / y rows do not stack. No floating `挪一格` overlay. |
| **1440×900 PC** | `data-layout=pc`. `#mobile-chrome` hidden. Live2D-only right column, **forehead free**. 详细笔记 drawer covers `#game-shell` only. |

### Overlap rule (zero intersecting interactive boxes)

Bounding boxes of **header, purpose, tabs, body, tape/example (or row-stream / row-x / row-y), CTA** must **not intersect**.

Also required on every layout change:

- Walk at least the **first and last beat** of each level. Also hit tape / x / y / grading-desk beats.
- Open and close **详细笔记** and **看不懂？**
- In-game helper: `window.__nanoGPTAssertLayout()` after `__nanoGPTJump(scene, beat, phase)`. `ok` must be `true`; `overlaps`, `overflows`, and `orphans` must be empty.
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

Helper script: `game/scripts/e2e-layout.mjs`.

## Game facts (do not invent)

shakespeare_char / nanoGPT only: vocab 65, `train.bin`/`val.bin` integer streams, `y = x` shifted by 1, speak loss as 猜错罚分. Chinese UI. One idea per beat. Custom cursor is desktop-only.
