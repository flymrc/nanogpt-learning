# Cartoon quest revision

## New default path

The original illustrated course hub leads to 15 short quests (nanoGPT, RAG, Embedding; five each), in Chinese and Japanese. Each has a short character prompt, a visual toy, a check with explanation for every option, and a star. Stars are local device progress, not proof of mastery. Merely opening a quest does not pass it.

Original 149-page Phaser animations, Live2D Hiyori, recordings, source material and the advanced reader remain available. The new copy is not presented as matching the old recordings. No model training or paid API runs in the browser.

## Tutorial references

The presentation uses character-led, step-by-step actions and small checks, inspired by these public examples; no artwork or text is copied:

- Nintendo Game Builder Garage navigation lessons: https://www.nintendo.com/jp/switch/awuxa/lesson/index.html
- Yahoo!きっず Scratch learning: https://kids.yahoo.co.jp/study/integrated/programming/prg005.html

## Verification

- `npm run check`: original content facts, locale parity, production build
- `npm run e2e:quest`: 15 quests × 2 locales × 3 viewports; wrong answers, earned progress, local reload, Back/Forward, retained animation and optional reader entry, desktop Hiyori and mobile layout
- `npm run e2e:reader` and `npm run e2e:regressions`: retained reader and interrupted navigation
- `npm run e2e`: all original animation pages/phases and layout probes

Use the tested `dist` artifact for publication only after the full workflow and screenshot review pass. Do not force-push or delete retained assets on gh-pages.
