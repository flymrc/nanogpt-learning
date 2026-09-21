# Agent notes — nanoGPT 闯关 (`game/`)

This repo is a Phaser lesson. Layout bugs on a phone are **your** bugs. Do not ask the user to hunt overlaps.

## Layout modes (hard switch)

- **Mobile:** `width < 1024` or portrait or mobile UA. Shell: `#mobile-chrome` (in-flow) + `#game-shell`. No Live2D. No desktop absolute HUD.
- **PC wide:** `width ≥ 1024` and landscape and not a phone UA. Left lesson | right `#tutor-dock` (Live2D only). `#mobile-chrome` hidden.

Do not share absolute coordinates, 360px dock widths, or 1080px drawers across modes.

## Before you merge or deploy

1. `cd game && npm run build` must pass.
2. Run the visual E2E below. **If any overlap exists, the PR fails.** Do not merge and do not deploy.
3. Deploy `game/` to `gh-pages` (orphan + `.nojekyll`) **only after E2E passes and the user asks.**

## E2E visual checks (mandatory)

Use Playwright, Puppeteer, or screenshots. Two viewports, every time you change UI/layout:

| Viewport | What must be true |
| --- | --- |
| **390×844 mobile** | `data-layout=mobile`. `#mobile-chrome` visible. HUD in `#mobile-actions` (not `position: absolute`). `#tutor-dock` hidden. No Live2D column. |
| **1440×900 PC** | `data-layout=pc`. `#mobile-chrome` hidden. Live2D-only right column, forehead/hair free of cards. 详细笔记 drawer covers `#game-shell` only. |

### Overlap rule

Bounding boxes of **header, purpose, tabs, body, tape/example, CTA** must **not intersect**.

- Open/close **详细笔记** and **看不懂？**
- Walk at least the **first and last beat** of Level 1 and Level 2. Also hit tape / x / y / grading-desk beats (the rows that used to stack “挪一格” on the paper tape).
- In-game helper: `window.__nanoGPTAssertLayout()` after `__nanoGPTJump(scene, beat, phase)`. `ok` must be `true`; `overlaps` and `overflows` must be empty.
- Animations must not leave orphan layers on top of content.
- Mobile chips/tags must stay inside the game shell (no horizontal overflow).

A helper script lives at `game/scripts/e2e-layout.mjs` (`npm run e2e` from `game/` after preview is up, or the script starts preview itself).

## Game facts (do not invent)

shakespeare_char / nanoGPT only: vocab 65, `train.bin`/`val.bin` integer streams, `y = x` shifted by 1, speak loss as 猜错罚分. Chinese UI. One idea per beat. Custom cursor is desktop-only.
