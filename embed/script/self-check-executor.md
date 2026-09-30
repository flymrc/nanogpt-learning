# Executor self-check (NOT the 8岁挑刺员 review)

I (the executor) ran this pass in the reviewer's style before any real review round.
The real reviewer has **not** seen this script yet; `review-request.md` is what should be sent to them.

## Automatic checks (`verify.py`, `verify_pairs.py`)
- 5 chapters × 5 pages in both files. Every page has all 9 beats. Chapter intros add extra 看看 / 小G的话 / 动画 lines (30 = 25 + 5).
- Kid text (maker tables and `>` notes excluded) has no "→"/"->", no decimals and no negatives.
- Every number before 分 / てん is a real `points` value from `demo/results.json`, a RAG value (80/83/45/71/74/36/33/31/30), 100 / 0 from the angle rule, or a difference between two shown scores (1/3/4/5).
- Every "A 和 B：N 分" / "A と B：Nてん" pair was matched to `results.json`. Pairs written with 〔〕 glosses were checked by hand.

## Fixes I made during the self-check
1. zh c3-p5 said the card text was 「停车」. The jieba cut of Page 9 is 停车场 / 停一晚, so the question words 车 / 停 don't match. Fixed the text and the maker table.
2. zh/ja c1-p1 colour rule: "越往一边越红" was vague, so it now says we paint by the number, with pale near 0. There is no talk of negatives.
3. ja c1-p2: "swimming pool は 13文字" counted the space, so it was changed to parking (7 letters).
4. ja c5-p2 gave an invented reason ("so this book uses English cards"). Removed; replaced with a factual reminder.
5. `map_ja.png` now labels points 「日本語〔English〕」 to match the ja card rule. Title uses ぺちゃんこ.

## Open points for the real reviewer / user
- ja mixes two models: the RAG book's all-MiniLM-L6-v2 (45, 71/74, card pair 83) and this book's multilingual model (36, 16, all word pairs). ja c3-p5 explains this in one kid sentence.
- ja c5-p2 shows hiragana scoring low (いぬ–dog 35 vs 犬–dog 98), while the ja script itself is hiragana-heavy.
