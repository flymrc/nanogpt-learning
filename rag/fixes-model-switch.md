# RAG book, ja side: switch of the "meaning" model (2026-09-30)

**User decision:** the ja side (English Hotel Hoshi cards) now uses the same embedding model as the zh side and the
embedding book: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (was `all-MiniLM-L6-v2`).

## What was re-run
- `demo/rag_demo.py`: only `MODEL_NAME` changed (plus the threshold, see below, and a new `settings.threshold_check_en`).
  The word-matching part (TF-IDF) is untouched, and the whole `word_match` block of `results.json` is byte-for-byte the same as before.
- New `demo/results.json`. Old output kept as `demo/results_minilm_l6.json`.
- zh is not affected: `rag_demo_zh.py`, `results_zh.json` and the zh chapters are unchanged (still line 0.30).
- Still 384 numbers per card.

## "I don't know" threshold: 0.30 no longer works for English
| | top-1 meaning score (new model) |
|---|---|
| answerable, lowest | **0.2718**: dog question after adding Page 13 (Pets). Next lowest: parking 0.3571 |
| unanswerable (dog, no Page 13) | **0.1619** |
| zh, for comparison (unchanged) | answerable lowest 0.3614, unanswerable 0.2821 |

- With 0.30, the new Page 13 would score under the line and the fill-in sheet would still say "I don't know".
  That breaks ja c5-p6 (the lesson that adding one page works right away).
- en needs a line in (0.1619, 0.2718]. zh needs one in (0.2821, 0.3614]. The ranges do not overlap, so **no single value works for both.**
- **Applied, confirmed by the user 2026-09-30:** English/ja meaning line = **0.20** (20てん). zh stays 0.30. word_match line stays 0.10.
  The margins are 16 < 20 and 27 > 20. The teaching idea does not change (the line is our own game rule, chosen after looking at these scores).
  Only the number the ja kids see changes (30 → 20), and zh and ja no longer share the same line height.
- Alternatives I did NOT apply:
  (a) Keep 0.30 and rewrite c5-p6 so Page 13 still does not reach the line. This kills the page's lesson.
  (b) Reword the English Page 13 card so it scores above 0.30. For example, "Small dogs and cats are welcome. They may stay…" gives 0.33 and "You may bring small dogs…" gives 0.37. But the first is fishing for a score with a thin margin, and the second adds "bring", so word_match would no longer be 0 (breaks the "dog vs dogs" point in c5-p6).
  (c) 0.25 also separates en (margin only 2 on the answerable side). I picked 0.20 because it sits nearer the middle of the gap.

## Other teaching change caused by the new scores (please confirm)
- **Checkout, by meaning:** 1st is now **Page 2 Check-in 72**, then Page 3 Checkout 69, Page 11 41. The fill-in sheet would quote the wrong card.
  The ja chapter-4 pages that used checkout as a by-meaning example with the answer "Page 3" (c4-p7 たしかめよう, c4-p9 conveyor) now use the
  pool question ("プールは ありますか？", which already appears in c1): Page 6 57 / Page 7 36 / Page 9 19, template answer Page 6.
  This could become a nice "search can be wrong" example later, but I did not add it (chapter 4 is not the error chapter).
- **Breakfast, by meaning:** 2nd/3rd changed from Page 5 夕ごはん / Page 2 チェックイン to **Page 2 チェックイン / Page 3 チェックアウト**.
  Pages that showed the three cards or asked about the 2nd card were rewritten to the real cards (c3-p7, c4-p1, c4-p2, c4-p4, c5-p4).
- **Dog, by meaning:** 2nd is now Page 12 おとしもの (was Page 11 にもつ), and the "1st only a hair higher" remark is gone (16 vs 15, whole numbers now differ).

## Every changed number, per page (old → new)
### 03-chapter3.md
- c3-p5 (いみの じゅうしょ, small table): 朝ごはん–夕ごはん 83 → **81**; 朝ごはん–ちゅうしゃじょう 17 → **22**; プール–大浴場 48 → **55**; プール–チェックアウト 20 → **24**. たしかめよう: "83てんは 17てんより" → "81てんは 22てんより".
- c3-p6 (swim question): Page 6 59 / Page 7 38 / Page 2 33 → Page 6 **53** / Page 2 **33** / Page 7 **32** (2nd and 3rd swapped). Narration 59 → **53**.
- c3-p7 (top-3): Page 4 74 / Page 5 47 / Page 2 45 → Page 4 **72** / Page 2 チェックイン **52** / Page 3 チェックアウト **43**. たしかめよう answer: Page 5 → **Page 2（チェックイン）**.
### 04-chapter4.md
- c4-p1: 74 / 47 / 45 (Page 4/5/2) → **72 / 52 / 43** (Page 4/2/3).
- c4-p2 (the joined text, ja lines and English lines): cards 2 and 3 are now Page 2 (check-in) and Page 3 (checkout), copied word for word from `meaning.questions[q1_breakfast].combined_input_for_a_generator`.
- c4-p4 (use the right card): the table shows Page 4 / Page 2 / Page 3 (was 4 / 5 / 2). Tap feedback and 小G text: 夕ごはん・チェックイン → チェックイン・チェックアウト. たしかめよう: "夕ごはんは 何時？ → Page 5" → "チェックアウトは 何時？ → **Page 3**".
- c4-p5 (two meals): Page 4 72 / Page 5 63 / Page 2 42 → **74 / 55 / 47** (same order).
- c4-p7 たしかめよう: checkout → Page 3 was replaced with **プールは ありますか？ → Page 6（プール）**.
- c4-p9 (conveyor): question checkout → **pool**. Page 3 69 / Page 2 56 / Page 4 47 → **Page 6 57 / Page 7 36 / Page 9 19**. "Page 3" lights → "**Page 6**". Word-match note "Page 3 was 59" → "**Page 6 is 51** with word counting". Template answer → Page 6 text (`meaning.questions[q3_pool].template_answer`).
### 05-chapter5.md
- Header note: "共通コア：30てんの 線" → the line rule is shared, but the height differs (ja 20, zh 30, user-confirmed).
- c5-p3 (switch to meaning): breakfast Page 4 74 → **72**; parking Page 9 45 → **36**.
- c5-p4 (the line): dog Page 1 約19 / Page 11 約19 / Page 10 約18 → Page 1 **16** / Page 12 おとしもの **15** / Page 10 **12**. Red line 30 → **20** (drawing, blackboard, 小G text, たしかめよう, narration). "2nd, the dinner card, 47, over the line" → "2nd, the **check-in card, 52**, over the line". The "hair higher" sentence was removed.
- c5-p6 (add Page 13): Page 13 37 → **27**; "crosses the 30 line" → "crosses the **20** line". Word counting is still 0 (unchanged).
- c5-p7 (swap Page 4): old 71 → **70**; new 74 → **72**.
- c5-p8: old card 71 → **70**.
### Unchanged
- ch. 1 and ch. 2 (no meaning scores). Every word-counting number (59/36/28, 42/40, "about 27", park = 0, dog = 0).

## Also updated
- `ja/verification-en-cards.md` (source table): all meaning rows, the model name, the line, and the pool rows that replaced checkout.
- `00-outline.md`: the shared-core rule (the line height is no longer shared) and the per-chapter number lists.
- `demo/README.md`: a new "model switch" section. The old tables are kept and labelled.
- New `verify_ja_scores.py`: every 「Nてん」 in `ja/0*.md` must be a real score in `demo/results.json`, plus targeted checks for the changed claims and a ban on old-model values. It passes.
- Not done (out of scope, outside the box): the RAG **game** (`flymrc/nanogpt-learning`, ja strings) still has the old ja numbers and the checkout example. It needs a regenerate from these chapters after review.
